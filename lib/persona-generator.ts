/**
 * Shravya Expert Persona Response Generator
 *
 * Generates targeted response text for the selected panelist persona (Neerja, Prabhat, or Madhur)
 * using upstream LLM (OpenAI or Sarvam AI 105B Conversations) with strict anti-fluff rules.
 */

import { ROLE_CONFIGS, InterviewRole } from '@/lib/interview-roles';
import { PanelLedger } from '@/lib/panel-ledger';
import { getSession } from '@/lib/interview-session-store';

export interface PersonaResponseResult {
  expertName: string;
  role: InterviewRole;
  uid: number;
  sarvamSpeaker: string;
  responseText: string;
}

const NAME_TO_ROLE: Record<string, InterviewRole> = {
  Neerja: InterviewRole.SYSTEM_ARCHITECT,
  Shravya: InterviewRole.SYSTEM_ARCHITECT,
  Prabhat: InterviewRole.PRODUCT_MANAGER,
  Madhur: InterviewRole.SECURITY_LEAD,
};

function formatDisplayName(name?: string): string {
  if (!name || name.trim().toLowerCase() === 'candidate') return 'Candidate';
  const first = name.trim().split(/\s+/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function cleanLlmResponse(rawText: string, expertName: string): string {
  let cleaned = rawText
    .replace(new RegExp(`^(?:${expertName}|Interviewer|Assistant|System Architect|Product Manager|Security Lead)\\s*[:：\\-]\\s*`, 'i'), '')
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Strip robotic filler prefixes
  cleaned = cleaned
    .replace(/^(?:Awesome|Super exciting|Great point|That's great|Indeed|Fascinating)[!.,\s]+/i, '')
    .trim();

  return cleaned;
}

export async function generateExpertAudioTurn(
  expertName: string,
  fullTranscript: string,
  sessionId: string,
): Promise<PersonaResponseResult> {
  const canonicalName = expertName === 'Shravya' ? 'Neerja' : expertName;
  const role = NAME_TO_ROLE[canonicalName] || InterviewRole.SYSTEM_ARCHITECT;
  const roleConfig = ROLE_CONFIGS[role];
  const session = getSession(sessionId);

  const rawCandidateName = session?.candidateName || 'Candidate';
  const cleanName = formatDisplayName(rawCandidateName);
  const appliedRole = session?.appliedRole || 'Senior Software Engineer';
  const jobDescription = session?.jobDescription || 'Designing scalable, resilient software systems.';
  const resumeText = session?.resumeText || '';

  const openAiKey =
    process.env.OPENAI_API_KEY ||
    process.env.UPSTREAM_LLM_API_KEY ||
    process.env.NEXT_OPENAI_API_KEY;
  const openAiBaseUrl = process.env.UPSTREAM_LLM_URL || 'https://api.openai.com/v1';

  const sarvamKey = process.env.SARVAM_API_KEY;

  let responseText = '';

  const systemInstruction = `${roleConfig.systemPrompt}

# INTERVIEW SESSION CONTEXT
- Candidate Name: ${cleanName}
- Target Role: ${appliedRole}
- Job Description:
"""
${jobDescription}
"""
${
  resumeText
    ? `- Candidate Resume / Experience:
"""
${resumeText}
"""`
    : ''
}

# FULL CONVERSATION TRANSCRIPT SO FAR
"""
${fullTranscript}
"""

# CRITICAL REQUIREMENTS FOR THIS TURN
1. You are ${canonicalName}. Speak directly to what the candidate just said.
2. NO HOLLOW PRAISE: Do not say "That's great!", "Awesome!", "That is really interesting!", or echo their words as flattery.
3. NO VAGUE QUESTIONS: Ask a sharp, concrete technical or product question probing real-world mechanisms, failure modes, trade-offs, or numbers.
4. If the candidate struggled or said they don't know, support them constructively by simplifying the question or exploring a basic practical scenario.
5. Max 2-3 spoken sentences. Do NOT prefix your output with your name or role.`;

  // Tier 1: Try OpenAI if configured
  if (openAiKey) {
    try {
      const res = await fetch(`${openAiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemInstruction },
          ],
          temperature: 0.6,
          max_tokens: 180,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const raw = data.choices?.[0]?.message?.content?.trim();
        if (raw) {
          responseText = cleanLlmResponse(raw, canonicalName);
        }
      }
    } catch (e) {
      console.warn('[PersonaGenerator] OpenAI call failed, falling back to Sarvam LLM:', e);
    }
  }

  // Tier 2: Try Sarvam AI Conversational LLM (105B)
  if (!responseText && sarvamKey) {
    try {
      const res = await fetch('https://api.sarvam.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'api-subscription-key': sarvamKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sarvam-105b-conversations',
          messages: [
            { role: 'system', content: systemInstruction },
          ],
          temperature: 0.6,
          max_tokens: 180,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const raw = data.choices?.[0]?.message?.content?.trim();
        if (raw) {
          responseText = cleanLlmResponse(raw, canonicalName);
        }
      } else {
        const errBody = await res.text();
        console.warn('[PersonaGenerator] Sarvam LLM status:', res.status, errBody);
      }
    } catch (e) {
      console.warn('[PersonaGenerator] Sarvam LLM request exception:', e);
    }
  }

  // Tier 3: High-quality, non-repeating domain question fallback
  if (!responseText) {
    const allTurns = PanelLedger.getTurns(sessionId);
    const userTurns = allTurns.filter((t) => t.role === 'User');
    const panelTurns = allTurns.filter((t) => t.role !== 'User');
    const pastTexts = panelTurns.map((t) => t.content.toLowerCase());

    const latestUserText =
      userTurns.length > 0 ? userTurns[userTurns.length - 1].content : '';
    const lower = latestUserText.toLowerCase().trim();

    const isStruggle =
      lower.includes('sorry') ||
      lower.includes('not sure') ||
      lower.includes("don't know") ||
      lower.includes('dont know') ||
      lower.includes('unable') ||
      lower.includes('cant answer') ||
      lower.includes("can't answer") ||
      lower.includes('no idea');

    const isResumeCheck =
      lower.includes('resume') ||
      lower.includes('cv') ||
      lower.includes('did you get') ||
      lower.includes('have my project');

    if (isStruggle) {
      if (canonicalName === 'Madhur') {
        responseText = `No worries at all, ${cleanName}. Let's look at a simpler scenario: how do you typically ensure passwords and API keys are not stored or logged in plain text?`;
      } else if (canonicalName === 'Prabhat') {
        responseText = `That's completely fine, ${cleanName}. From a practical standpoint, when you have limited development time, how do you decide which feature to ship first?`;
      } else {
        responseText = `That is fine, take your time. From a high level: when choosing between a relational SQL database and a document store like MongoDB, what key trade-offs do you evaluate?`;
      }
    } else if (isResumeCheck) {
      responseText = `Yes, we have your resume right here, ${cleanName}. Could you walk us through the primary technical project you built and the core backend architecture you implemented?`;
    } else if (canonicalName === 'Neerja') {
      const candidates = [
        `Understood. When designing those backend APIs, how do you manage service boundaries, database transactions, and data consistency across distributed components?`,
        `Right. Looking at the data tier, what indexing, caching, and partitioning strategies would you put in place to maintain low query latency under heavy load?`,
        `Fair point. In the event of a sudden downstream dependency failure or database spike, what circuit breaking and asynchronous queueing mechanisms would you establish?`,
      ];
      responseText = candidates.find((c) => !pastTexts.some((p) => p.includes(c.slice(0, 30).toLowerCase()))) || candidates[0];
    } else if (canonicalName === 'Prabhat') {
      const candidates = [
        `Understood. Looking at user adoption and scale, what latency SLAs and peak throughput numbers are you architecting the system to meet?`,
        `From a user experience standpoint, how do you handle degraded performance or offline states so users aren't left blocked?`,
        `If you had to launch an MVP next month with 50% of the planned features, what core user workflows would you strictly protect?`,
      ];
      responseText = candidates.find((c) => !pastTexts.some((p) => p.includes(c.slice(0, 30).toLowerCase()))) || candidates[0];
    } else {
      // Madhur
      const candidates = [
        `Understood. What defensive access controls, token expiration strategies, and rate limiting policies would you enforce at the API gateway?`,
        `Regarding data privacy, how do you ensure customer data is encrypted in transit and at rest, and protected from unauthorized internal access?`,
        `Under sudden traffic spikes or suspected bot attacks, what automated health checks and edge rate-limiting rules do you configure?`,
      ];
      responseText = candidates.find((c) => !pastTexts.some((p) => p.includes(c.slice(0, 30).toLowerCase()))) || candidates[0];
    }
  }

  // Commit expert response back to shared ledger
  PanelLedger.append(sessionId, {
    role: canonicalName as 'Neerja' | 'Prabhat' | 'Madhur',
    content: responseText,
  });

  return {
    expertName: canonicalName,
    role,
    uid: roleConfig.uid,
    sarvamSpeaker: roleConfig.sarvamSpeaker,
    responseText,
  };
}
