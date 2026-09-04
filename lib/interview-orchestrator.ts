/**
 * EchoSphere Interview Role Orchestrator (Step 6B)
 *
 * Provides deterministic mapping between interview phases and interviewer roles,
 * and manages role transition state transitions.
 *
 * Sequence:
 *   SYSTEM_ARCHITECT (Background)
 *     -> PRODUCT_MANAGER (Requirements)
 *     -> SYSTEM_ARCHITECT (Architecture & Deep Design)
 *     -> SECURITY_LEAD (Scalability, Reliability & Security)
 *     -> SYSTEM_ARCHITECT (Trade-offs & Synthesis)
 *
 * Pure state machine, zero side-effects.
 */

import {
  InterviewPhase,
  InterviewRole,
  InterviewSession,
  RoleTransition,
} from '@/types/interview';
import { getRoleConfig } from '@/lib/interview-roles';

/**
 * Deterministic phase to role mapping rule.
 */
export function getRoleForPhase(phase: InterviewPhase): InterviewRole {
  switch (phase) {
    case InterviewPhase.BACKGROUND:
      return InterviewRole.SYSTEM_ARCHITECT;
    case InterviewPhase.REQUIREMENTS:
      return InterviewRole.PRODUCT_MANAGER;
    case InterviewPhase.ARCHITECTURE:
    case InterviewPhase.DEEP_DESIGN:
      return InterviewRole.SYSTEM_ARCHITECT;
    case InterviewPhase.SCALABILITY_RELIABILITY_SECURITY:
      return InterviewRole.SECURITY_LEAD;
    case InterviewPhase.TRADE_OFFS:
      return InterviewRole.SYSTEM_ARCHITECT;
    default:
      return InterviewRole.SYSTEM_ARCHITECT;
  }
}

/**
 * Initial planned role sequence for a full panel interview.
 */
export const DEFAULT_ROLE_SEQUENCE: InterviewRole[] = [
  InterviewRole.SYSTEM_ARCHITECT,
  InterviewRole.PRODUCT_MANAGER,
  InterviewRole.SECURITY_LEAD,
  InterviewRole.SYSTEM_ARCHITECT,
];

export interface RoleTransitionResult {
  updatedSession: InterviewSession;
  transitioned: boolean;
  transition?: RoleTransition;
}

/**
 * Evaluates session phase progression and executes deterministic role transition if required.
 *
 * @param session The InterviewSession object.
 * @param nextPhase Target InterviewPhase.
 * @returns RoleTransitionResult with updated session and transition details.
 */
export function checkAndExecuteRoleTransition(
  session: InterviewSession,
  nextPhase: InterviewPhase,
): RoleTransitionResult {
  const targetRole = getRoleForPhase(nextPhase);

  session.currentPhase = nextPhase;

  // Check if role transition is triggered
  if (targetRole !== session.currentRole) {
    const fromRole = session.currentRole;
    const targetConfig = getRoleConfig(targetRole);

    const transition: RoleTransition = {
      fromRole,
      toRole: targetRole,
      timestamp: Date.now(),
      reason: `${targetConfig.displayName} (${targetConfig.interviewerName}) taking over for ${nextPhase} phase`,
      phase: nextPhase,
    };

    session.currentRole = targetRole;
    session.roleTransitionHistory = [
      ...(session.roleTransitionHistory || []),
      transition,
    ];

    return {
      updatedSession: session,
      transitioned: true,
      transition,
    };
  }

  return {
    updatedSession: session,
    transitioned: false,
  };
}
