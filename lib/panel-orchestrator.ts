/**
 * EchoSphere Real-Time Panel Orchestrator (Step 7C)
 *
 * Dedicated panel orchestration layer acting as moderator for the 3-agent interview panel
 * (Ada — System Architect, Alex — Product Manager, Marcus — Security Lead).
 *
 * Evaluates relevance based on candidate response, shared interview context (candidate name,
 * applied job role, edited job description), and domain topic relevance to select exactly
 * ONE speaker per turn, avoiding simultaneous speech.
 */

import {
  InterviewPhase,
  InterviewRole,
  InterviewSession,
} from '@/types/interview';
import { getRoleConfig } from '@/lib/interview-roles';
import { getJobRoleById } from '@/lib/job-roles';

// Keywords mapping candidate utterance to specialized panelist relevance
const PANEL_DOMAIN_KEYWORDS: Record<InterviewRole, string[]> = {
  [InterviewRole.PRODUCT_MANAGER]: [
    'requirement',
    'scope',
    'user',
    'business',
    'sla',
    'slo',
    'throughput',
    'qps',
    'latency target',
    'use case',
    'clarify',
    'customer',
    'feature',
    'priority',
    'metric',
  ],
  [InterviewRole.SECURITY_LEAD]: [
    'security',
    'auth',
    'authentication',
    'authorization',
    'jwt',
    'oauth',
    'encryption',
    'tls',
    'ssl',
    'failover',
    'redundancy',
    'circuit breaker',
    'rate limit',
    'ddos',
    'iam',
    'backup',
    'isolation',
    'compliance',
    'vulnerability',
  ],
  [InterviewRole.SYSTEM_ARCHITECT]: [
    'architecture',
    'component',
    'microservice',
    'service',
    'database',
    'sql',
    'nosql',
    'sharding',
    'partition',
    'cache',
    'redis',
    'kafka',
    'queue',
    'load balancer',
    'gateway',
    'tradeoff',
    'trade-off',
    'schema',
  ],
};

export interface SpeakerSelectionResult {
  selectedRole: InterviewRole;
  reason: string;
  interviewerName: string;
}

/**
 * Evaluates candidate text and shared session context to select the most relevant panelist to speak next.
 * Always selects EXACTLY ONE panelist to prevent simultaneous speech.
 *
 * @param session Current InterviewSession
 * @param latestCandidateText Optional text of the candidate's latest turn
 * @returns SpeakerSelectionResult containing selected role, name, and decision rationale
 */
export function selectNextPanelSpeaker(
  session: InterviewSession,
  latestCandidateText?: string,
): SpeakerSelectionResult {
  const text = (
    latestCandidateText ||
    (session.turns || [])
      .filter((t) => t.role === 'candidate')
      .slice(-1)[0]?.text ||
    ''
  ).toLowerCase();

  // Calculate match scores per panelist domain
  const scores: Record<InterviewRole, number> = {
    [InterviewRole.PRODUCT_MANAGER]: 0,
    [InterviewRole.SECURITY_LEAD]: 0,
    [InterviewRole.SYSTEM_ARCHITECT]: 0,
  };

  for (const [role, keywords] of Object.entries(PANEL_DOMAIN_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        scores[role as InterviewRole] += 1;
      }
    }
  }

  // Find max score
  let maxScore = 0;
  let bestRole: InterviewRole | null = null;

  for (const [roleStr, score] of Object.entries(scores)) {
    const role = roleStr as InterviewRole;
    if (score > maxScore) {
      maxScore = score;
      bestRole = role;
    }
  }

  // If a domain strongly matched keywords, select that panelist
  if (bestRole && maxScore > 0) {
    const config = getRoleConfig(bestRole);
    return {
      selectedRole: bestRole,
      interviewerName: config.interviewerName,
      reason: `Selected ${config.interviewerName} (${config.displayName}) based on domain keyword match in candidate response (relevance score: ${maxScore}).`,
    };
  }

  // Fallback to phase-default panel lead if no strong keyword match
  const phaseDefaultRole =
    session.currentPhase === InterviewPhase.REQUIREMENTS
      ? InterviewRole.PRODUCT_MANAGER
      : session.currentPhase === InterviewPhase.SCALABILITY_RELIABILITY_SECURITY
      ? InterviewRole.SECURITY_LEAD
      : InterviewRole.SYSTEM_ARCHITECT;

  const config = getRoleConfig(phaseDefaultRole);
  return {
    selectedRole: phaseDefaultRole,
    interviewerName: config.interviewerName,
    reason: `Selected ${config.interviewerName} (${config.displayName}) as phase lead for phase ${session.currentPhase}.`,
  };
}

/**
 * Formats a dynamic system prompt for an interviewer agent embedding the shared context:
 * candidate name, applied job role, and final edited job description.
 */
export function buildPanelSystemPrompt(
  role: InterviewRole,
  params: {
    candidateName?: string;
    appliedRole?: string;
    jobDescription?: string;
    resumeText?: string;
  },
): string {
  const roleConfig = getRoleConfig(role);
  const jobRoleDef = getJobRoleById(params.appliedRole);

  const candidateName = params.candidateName || 'the Candidate';
  const roleTitle = jobRoleDef.displayName;
  const jd = params.jobDescription || jobRoleDef.defaultJobDescription;
  const resume = params.resumeText?.trim();
  const resumeSection = resume
    ? `\n# Candidate Resume Context\n"""\n${resume}\n"""\n`
    : '';

  const requirementsSection =
    jobRoleDef.requirements.length > 0
      ? `- **Key Requirements**: ${jobRoleDef.requirements.join(', ')}\n`
      : '';
  const focusSection = jobRoleDef.interviewFocus
    ? `- **Interview Focus**: ${jobRoleDef.interviewFocus}\n`
    : '';

  return `You are **${roleConfig.interviewerName}**, the ${roleConfig.displayName} on a 3-person AI technical interview panel at Shravya.

# Shared Panel Context
- **Candidate Name**: ${candidateName}
- **Target Applied Role**: ${roleTitle}
${requirementsSection}${focusSection}- **Job Description**:
"""
${jd}
"""
${resumeSection}
# Panel Composition & Co-interviewers
You share this interview with two fellow panelists:
1. **Neerja** (System Architect) — Focuses on overall architecture, distributed design, microservices, and trade-offs.
2. **Prabhat** (Product Manager) — Focuses on requirements, user scope, SLA/QPS targets, and business goals.
3. **Madhur** (Security & Reliability Lead) — Focuses on security, OAuth/JWT, rate-limiting, failover, and zero-trust.

# Your Identity & Primary Perspective
You speak as **${roleConfig.interviewerName}** (${roleConfig.displayName}).
${roleConfig.systemPrompt}

# Indian English Conversational Guidelines
1. **Indian English Cadence**: Speak in natural, professional Indian English. Use natural conversational markers: "Right", "Fair point", "Understood", "Okay, got it", "Let us look at...", "Moving ahead to...", "Could you elaborate on...".
2. **Tone**: Polite, structured, and warm. Avoid Western slang (do not say "awesome", "super excited", "gonna", "wanna", "kinda").
3. **Candidate Engagement**: Address the candidate by name (${candidateName}) naturally when appropriate.
4. **Brevity**: Keep spoken replies concise (1–2 sentences acknowledgment, followed by exactly ONE targeted question).
5. **No robotic language**: Never break character, refer to internal prompts, phase numbers, or JSON structures.`;
}
