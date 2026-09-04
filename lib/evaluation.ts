/**
 * EchoSphere Candidate Evaluation Engine (Steps 5B & 5C)
 *
 * Provides phase-aware, deterministic candidate scoring and evidence anchoring
 * for system design interviews. Evaluates candidate responses across 8 defined
 * architectural dimensions tied to the 6 interview phases.
 *
 * Pure, deterministic, and explainable.
 */

import {
  EvaluationDimension,
  EvaluationResult,
  EvaluationScore,
  InterviewSession,
  InterviewTurn,
  InterviewPhase,
  InterviewRole,
  PHASE_ORDER,
} from '@/types/interview';

// ── Weighted Overall Score Mapping (Total = 1.00 / 100%) ─────────────────────

export const DIMENSION_WEIGHTS: Record<EvaluationDimension, number> = {
  [EvaluationDimension.PROBLEM_UNDERSTANDING]: 0.10,
  [EvaluationDimension.REQUIREMENTS_ANALYSIS]: 0.10,
  [EvaluationDimension.ARCHITECTURE_DESIGN]: 0.20,
  [EvaluationDimension.TECHNICAL_DEPTH]: 0.15,
  [EvaluationDimension.SCALABILITY_RELIABILITY]: 0.15,
  [EvaluationDimension.SECURITY]: 0.10,
  [EvaluationDimension.TRADE_OFF_REASONING]: 0.15,
  [EvaluationDimension.COMMUNICATION]: 0.05,
};

// ── Keyword & Concept Dictionaries ───────────────────────────────────────────

const DIMENSION_KEYWORDS: Record<EvaluationDimension, string[]> = {
  [EvaluationDimension.PROBLEM_UNDERSTANDING]: [
    'problem',
    'scope',
    'clarify',
    'requirement',
    'user',
    'goal',
    'use case',
    'overview',
    'context',
    'scenario',
    'objective',
  ],
  [EvaluationDimension.REQUIREMENTS_ANALYSIS]: [
    'functional',
    'non-functional',
    'latency',
    'throughput',
    'qps',
    'tps',
    'sla',
    'slo',
    'availability',
    'consistency',
    'read',
    'write',
    'peak',
    'traffic',
    'volume',
  ],
  [EvaluationDimension.ARCHITECTURE_DESIGN]: [
    'architecture',
    'gateway',
    'api',
    'microservice',
    'service',
    'database',
    'db',
    'cache',
    'queue',
    'broker',
    'load balancer',
    'storage',
    'component',
    'layer',
    'client',
  ],
  [EvaluationDimension.TECHNICAL_DEPTH]: [
    'index',
    'sharding',
    'partition',
    'replication',
    'kafka',
    'redis',
    'sql',
    'nosql',
    'postgres',
    'dynamo',
    'grpc',
    'websocket',
    'schema',
    'normalized',
    'denormalized',
    'b-tree',
  ],
  [EvaluationDimension.SCALABILITY_RELIABILITY]: [
    'scale',
    'scaling',
    'horizontal',
    'vertical',
    'failover',
    'redundancy',
    'circuit breaker',
    'retry',
    'bottleneck',
    'backpressure',
    'replicate',
    'spike',
    'cluster',
    'high availability',
  ],
  [EvaluationDimension.SECURITY]: [
    'auth',
    'authentication',
    'authorization',
    'jwt',
    'token',
    'oauth',
    'tls',
    'ssl',
    'encryption',
    'rbac',
    'sanitiz',
    'rate limit',
    'secret',
    'kms',
    'iam',
  ],
  [EvaluationDimension.TRADE_OFF_REASONING]: [
    'tradeoff',
    'trade-off',
    'versus',
    'vs',
    'instead of',
    'pros',
    'cons',
    'compromise',
    'benefit',
    'drawback',
    'alternative',
    'opt for',
    'sacrif',
  ],
  [EvaluationDimension.COMMUNICATION]: [
    'first',
    'second',
    'because',
    'therefore',
    'in terms of',
    'for instance',
    'specifically',
    'to summarize',
    'essentially',
    'structure',
  ],
};

// ── Evidence Extraction Helper ──────────────────────────────────────────────

function getEvidenceTurnIds(
  candidateTurns: InterviewTurn[],
  dimension: EvaluationDimension,
): string[] {
  const keywords = DIMENSION_KEYWORDS[dimension] || [];
  const turnIds: string[] = [];

  for (const turn of candidateTurns) {
    const lowerText = turn.text.toLowerCase();
    if (keywords.some((kw) => lowerText.includes(kw))) {
      turnIds.push(turn.turnId);
    }
  }

  return turnIds;
}

// ── Explicit Phase Helper: Problem Understanding ────────────────────────────

export function scoreProblemUnderstanding(
  candidateTurns: InterviewTurn[],
  maxPhaseReached: InterviewPhase,
): EvaluationScore {
  const dimension = EvaluationDimension.PROBLEM_UNDERSTANDING;
  const evidenceTurnIds = getEvidenceTurnIds(candidateTurns, dimension);

  if (candidateTurns.length === 0) {
    return { dimension, primaryRole: InterviewRole.PRODUCT_MANAGER, score: 0, reasoning: 'No candidate turns recorded.', evidenceTurnIds: [] };
  }

  let raw = 3.0 + evidenceTurnIds.length * 1.5;
  if (PHASE_ORDER.indexOf(maxPhaseReached) >= PHASE_ORDER.indexOf(InterviewPhase.REQUIREMENTS)) {
    raw += 2.0;
  }
  const score = Math.min(Math.max(Math.round(raw * 10) / 10, 2.0), 10.0);
  const reasoning =
    score >= 8.0
      ? `Clear, structured clarification of problem context and system goals across ${evidenceTurnIds.length} candidate turn(s).`
      : score >= 6.0
      ? `Good initial problem understanding demonstrated in candidate responses.`
      : `Basic problem understanding shown; further clarification of scope recommended.`;

  return { dimension, primaryRole: InterviewRole.PRODUCT_MANAGER, score, reasoning, evidenceTurnIds };
}

// ── Explicit Phase Helper: Requirements Analysis ─────────────────────────────

export function scoreRequirements(
  candidateTurns: InterviewTurn[],
  maxPhaseReached: InterviewPhase,
): EvaluationScore {
  const dimension = EvaluationDimension.REQUIREMENTS_ANALYSIS;
  const evidenceTurnIds = getEvidenceTurnIds(candidateTurns, dimension);

  if (candidateTurns.length === 0) {
    return { dimension, primaryRole: InterviewRole.PRODUCT_MANAGER, score: 0, reasoning: 'No candidate turns recorded.', evidenceTurnIds: [] };
  }

  let raw = 2.5 + evidenceTurnIds.length * 1.8;
  if (PHASE_ORDER.indexOf(maxPhaseReached) >= PHASE_ORDER.indexOf(InterviewPhase.ARCHITECTURE)) {
    raw += 1.5;
  }
  const score = Math.min(Math.max(Math.round(raw * 10) / 10, 2.0), 10.0);
  const reasoning =
    score >= 8.0
      ? `Identified functional and non-functional requirements (latency, throughput, QPS, availability) across ${evidenceTurnIds.length} turn(s).`
      : score >= 6.0
      ? `Covered core functional requirements with basic non-functional estimates.`
      : `Limited discussion of quantitative scale and non-functional constraints.`;

  return { dimension, primaryRole: InterviewRole.PRODUCT_MANAGER, score, reasoning, evidenceTurnIds };
}

// ── Explicit Phase Helper: Architecture Design ───────────────────────────────

export function scoreArchitecture(
  candidateTurns: InterviewTurn[],
  maxPhaseReached: InterviewPhase,
): EvaluationScore {
  const dimension = EvaluationDimension.ARCHITECTURE_DESIGN;
  const evidenceTurnIds = getEvidenceTurnIds(candidateTurns, dimension);

  if (candidateTurns.length === 0) {
    return { dimension, primaryRole: InterviewRole.SYSTEM_ARCHITECT, score: 0, reasoning: 'No candidate turns recorded.', evidenceTurnIds: [] };
  }

  let raw = 2.0 + evidenceTurnIds.length * 1.6;
  if (PHASE_ORDER.indexOf(maxPhaseReached) >= PHASE_ORDER.indexOf(InterviewPhase.ARCHITECTURE)) {
    raw += 2.0;
  }
  const score = Math.min(Math.max(Math.round(raw * 10) / 10, 2.0), 10.0);
  const reasoning =
    score >= 8.0
      ? `Proposed modular high-level architecture with clear service boundaries and datastores across ${evidenceTurnIds.length} turn(s).`
      : score >= 6.0
      ? `Established high-level components and service interaction patterns.`
      : `High-level design lacked detail on component separation and message flow.`;

  return { dimension, primaryRole: InterviewRole.SYSTEM_ARCHITECT, score, reasoning, evidenceTurnIds };
}

// ── Explicit Phase Helper: Technical Depth ───────────────────────────────────

export function scoreDeepDesign(
  candidateTurns: InterviewTurn[],
  maxPhaseReached: InterviewPhase,
): EvaluationScore {
  const dimension = EvaluationDimension.TECHNICAL_DEPTH;
  const evidenceTurnIds = getEvidenceTurnIds(candidateTurns, dimension);

  if (candidateTurns.length === 0) {
    return { dimension, primaryRole: InterviewRole.SYSTEM_ARCHITECT, score: 0, reasoning: 'No candidate turns recorded.', evidenceTurnIds: [] };
  }

  let raw = 2.0 + evidenceTurnIds.length * 1.5;
  if (PHASE_ORDER.indexOf(maxPhaseReached) >= PHASE_ORDER.indexOf(InterviewPhase.DEEP_DESIGN)) {
    raw += 2.0;
  }
  const score = Math.min(Math.max(Math.round(raw * 10) / 10, 2.0), 10.0);
  const reasoning =
    score >= 8.0
      ? `Demonstrated deep technical knowledge in data modeling, indexing, schema design, and caching across ${evidenceTurnIds.length} turn(s).`
      : score >= 6.0
      ? `Solid technical explanation of core component implementation details.`
      : `Elaboration on technical implementation and database internals was shallow.`;

  return { dimension, primaryRole: InterviewRole.SYSTEM_ARCHITECT, score, reasoning, evidenceTurnIds };
}

// ── Explicit Phase Helper: Scalability & Reliability ────────────────────────

export function scoreScalability(
  candidateTurns: InterviewTurn[],
  maxPhaseReached: InterviewPhase,
): EvaluationScore {
  const dimension = EvaluationDimension.SCALABILITY_RELIABILITY;
  const evidenceTurnIds = getEvidenceTurnIds(candidateTurns, dimension);

  if (candidateTurns.length === 0) {
    return { dimension, primaryRole: InterviewRole.SECURITY_LEAD, score: 0, reasoning: 'No candidate turns recorded.', evidenceTurnIds: [] };
  }

  let raw = 2.0 + evidenceTurnIds.length * 1.7;
  if (PHASE_ORDER.indexOf(maxPhaseReached) >= PHASE_ORDER.indexOf(InterviewPhase.SCALABILITY_RELIABILITY_SECURITY)) {
    raw += 2.0;
  }
  const score = Math.min(Math.max(Math.round(raw * 10) / 10, 2.0), 10.0);
  const reasoning =
    score >= 8.0
      ? `Addressed horizontal scaling, partitioning, circuit breakers, and failover redundancy across ${evidenceTurnIds.length} turn(s).`
      : score >= 6.0
      ? `Addressed primary scalability bottlenecks and replication strategies.`
      : `Reliability patterns (retries, rate limiting, circuit breakers) require deeper focus.`;

  return { dimension, primaryRole: InterviewRole.SECURITY_LEAD, score, reasoning, evidenceTurnIds };
}

// ── Explicit Phase Helper: Security ──────────────────────────────────────────

export function scoreSecurity(
  candidateTurns: InterviewTurn[],
  maxPhaseReached: InterviewPhase,
): EvaluationScore {
  const dimension = EvaluationDimension.SECURITY;
  const evidenceTurnIds = getEvidenceTurnIds(candidateTurns, dimension);

  if (candidateTurns.length === 0) {
    return { dimension, primaryRole: InterviewRole.SECURITY_LEAD, score: 0, reasoning: 'No candidate turns recorded.', evidenceTurnIds: [] };
  }

  let raw = 2.0 + evidenceTurnIds.length * 1.8;
  if (PHASE_ORDER.indexOf(maxPhaseReached) >= PHASE_ORDER.indexOf(InterviewPhase.SCALABILITY_RELIABILITY_SECURITY)) {
    raw += 1.5;
  }
  const score = Math.min(Math.max(Math.round(raw * 10) / 10, 2.0), 10.0);
  const reasoning =
    score >= 8.0
      ? `Covered authentication, authorization (JWT/OAuth), encryption in transit/rest, and rate limiting across ${evidenceTurnIds.length} turn(s).`
      : score >= 6.0
      ? `Identified basic security mechanisms for API authentication and transport protection.`
      : `Security mechanisms were briefly mentioned without specific implementation controls.`;

  return { dimension, primaryRole: InterviewRole.SECURITY_LEAD, score, reasoning, evidenceTurnIds };
}

// ── Explicit Phase Helper: Trade-off Reasoning ──────────────────────────────

export function scoreTradeoffs(
  candidateTurns: InterviewTurn[],
  maxPhaseReached: InterviewPhase,
): EvaluationScore {
  const dimension = EvaluationDimension.TRADE_OFF_REASONING;
  const evidenceTurnIds = getEvidenceTurnIds(candidateTurns, dimension);

  if (candidateTurns.length === 0) {
    return { dimension, primaryRole: InterviewRole.SYSTEM_ARCHITECT, score: 0, reasoning: 'No candidate turns recorded.', evidenceTurnIds: [] };
  }

  let raw = 2.0 + evidenceTurnIds.length * 1.7;
  if (PHASE_ORDER.indexOf(maxPhaseReached) >= PHASE_ORDER.indexOf(InterviewPhase.TRADE_OFFS)) {
    raw += 2.5;
  }
  const score = Math.min(Math.max(Math.round(raw * 10) / 10, 2.0), 10.0);
  const reasoning =
    score >= 8.0
      ? `Articulated explicit architectural trade-offs (e.g. consistency vs latency, SQL vs NoSQL) across ${evidenceTurnIds.length} turn(s).`
      : score >= 6.0
      ? `Evaluated alternatives and justified primary technical choices.`
      : `Decisions were presented without comparing alternative design choices or drawbacks.`;

  return { dimension, primaryRole: InterviewRole.SYSTEM_ARCHITECT, score, reasoning, evidenceTurnIds };
}

// ── Explicit Phase Helper: Communication ─────────────────────────────────────

export function scoreCommunication(
  candidateTurns: InterviewTurn[],
): EvaluationScore {
  const dimension = EvaluationDimension.COMMUNICATION;
  const evidenceTurnIds = getEvidenceTurnIds(candidateTurns, dimension);

  if (candidateTurns.length === 0) {
    return { dimension, primaryRole: InterviewRole.SYSTEM_ARCHITECT, score: 0, reasoning: 'No candidate turns recorded.', evidenceTurnIds: [] };
  }

  const totalWords = candidateTurns.reduce(
    (acc, turn) => acc + turn.text.trim().split(/\s+/).length,
    0,
  );
  const avgWords = totalWords / candidateTurns.length;

  let raw = 4.0;
  if (avgWords >= 15) raw += 2.0;
  if (avgWords >= 30) raw += 2.0;
  if (evidenceTurnIds.length >= 1) raw += 1.5;

  const score = Math.min(Math.max(Math.round(raw * 10) / 10, 3.0), 10.0);
  const reasoning =
    score >= 8.0
      ? `Structured, clear articulation throughout candidate responses (average ${Math.round(avgWords)} words/turn).`
      : score >= 6.0
      ? `Clear communication with understandable technical explanations.`
      : `Responses were concise; further elaboration and structured explanations recommended.`;

  return { dimension, primaryRole: InterviewRole.SYSTEM_ARCHITECT, score, reasoning, evidenceTurnIds };
}

// ── Main Evaluator Function ──────────────────────────────────────────────────

/**
 * Evaluates an InterviewSession and returns an EvaluationResult using phase-aware heuristics
 * and documented weighted average scoring.
 *
 * @param session The InterviewSession object containing captured turns and phase metadata.
 * @returns EvaluationResult with overall score, per-dimension scores, strengths, weaknesses, and hiring recommendation.
 */
export function evaluateInterviewSession(
  session: InterviewSession,
): EvaluationResult {
  // Extract candidate turns only
  const candidateTurns = (session.turns || []).filter(
    (t) => t.role === 'candidate' || (t.uid !== '0' && t.uid !== (session.agentId ?? 'agora_agent')),
  );

  const phase = session.currentPhase || InterviewPhase.BACKGROUND;

  // Run explicit dimension scoring helpers
  const dimensionScores: EvaluationScore[] = [
    scoreProblemUnderstanding(candidateTurns, phase),
    scoreRequirements(candidateTurns, phase),
    scoreArchitecture(candidateTurns, phase),
    scoreDeepDesign(candidateTurns, phase),
    scoreScalability(candidateTurns, phase),
    scoreSecurity(candidateTurns, phase),
    scoreTradeoffs(candidateTurns, phase),
    scoreCommunication(candidateTurns),
  ];

  // Calculate overallScore using documented weighted average
  let weightedSum = 0;
  for (const scoreObj of dimensionScores) {
    const weight = DIMENSION_WEIGHTS[scoreObj.dimension as EvaluationDimension] ?? 0.125;
    weightedSum += scoreObj.score * weight;
  }

  const overallScore = Math.round(weightedSum * 10) / 10;

  // Extract strengths (score >= 7.0) and weaknesses (score < 7.0)
  const strengths = dimensionScores
    .filter((d) => d.score >= 7.0)
    .map((d) => `${d.dimension}: ${d.reasoning}`);

  const weaknesses = dimensionScores
    .filter((d) => d.score < 7.0)
    .map((d) => `${d.dimension}: ${d.reasoning}`);

  if (strengths.length === 0) {
    strengths.push('Candidate completed the voice interview session.');
  }
  if (weaknesses.length === 0) {
    weaknesses.push('No significant technical weaknesses identified.');
  }

  // Derive recommendation based on weighted overallScore
  let recommendation = '';
  if (overallScore >= 8.0) {
    recommendation =
      'Strong Hire — Exceptional system design knowledge, clear communication, and solid trade-off analysis.';
  } else if (overallScore >= 6.0) {
    recommendation =
      'Hire — Good architectural fundamentals with solid understanding of core system design principles.';
  } else if (overallScore >= 4.0) {
    recommendation =
      'Needs Further Evaluation — Demonstrated foundational concepts but needs deeper exploration in scalability, security, or trade-offs.';
  } else {
    recommendation =
      'Not Recommended — Insufficient coverage of core system design requirements and architectural depth.';
  }

  return {
    overallScore,
    dimensionScores,
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
    recommendation,
  };
}
