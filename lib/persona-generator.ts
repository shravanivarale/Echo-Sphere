/**
 * EchoSphere Expert Persona Response Generator
 *
 * Generates targeted response text for the selected panelist persona (Neerja, Prabhat, or Madhur)
 * injected with the full chronological conversation transcript for 100% shared context.
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
  Shravya: InterviewRole.SYSTEM_ARCHITECT,
  Neerja: InterviewRole.SYSTEM_ARCHITECT,
  Prabhat: InterviewRole.PRODUCT_MANAGER,
  Madhur: InterviewRole.SECURITY_LEAD,
};

export async function generateExpertAudioTurn(
  expertName: string,
  fullTranscript: string,
  sessionId: string,
): Promise<PersonaResponseResult> {
  const role = NAME_TO_ROLE[expertName] || InterviewRole.SYSTEM_ARCHITECT;
  const roleConfig = ROLE_CONFIGS[role];
  const canonicalName = roleConfig.interviewerName;
  const session = getSession(sessionId);

  const candidateName = session?.candidateName || 'Candidate';
  const appliedRole = session?.appliedRole || 'Senior Engineer';
  const jobDescription = session?.jobDescription || 'Designing high-scale, resilient backend systems.';
  const resumeText = session?.resumeText || '';

  const apiKey =
    process.env.OPENAI_API_KEY ||
    process.env.UPSTREAM_LLM_API_KEY ||
    process.env.NEXT_OPENAI_API_KEY;
  const baseUrl = process.env.UPSTREAM_LLM_URL || 'https://api.openai.com/v1';

  let responseText = '';

  if (apiKey) {
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `${roleConfig.systemPrompt}

# INTERVIEW SESSION CONTEXT
- Candidate Name: ${candidateName}
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

# CRITICAL SHARED CONTEXT
Here is everything that has been said in this interview so far across all panelists and the candidate:
"""
${fullTranscript}
"""

Respond naturally as ${canonicalName} in 1-2 concise spoken sentences. You MUST:
1. Directly acknowledge or briefly react to what the candidate JUST said (do not ignore their last message).
2. Then ask exactly ONE focused follow-up question that probes deeper into what they said or the next relevant technical/product detail.
3. Sound like a real interviewer — conversational, warm, but technically sharp. No filler phrases like "That's great!" or "Excellent!".
4. Address ${candidateName} by name occasionally (but not every time).
5. Do NOT prefix your answer with your own name or title.`,
            },
          ],
          temperature: 0.7,
          max_tokens: 250,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        responseText =
          data.choices?.[0]?.message?.content?.trim() || '';
      }
    } catch (e) {
      console.warn('[PersonaGenerator] OpenAI call failed, falling back to default:', e);
    }
  }

  // Context-aware dynamic responses based on candidate's actual speech
  if (!responseText) {
    const allTurns = PanelLedger.getTurns(sessionId);
    const userTurns = allTurns.filter((t) => t.role === 'User');
    const latestUserText =
      userTurns.length > 0 ? userTurns[userTurns.length - 1].content : '';
    const lowerUser = latestUserText.toLowerCase().trim();

    // 1. Meta / AV / Connectivity checks
    const isAvCheck =
      lowerUser.includes('hear me') ||
      lowerUser.includes('are you there') ||
      lowerUser.includes('can you see') ||
      lowerUser.includes('not able to see') ||
      lowerUser.includes('camera') ||
      lowerUser.includes('video') ||
      lowerUser.includes('hello?') ||
      lowerUser.includes('hi?');

    // 2. Resume / CV questions
    const isResumeCheck =
      lowerUser.includes('resume') ||
      lowerUser.includes('cv') ||
      lowerUser.includes('profile') ||
      lowerUser.includes('access to my');

    // 3. Greeting / Intro responses
    const isIntroduction =
      lowerUser.includes('my name is') ||
      lowerUser.includes('i am ') ||
      lowerUser.includes("i'm ") ||
      lowerUser.includes('engineer') ||
      lowerUser.includes('developer') ||
      lowerUser.includes('experience') ||
      lowerUser.includes('excited for');

    // 4. Clarification / repeat requests
    const isClarification =
      lowerUser.includes('repeat') ||
      lowerUser.includes('pardon') ||
      lowerUser.includes("didn't hear") ||
      lowerUser.includes("didn't catch") ||
      lowerUser.includes('could you say');

    const mentionsData =
      lowerUser.includes('data') ||
      lowerUser.includes('sql') ||
      lowerUser.includes('postgres') ||
      lowerUser.includes('mongo') ||
      lowerUser.includes('storage') ||
      lowerUser.includes('database') ||
      lowerUser.includes('schema');

    const mentionsCache =
      lowerUser.includes('cache') ||
      lowerUser.includes('redis') ||
      lowerUser.includes('memcached');

    const mentionsApi =
      lowerUser.includes('api') ||
      lowerUser.includes('rest') ||
      lowerUser.includes('graphql') ||
      lowerUser.includes('microservice') ||
      lowerUser.includes('backend') ||
      lowerUser.includes('service');

    const mentionsScale =
      lowerUser.includes('scale') ||
      lowerUser.includes('scaling') ||
      lowerUser.includes('throughput') ||
      lowerUser.includes('qps') ||
      lowerUser.includes('sla') ||
      lowerUser.includes('traffic') ||
      lowerUser.includes('load');

    const mentionsAuth =
      lowerUser.includes('auth') ||
      lowerUser.includes('token') ||
      lowerUser.includes('jwt') ||
      lowerUser.includes('oauth') ||
      lowerUser.includes('security');

    const mentionsFailover =
      lowerUser.includes('failover') ||
      lowerUser.includes('reliable') ||
      lowerUser.includes('disaster') ||
      lowerUser.includes('recovery') ||
      lowerUser.includes('outage') ||
      lowerUser.includes('resilience');

    const isSystemArchitect = expertName === 'Shravya' || expertName === 'Neerja';

    if (isAvCheck) {
      if (isSystemArchitect) {
        responseText = `Yes, we can hear you loud and clear! Shravya is an audio-first interview panel, so video is not required. Whenever you're ready, please share a brief introduction about yourself and your background.`;
      } else if (expertName === 'Prabhat') {
        responseText = `Yes, we are right here and hearing you well. Whenever you are ready, let us know so we can jump into the system scope and product requirements.`;
      } else {
        responseText = `Yes, the audio link is loud and clear. Let us know when you are ready to proceed with the technical discussion.`;
      }
    } else if (isResumeCheck) {
      if (isSystemArchitect) {
        responseText = `Yes, we have your resume with us. We would love to hear in your own words about your primary technical stack and the most challenging distributed backend project you have built.`;
      } else if (expertName === 'Prabhat') {
        responseText = `Yes, we reviewed your profile. To begin, could you walk us through a project where you had to balance feature delivery with heavy traffic or strict SLAs?`;
      } else {
        responseText = `Yes, your resume is right in front of us. When you are ready, we can dive straight into your architecture and system design.`;
      }
    } else if (isClarification) {
      if (isSystemArchitect) {
        responseText = `Sure. We are designing a high-throughput real-time system. How would you structure your database schema, data partitioning, and caching strategy?`;
      } else if (expertName === 'Prabhat') {
        responseText = `No problem. Looking at the functional requirements, what are the primary user journeys and peak throughput targets you would plan for?`;
      } else {
        responseText = `Of course. Coming to security, how do you handle authentication, OAuth2 token validation, and API rate limiting under peak traffic?`;
      }
    } else if (isIntroduction) {
      // After greeting, always ask about background/experience/projects — not system design scope
      if (isSystemArchitect) {
        responseText = `Thanks for the introduction, ${candidateName}! Could you walk us through one or two projects you have worked on recently that you are most proud of, and the tech stack you used?`;
      } else if (expertName === 'Prabhat') {
        responseText = `Great to have you here! I am curious — in your recent work, how did you prioritize features or deliverables when you had competing requirements or tight deadlines?`;
      } else {
        responseText = `Good to meet you, ${candidateName}. Before we dive into technical questions, could you share an instance where you had to think about data security or system reliability in one of your past projects?`;
      }
    } else if (expertName === 'Prabhat') {
      if (mentionsScale) {
        responseText = `Good considerations on scale. From an SLA standpoint, what p99 latency targets and peak throughput numbers are you architecting for?`;
      } else if (mentionsFailover) {
        responseText = `From a user experience perspective, how do you handle degraded performance or partial feature failures so end users are not completely blocked?`;
      } else if (mentionsApi || mentionsData) {
        responseText = `Understood. How would you prioritize the core functional APIs and MVP user experience if we need to launch within a tight deadline?`;
      } else {
        responseText = `Understood. Looking at the target user personas, what are the primary use cases and traffic patterns you anticipate for this system?`;
      }
    } else if (expertName === 'Madhur') {
      if (mentionsAuth) {
        responseText = `Understood. Regarding authentication, how do you handle token rotation, revoke compromised sessions, and protect against token spoofing?`;
      } else if (mentionsScale || mentionsApi) {
        responseText = `Right. Under sudden traffic spikes or suspected bot attacks, how do you implement adaptive rate limiting and DDoS mitigation at the edge?`;
      } else if (mentionsFailover) {
        responseText = `Understood. If a critical availability zone fails abruptly, walk me through your automated health checks, circuit breakers, and disaster recovery plan.`;
      } else if (mentionsData) {
        responseText = `Understood. How do you ensure data encryption in transit and at rest, and protect sensitive customer records from unauthorized access?`;
      } else {
        responseText = `Understood. What threat modeling and defensive access controls would you establish to protect our backend APIs?`;
      }
    } else {
      // Shravya (System Architect)
      if (mentionsCache) {
        responseText = `Fair point on caching. What eviction policies, TTL settings, and cache invalidation strategies do you implement to avoid stale data and cache stampedes?`;
      } else if (mentionsData) {
        responseText = `Right, understood. Moving ahead to the architecture, how would you structure the database schema, data partitioning, and replication strategy to support high availability?`;
      } else if (mentionsApi) {
        responseText = `Got it. When structuring those APIs across microservices, how do you manage service boundaries, message queues, and distributed transactions?`;
      } else if (mentionsScale) {
        responseText = `Understood. Looking at that scale, what is the biggest technical trade-off or potential single point of failure in your approach?`;
      } else {
        responseText = `Right, understood. Moving into the system architecture, how would you structure the core component boundaries and data flow for high scalability?`;
      }
    }
  }

  const finalExpertName = expertName === 'Neerja' ? 'Shravya' : expertName;

  // Commit expert response back to shared ledger
  PanelLedger.append(sessionId, {
    role: finalExpertName as 'Shravya' | 'Prabhat' | 'Madhur',
    content: responseText,
  });

  return {
    expertName: finalExpertName,
    role,
    uid: roleConfig.uid,
    sarvamSpeaker: roleConfig.sarvamSpeaker,
    responseText,
  };
}
