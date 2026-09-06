/**
 * EchoSphere Central Panel Planner (The Traffic Cop)
 *
 * Evaluates full conversation history and candidate input to decide which expert
 * panelist (Neerja, Prabhat, or Madhur) should respond next, ensuring zero audio crosstalk.
 */

import { PanelLedger } from '@/lib/panel-ledger';

export interface ProcessTurnResult {
  selectedExpert: 'Shravya' | 'Prabhat' | 'Madhur' | 'Neerja';
  currentTranscript: string;
}

export async function processInterviewTurn(
  userSpeechText: string,
  sessionId: string,
): Promise<ProcessTurnResult> {
  // 1. Commit user's incoming query to global memory ledger
  if (userSpeechText?.trim()) {
    PanelLedger.append(sessionId, { role: 'User', content: userSpeechText.trim() });
  }

  const currentTranscript = PanelLedger.getChronologicalTranscript(sessionId);

  const apiKey =
    process.env.OPENAI_API_KEY ||
    process.env.UPSTREAM_LLM_API_KEY ||
    process.env.NEXT_OPENAI_API_KEY;
  const baseUrl = process.env.UPSTREAM_LLM_URL || 'https://api.openai.com/v1';

  let selectedExpert: 'Shravya' | 'Prabhat' | 'Madhur' | 'Neerja' | null = null;

  if (apiKey) {
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are the Coordinator of a real technical interview panel.

Panelists:
- Neerja (System Architect): Architecture, data stores, microservices, scalability, trade-offs, technical background questions.
- Prabhat (Product Manager): Requirements, scope, user personas, QPS/SLA, metrics, product thinking.
- Madhur (Security & Reliability Lead): Security, auth, OAuth/JWT, encryption, rate limiting, failover, reliability.

Interview phases — follow this order:
1. INTRO: If the candidate just introduced themselves (name, role they're applying for, background), respond with Neerja to ask about their projects or technical skills.
2. BACKGROUND: If the candidate talked about their experience, projects or skills, Neerja or the most relevant expert should probe deeper into their background.
3. TECHNICAL: Once background is established, route to the expert whose domain matches what the candidate last said.

Rules:
- NEVER jump from a greeting/intro directly to system-design scope questions.
- After an introduction, always ask about their background, experience, or projects first.
- Read the LAST candidate message carefully to pick the right phase and expert.
- Avoid the same panelist responding twice in a row.
- Return ONLY the name: Neerja, Prabhat, or Madhur. No punctuation.`,
            },
            { role: 'user', content: currentTranscript },
          ],
          temperature: 0.2,
          max_tokens: 10,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const rawContent = data.choices?.[0]?.message?.content?.trim() ?? '';
        if (rawContent.includes('Prabhat')) selectedExpert = 'Prabhat';
        else if (rawContent.includes('Madhur')) selectedExpert = 'Madhur';
        else if (rawContent.includes('Neerja') || rawContent.includes('Shravya')) selectedExpert = 'Neerja';
      }
    } catch (e) {
      console.warn('[PanelPlanner] OpenAI planner failed, using keyword fallback:', e);
    }
  }

  // Keyword fallback with interview-phase awareness when the LLM is unavailable
  if (!selectedExpert) {
    const text = userSpeechText.toLowerCase();

    const pastTurns = PanelLedger.getTurns(sessionId).filter((t) => t.role !== 'User');
    const neerjaCount = pastTurns.filter((t) => t.role === 'Neerja' || t.role === 'Shravya').length;
    const prabhatCount = pastTurns.filter((t) => t.role === 'Prabhat').length;
    const madhurCount = pastTurns.filter((t) => t.role === 'Madhur').length;
    const totalPanelTurns = neerjaCount + prabhatCount + madhurCount;

    // Phase 1 — INTRO: candidate just introduced themselves
    // Route to Neerja to ask about projects/skills/background naturally.
    const isIntro =
      (text.includes('my name is') ||
        text.includes("i'm ") ||
        text.includes('i am ') ||
        text.includes('interviewing for') ||
        text.includes('applied for') ||
        text.includes('background')) &&
      totalPanelTurns <= 1;
    if (isIntro) {
      selectedExpert = 'Neerja';
    }

    // Phase 2 — BACKGROUND: candidate talked about projects/experience/skills
    if (!selectedExpert) {
      const isBackgroundTalk =
        text.includes('project') ||
        text.includes('worked on') ||
        text.includes('built') ||
        text.includes('experience') ||
        text.includes('skill') ||
        text.includes('used') ||
        text.includes('tool') ||
        text.includes('technology') ||
        text.includes('python') ||
        text.includes('sql') ||
        text.includes('tableau') ||
        text.includes('excel') ||
        text.includes('machine learning') ||
        text.includes('analyst') ||
        text.includes('dashboard') ||
        text.includes('report');

      if (isBackgroundTalk && totalPanelTurns <= 3) {
        // Still in background phase — stay with Neerja unless Prabhat hasn't spoken
        selectedExpert = prabhatCount === 0 ? 'Prabhat' : 'Neerja';
      }
    }

    // Phase 3 — TECHNICAL: score by domain keywords
    if (!selectedExpert) {
      let securityScore = 0;
      let productScore = 0;
      let architectureScore = 0;

      const securityKeywords = [
        'security', 'auth', 'oauth', 'jwt', 'token', 'encrypt', 'rate limit',
        'ddos', 'failover', 'disaster recovery', 'circuit breaker', 'firewall',
        'compliance', 'vulnerability', 'resilience', 'outage', 'attack', 'hashing',
      ];
      for (const kw of securityKeywords) {
        if (text.includes(kw)) securityScore += 2;
      }

      const productKeywords = [
        'requirement', 'scope', 'persona', 'sla', 'qps', 'business',
        'feature', 'scale', 'throughput', 'mvp', 'metric', 'retention', 'ux',
        'stakeholder', 'prioritize', 'roadmap', 'growth', 'traffic',
      ];
      for (const kw of productKeywords) {
        if (text.includes(kw)) productScore += 2;
      }

      const architectureKeywords = [
        'database', 'nosql', 'postgres', 'mongo', 'redis', 'cache',
        'queue', 'kafka', 'storage', 'partition', 'sharding', 'architecture',
        'microservice', 'monolith', 'api', 'rest', 'graphql', 'gateway',
        'consistency', 'replication', 'schema', 'latency', 'load balancer',
      ];
      for (const kw of architectureKeywords) {
        if (text.includes(kw)) architectureScore += 2;
      }

      if (securityScore > 0 && securityScore >= productScore && securityScore >= architectureScore) {
        selectedExpert = 'Madhur';
      } else if (productScore > 0 && productScore >= securityScore && productScore >= architectureScore) {
        selectedExpert = 'Prabhat';
      } else if (architectureScore > 0) {
        selectedExpert = 'Neerja';
      } else {
        // Balance: choose the panelist with the fewest turns
        if (neerjaCount <= prabhatCount && neerjaCount <= madhurCount) {
          selectedExpert = 'Neerja';
        } else if (prabhatCount <= neerjaCount && prabhatCount <= madhurCount) {
          selectedExpert = 'Prabhat';
        } else {
          selectedExpert = 'Madhur';
        }
      }
    }
  }

  return { selectedExpert, currentTranscript };
}
