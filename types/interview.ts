/**
 * Interview phase, multi-role & evaluation definitions for EchoSphere (Steps 4E, 5A-D, 6A-B).
 *
 * Support for multi-role interviewer panel:
 *   - SYSTEM_ARCHITECT (Ada)
 *   - PRODUCT_MANAGER (Alex)
 *   - SECURITY_LEAD (Marcus)
 */

// ── Role enum ─────────────────────────────────────────────────────────────────

export enum InterviewRole {
  SYSTEM_ARCHITECT = 'SYSTEM_ARCHITECT',
  PRODUCT_MANAGER = 'PRODUCT_MANAGER',
  SECURITY_LEAD = 'SECURITY_LEAD',
}

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

// ── Evaluation dimensions ─────────────────────────────────────────────────────

export enum EvaluationDimension {
  PROBLEM_UNDERSTANDING = 'Problem Understanding',
  REQUIREMENTS_ANALYSIS = 'Requirements Analysis',
  ARCHITECTURE_DESIGN = 'Architecture Design',
  TECHNICAL_DEPTH = 'Technical Depth',
  SCALABILITY_RELIABILITY = 'Scalability & Reliability',
  SECURITY = 'Security',
  TRADE_OFF_REASONING = 'Trade-off Reasoning',
  COMMUNICATION = 'Communication',
}

// ── Evaluation score per dimension ───────────────────────────────────────────

export interface EvaluationScore {
  /** Dimension name */
  dimension: EvaluationDimension | string;
  /** Primary interviewer role owning this evaluation dimension */
  primaryRole?: InterviewRole;
  /** Score on a 0–10 scale */
  score: number;
  /** Short rationale for the score */
  reasoning: string;
  /** Turn IDs of candidate transcript turns supporting this score */
  evidenceTurnIds: string[];
}

// ── Overall Evaluation result ─────────────────────────────────────────────────

export interface EvaluationResult {
  /** Overall average score on a 0–10 scale (weighted average of dimension scores) */
  overallScore: number;
  /** Individual dimension scores */
  dimensionScores: EvaluationScore[];
  /** Highlighted candidate strengths */
  strengths: string[];
  /** Areas for improvement */
  weaknesses: string[];
  /** Hiring recommendation */
  recommendation: string;
}

// ── Individual interview turn ─────────────────────────────────────────────────

export interface InterviewTurn {
  /** Unique ID for turn deduplication and evidence anchoring */
  turnId: string;
  /** RTC UID of speaker */
  uid: string;
  /** Speaker role */
  role: 'candidate' | 'agent';
  /** Text content of turn */
  text: string;
  /** Turn status (e.g. END, INTERRUPTED, IN_PROGRESS) */
  status: string;
  /** Unix millisecond timestamp */
  timestamp: number;
}

// ── Role Transition Record ───────────────────────────────────────────────────

export interface RoleTransition {
  fromRole: InterviewRole;
  toRole: InterviewRole;
  timestamp: number;
  reason: string;
  phase: InterviewPhase;
}

export type SpeakerStatus = 'IDLE' | 'THINKING' | 'SPEAKING' | 'INTERRUPTED';

export interface PanelSpeakerState {
  /** Currently active speaker role (SYSTEM_ARCHITECT | PRODUCT_MANAGER | SECURITY_LEAD | NONE) */
  activeSpeaker: InterviewRole | 'NONE';
  /** Speaker status lifecycle */
  speakerState: SpeakerStatus;
  /** Unix millisecond timestamp of last speaker transition */
  lastTransitionTimestamp: number;
  /** Reason for last transition / selection */
  transitionReason: string;
}

// ── Session state ─────────────────────────────────────────────────────────────

export interface InterviewSession {
  /** Canonical sessionId (matches Agora channelName) */
  sessionId: string;
  /** Candidate full name (required for shared panel context) */
  candidateName?: string;
  /** Applied job role ID (e.g. SYSTEM_ARCHITECT, FRONTEND_ARCHITECT) */
  appliedRole?: string;
  /** Final edited Job Description text */
  jobDescription?: string;
  /** Agora RTC/RTM channel name */
  channelName?: string;
  /** Candidate RTC UID */
  candidateUid?: string;
  /** Agent ID returned by /api/invite-agent */
  agentId?: string;
  /** ISO timestamp when the interview session started */
  startedAt?: string;
  /** Current interview phase */
  currentPhase: InterviewPhase;
  /** Currently active interviewer role */
  currentRole: InterviewRole;
  /** Currently active speaker interviewer role in the 3-agent panel */
  activeInterviewer?: InterviewRole;
  /** Canonical real-time audio safe panel speaker state */
  panelSpeakerState?: PanelSpeakerState;
  /** Planned role sequence for the panel interview */
  roleSequence: InterviewRole[];
  /** Log of all executed role transitions */
  roleTransitionHistory: RoleTransition[];
  /** Number of completed candidate turns */
  completedCandidateTurns: number;
  /** All captured turns (candidate + agent) */
  turns: InterviewTurn[];
  /** ISO timestamp when the interview ended */
  endedAt?: string;
  /** Evaluation result after finalisation */
  evaluation?: EvaluationResult;
  /** Session status lifecycle */
  status: 'idle' | 'starting' | 'active' | 'completed' | 'failed';
}
