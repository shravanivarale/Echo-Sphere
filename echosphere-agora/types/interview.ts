/**
 * Interview phase definitions for EchoSphere Step 4E.
 *
 * Phases progress forward-only and are driven by the count of completed
 * candidate turns captured from the Agora transcript pipeline.
 *
 * The phase lives entirely in the browser/client — Agora's Conversational AI
 * agent cannot receive a real-time phase update after it has started, so Ada's
 * phase awareness is encoded in her initial system prompt (Step 4F).
 */

// ── Phase enum ────────────────────────────────────────────────────────────────

export enum InterviewPhase {
  BACKGROUND = 'BACKGROUND',
  REQUIREMENTS = 'REQUIREMENTS',
  ARCHITECTURE = 'ARCHITECTURE',
  DEEP_DESIGN = 'DEEP_DESIGN',
  SCALABILITY_RELIABILITY_SECURITY = 'SCALABILITY_RELIABILITY_SECURITY',
  TRADE_OFFS = 'TRADE_OFFS',
}

// ── Ordered list (index = precedence; higher index = later phase) ─────────────

export const PHASE_ORDER: InterviewPhase[] = [
  InterviewPhase.BACKGROUND,
  InterviewPhase.REQUIREMENTS,
  InterviewPhase.ARCHITECTURE,
  InterviewPhase.DEEP_DESIGN,
  InterviewPhase.SCALABILITY_RELIABILITY_SECURITY,
  InterviewPhase.TRADE_OFFS,
];

// ── Phase entry thresholds ────────────────────────────────────────────────────
// Minimum number of *completed candidate turns* required to enter each phase.
// "Completed candidate turn" = a transcript turn where:
//   - uid !== agentUID  (spoken by the candidate)
//   - status !== IN_PROGRESS  (the turn has ended, not still streaming)
//
// Thresholds are intentionally generous so Ada has time to explore each area
// before the UI indicator advances:
//   BACKGROUND:  start of interview (0 turns)
//   REQUIREMENTS: 2 candidate turns — candidate has introduced themselves
//   ARCHITECTURE: 4 candidate turns — requirements established
//   DEEP_DESIGN:  6 candidate turns — high-level design proposed
//   SCALABILITY_RELIABILITY_SECURITY: 8 turns — deep design covered
//   TRADE_OFFS:  10 turns — scaling / reliability discussed; stay until end

export const PHASE_THRESHOLDS: Record<InterviewPhase, number> = {
  [InterviewPhase.BACKGROUND]: 0,
  [InterviewPhase.REQUIREMENTS]: 2,
  [InterviewPhase.ARCHITECTURE]: 4,
  [InterviewPhase.DEEP_DESIGN]: 6,
  [InterviewPhase.SCALABILITY_RELIABILITY_SECURITY]: 8,
  [InterviewPhase.TRADE_OFFS]: 10,
};

// ── Human-readable labels for the UI phase indicator ─────────────────────────

export const PHASE_LABELS: Record<InterviewPhase, string> = {
  [InterviewPhase.BACKGROUND]: 'Candidate Background',
  [InterviewPhase.REQUIREMENTS]: 'Requirements & Scope',
  [InterviewPhase.ARCHITECTURE]: 'High-Level Architecture',
  [InterviewPhase.DEEP_DESIGN]: 'Deep Technical Design',
  [InterviewPhase.SCALABILITY_RELIABILITY_SECURITY]:
    'Scalability, Reliability & Security',
  [InterviewPhase.TRADE_OFFS]: 'Trade-offs',
};

// ── Session state ─────────────────────────────────────────────────────────────

export interface InterviewSession {
  sessionId: string;
  agentId?: string;
  /** Current interview phase — driving the UI badge and Ada's prompt (static). */
  currentPhase: InterviewPhase;
  /** Number of completed candidate turns – used for phase progression. */
  completedCandidateTurns: number;
  /** All captured turns (candidate + agent) for evaluation. */
  turns: InterviewTurn[];
  /** ISO timestamp when the interview was marked completed. */
  endedAt?: string;
  /** Evaluation results – populated after finalisation. */
  evaluation?: EvaluationResult;
  /** Session status lifecycle – see STEP 5A. */
  status: 'idle' | 'starting' | 'active' | 'completed' | 'failed';
}

export interface InterviewTurn {
  role: 'candidate' | 'agent';
  text: string;
  timestamp: string;
}

export interface EvaluationResult {
  score: number;
  feedback: string;
}
