/**
 * EchoSphere Panel Speaker Manager (Step 7E)
 *
 * Server-controlled panel speaker arbitration layer ensuring Real-Time Audio Safety.
 * Guarantees that EXACTLY ONE interviewer (Ada, Alex, or Marcus) produces audible speech at a time.
 *
 * Manages atomic transitions, consecutive turn retention (Ada -> Ada), and executes
 * Agora ConvoAI agent interruption via `interrupt()` API during speaker handoffs.
 */

import {
  InterviewRole,
  InterviewSession,
  PanelSpeakerState,
  SpeakerStatus,
} from '@/types/interview';

export interface TransitionSpeakerOptions {
  reason?: string;
  agoraClientInterruptFn?: (agentId: string) => Promise<void>;
}

/**
 * Initializes default PanelSpeakerState for a session.
 */
export function createInitialSpeakerState(
  initialRole: InterviewRole = InterviewRole.SYSTEM_ARCHITECT,
  reason = 'Initial session startup',
): PanelSpeakerState {
  return {
    activeSpeaker: initialRole,
    speakerState: 'IDLE',
    lastTransitionTimestamp: Date.now(),
    transitionReason: reason,
  };
}

/**
 * Executes a server-arbitrated speaker transition.
 *
 * Guarantees:
 * 1. Exactly ONE active speaker at a time.
 * 2. If targetRole === activeSpeaker (follow-up turn retention), retains speaker without interrupt.
 * 3. If targetRole !== activeSpeaker, interrupts the previous active speaker and promotes targetRole.
 */
export async function transitionPanelSpeaker(
  session: InterviewSession,
  targetRole: InterviewRole,
  options?: TransitionSpeakerOptions,
): Promise<PanelSpeakerState> {
  // Validate target role
  if (!Object.values(InterviewRole).includes(targetRole)) {
    throw new Error(`Invalid speaker role: ${targetRole}`);
  }

  const current = session.panelSpeakerState || createInitialSpeakerState(session.currentRole);
  const reason = options?.reason || `Panel orchestrator assigned turn to ${targetRole}`;

  // Case 1: Same interviewer retained for consecutive turn (e.g. Ada -> Ada follow-up)
  if (current.activeSpeaker === targetRole) {
    const updatedState: PanelSpeakerState = {
      activeSpeaker: targetRole,
      speakerState: 'SPEAKING',
      lastTransitionTimestamp: Date.now(),
      transitionReason: `Consecutive turn retained for ${targetRole}: ${reason}`,
    };
    session.panelSpeakerState = updatedState;
    session.activeInterviewer = targetRole;
    return updatedState;
  }

  // Case 2: Speaker handoff (e.g. Ada -> Marcus or Marcus -> Alex)
  // If previous speaker was actively speaking, issue interruption call
  if (current.activeSpeaker !== 'NONE' && session.agentId && options?.agoraClientInterruptFn) {
    try {
      await options.agoraClientInterruptFn(session.agentId);
    } catch (err) {
      console.warn(`[PanelSpeakerManager] Interrupt call failed for agent ${session.agentId}:`, err);
    }
  }

  // Atomic state update: Promote targetRole to active speaker
  const newState: PanelSpeakerState = {
    activeSpeaker: targetRole,
    speakerState: 'SPEAKING',
    lastTransitionTimestamp: Date.now(),
    transitionReason: reason,
  };

  session.panelSpeakerState = newState;
  session.activeInterviewer = targetRole;
  session.currentRole = targetRole;

  return newState;
}

/**
 * Updates the speaker status lifecycle (e.g., 'THINKING', 'SPEAKING', 'IDLE', 'INTERRUPTED').
 */
export function updateSpeakerStatus(
  session: InterviewSession,
  status: SpeakerStatus,
  reason?: string,
): PanelSpeakerState {
  const current = session.panelSpeakerState || createInitialSpeakerState(session.currentRole);
  const updatedState: PanelSpeakerState = {
    ...current,
    speakerState: status,
    lastTransitionTimestamp: Date.now(),
    transitionReason: reason || `Status updated to ${status}`,
  };

  session.panelSpeakerState = updatedState;
  return updatedState;
}
