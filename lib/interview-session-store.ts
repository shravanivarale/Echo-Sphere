/**
 * EchoSphere In-Memory Interview Session Store (Steps 5D, 6A-B & 7C)
 *
 * Isolated server-side session repository abstraction using a globalThis-anchored Map.
 * Provides idempotent CRUD methods for managing InterviewSession lifecycle state, multi-role orchestrations,
 * candidate context (candidateName, appliedRole, edited JD), and panel speaker selection.
 */

import { evaluateInterviewSession } from '@/lib/evaluation';
import {
  DEFAULT_ROLE_SEQUENCE,
  checkAndExecuteRoleTransition,
  getRoleForPhase,
} from '@/lib/interview-orchestrator';
import { selectNextPanelSpeaker } from '@/lib/panel-orchestrator';
import {
  createInitialSpeakerState,
  transitionPanelSpeaker,
} from '@/lib/panel-speaker-manager';
import {
  InterviewPhase,
  InterviewRole,
  InterviewSession,
  InterviewTurn,
} from '@/types/interview';

// Singleton in-memory store anchored to globalThis for Next.js dev server persistence
const globalForInterviewStore = globalThis as unknown as {
  interviewSessionStore: Map<string, InterviewSession> | undefined;
};

const sessionStore =
  globalForInterviewStore.interviewSessionStore ??
  new Map<string, InterviewSession>();

if (process.env.NODE_ENV !== 'production') {
  globalForInterviewStore.interviewSessionStore = sessionStore;
}

export interface CreateSessionParams {
  sessionId: string;
  candidateName?: string;
  appliedRole?: string;
  jobDescription?: string;
  channelName?: string;
  candidateUid?: string;
  agentId?: string;
  initialRole?: InterviewRole;
}

/**
 * Registers a new interview session with candidate context and multi-role state initialization.
 */
export function createSession(params: CreateSessionParams): InterviewSession {
  const existing = sessionStore.get(params.sessionId);
  if (existing) {
    if (params.candidateName) existing.candidateName = params.candidateName;
    if (params.appliedRole) existing.appliedRole = params.appliedRole;
    if (params.jobDescription) existing.jobDescription = params.jobDescription;
    if (!existing.panelSpeakerState) {
      existing.panelSpeakerState = createInitialSpeakerState(existing.currentRole);
    }
    return existing;
  }

  const initialRole = params.initialRole || InterviewRole.SYSTEM_ARCHITECT;

  const newSession: InterviewSession = {
    sessionId: params.sessionId,
    candidateName: params.candidateName,
    appliedRole: params.appliedRole,
    jobDescription: params.jobDescription,
    channelName: params.channelName || params.sessionId,
    candidateUid: params.candidateUid,
    agentId: params.agentId,
    startedAt: new Date().toISOString(),
    currentPhase: InterviewPhase.BACKGROUND,
    currentRole: initialRole,
    activeInterviewer: initialRole,
    panelSpeakerState: createInitialSpeakerState(initialRole),
    roleSequence: DEFAULT_ROLE_SEQUENCE,
    roleTransitionHistory: [],
    completedCandidateTurns: 0,
    turns: [],
    status: 'active',
  };

  sessionStore.set(params.sessionId, newSession);
  return newSession;
}

/**
 * Retrieves an existing session by its canonical sessionId.
 */
export function getSession(sessionId: string): InterviewSession | undefined {
  return sessionStore.get(sessionId);
}

/**
 * Updates turns and phase for an active session, executing role transition & panel speaker selection.
 */
export function updateSessionTurns(
  sessionId: string,
  turns: InterviewTurn[],
  currentPhase?: InterviewPhase,
): InterviewSession | undefined {
  const session = sessionStore.get(sessionId);
  if (!session) return undefined;

  if (session.status === 'completed') {
    return session; // Completed sessions are immutable
  }

  const candidateTurnsCount = turns.filter((t) => t.role === 'candidate').length;
  session.turns = turns;
  session.completedCandidateTurns = candidateTurnsCount;

  if (currentPhase) {
    checkAndExecuteRoleTransition(session, currentPhase);
  }

  // Evaluate panel relevance for next speaker selection
  const selection = selectNextPanelSpeaker(session);
  transitionPanelSpeaker(session, selection.selectedRole, {
    reason: selection.reason,
  });

  sessionStore.set(sessionId, session);
  return session;
}

/**
 * Finalizes an interview session, runs evaluation server-side exactly once,
 * and marks status = 'completed'.
 *
 * Guaranteed IDEMPOTENT: If already completed, returns existing completed session
 * with existing evaluation without running evaluation again.
 */
export function completeSession(
  sessionId: string,
  turns?: InterviewTurn[],
  currentPhase?: InterviewPhase,
): InterviewSession | undefined {
  let session = sessionStore.get(sessionId);

  const targetPhase = currentPhase || session?.currentPhase || InterviewPhase.BACKGROUND;
  const targetRole = getRoleForPhase(targetPhase);

  // If session wasn't explicitly registered first, create ad-hoc session shell
  if (!session) {
    session = {
      sessionId,
      channelName: sessionId,
      startedAt: new Date().toISOString(),
      currentPhase: targetPhase,
      currentRole: targetRole,
      activeInterviewer: targetRole,
      roleSequence: DEFAULT_ROLE_SEQUENCE,
      roleTransitionHistory: [],
      completedCandidateTurns: 0,
      turns: turns || [],
      status: 'active',
    };
  }

  // Ensure role defaults exist for legacy/uninitialized sessions
  if (!session.currentRole) session.currentRole = targetRole;
  if (!session.activeInterviewer) session.activeInterviewer = session.currentRole;
  if (!session.roleSequence) session.roleSequence = DEFAULT_ROLE_SEQUENCE;
  if (!session.roleTransitionHistory) session.roleTransitionHistory = [];

  // Idempotency check: Return existing completed session without re-evaluating
  if (session.status === 'completed' && session.evaluation) {
    return session;
  }

  const updatedTurns = turns || session.turns || [];
  const candidateTurnsCount = updatedTurns.filter((t) => t.role === 'candidate').length;

  session.turns = updatedTurns;
  session.completedCandidateTurns = candidateTurnsCount;
  if (currentPhase) {
    checkAndExecuteRoleTransition(session, currentPhase);
  }
  session.status = 'completed';
  session.endedAt = new Date().toISOString();

  // Run evaluation engine server-side
  const evaluation = evaluateInterviewSession(session);
  session.evaluation = evaluation;

  sessionStore.set(sessionId, session);
  return session;
}

/**
 * Clears all sessions (for testing only).
 */
export function clearSessionStore(): void {
  sessionStore.clear();
}
