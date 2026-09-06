/**
 * EchoSphere Central Panel Planner (The Traffic Cop)
 *
 * Evaluates full conversation history and candidate input to decide which expert
 * panelist (Neerja, Prabhat, or Madhur) should respond next, ensuring zero audio crosstalk.
 */

import { PanelLedger } from '@/lib/panel-ledger';

export interface ProcessTurnResult {
  selectedExpert: 'Neerja' | 'Prabhat' | 'Madhur';
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

  let selectedExpert: 'Neerja' | 'Prabhat' | 'Madhur' | null = null;

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
              content: `You are the Coordinator of an expert technical interview panel.
Panelists:
- Neerja (System Architect): Overall system architecture, design, data stores, microservices.
- Prabhat (Product Manager): Requirements, scope, user personas, QPS/SLA targets, metrics.
- Madhur (Security Lead): Security, authentication, authorization, OAuth/JWT, encryption, rate limiting, failover.

Analyze the interview transcript. Determine who should respond to the candidate next.
Return ONLY the name of the expert (Neerja, Prabhat, or Madhur). Do not add any punctuation or extra words.`,
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
        else if (rawContent.includes('Neerja')) selectedExpert = 'Neerja';
      }
    } catch (e) {
      console.warn('[PanelPlanner] OpenAI planner failed, using keyword fallback:', e);
    }
  }

  // Dynamic semantic topic matching & conversational balance when external LLM is not called
  if (!selectedExpert) {
    const text = userSpeechText.toLowerCase();

    // Topic keyword scoring
    let securityScore = 0;
    let productScore = 0;
    let architectureScore = 0;

    // Security & Reliability keywords (Madhur)
    const securityKeywords = [
      'security', 'auth', 'oauth', 'jwt', 'token', 'encrypt', 'rate limit',
      'ddos', 'failover', 'disaster recovery', 'circuit breaker', 'firewall',
      'compliance', 'vulnerability', 'resilience', 'outage', 'attack', 'hashing'
    ];
    for (const kw of securityKeywords) {
      if (text.includes(kw)) securityScore += 2;
    }

    // Product & Requirements keywords (Prabhat)
    const productKeywords = [
      'requirement', 'scope', 'user', 'persona', 'sla', 'qps', 'business',
      'feature', 'scale', 'throughput', 'mvp', 'metric', 'retention', 'ux',
      'client', 'stakeholder', 'prioritize', 'roadmap', 'growth', 'traffic'
    ];
    for (const kw of productKeywords) {
      if (text.includes(kw)) productScore += 2;
    }

    // System Architecture & Data Layer keywords (Neerja)
    const architectureKeywords = [
      'database', 'sql', 'nosql', 'postgres', 'mongo', 'redis', 'cache',
      'queue', 'kafka', 'storage', 'partition', 'sharding', 'architecture',
      'microservice', 'monolith', 'api', 'rest', 'graphql', 'gateway',
      'consistency', 'replication', 'schema', 'latency', 'load balancer'
    ];
    for (const kw of architectureKeywords) {
      if (text.includes(kw)) architectureScore += 2;
    }

    // Check past turns to calculate panel balance
    const pastTurns = PanelLedger.getTurns(sessionId).filter((t) => t.role !== 'User');
    const neerjaCount = pastTurns.filter((t) => t.role === 'Neerja').length;
    const prabhatCount = pastTurns.filter((t) => t.role === 'Prabhat').length;
    const madhurCount = pastTurns.filter((t) => t.role === 'Madhur').length;

    // If candidate text strongly indicates a specific domain, route to that expert
    if (securityScore > 0 && securityScore >= productScore && securityScore >= architectureScore) {
      selectedExpert = 'Madhur';
    } else if (productScore > 0 && productScore >= securityScore && productScore >= architectureScore) {
      selectedExpert = 'Prabhat';
    } else if (architectureScore > 0 && architectureScore >= securityScore && architectureScore >= productScore) {
      selectedExpert = 'Neerja';
    } else {
      // Natural dynamic conversation balance: choose the panelist with fewest turns
      if (prabhatCount <= neerjaCount && prabhatCount <= madhurCount) {
        selectedExpert = 'Prabhat';
      } else if (madhurCount <= neerjaCount && madhurCount <= prabhatCount) {
        selectedExpert = 'Madhur';
      } else {
        selectedExpert = 'Neerja';
      }
    }
  }

  return { selectedExpert, currentTranscript };
}
