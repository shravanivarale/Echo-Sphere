import { NextRequest, NextResponse } from 'next/server';
import {
  createSession,
  updateSessionTurns,
  completeSession,
} from '@/lib/interview-session-store';
import { InterviewPhase, InterviewTurn } from '@/types/interview';

// SessionId security validation regex (alphanumeric, hyphens, underscores, length 3-100)
const SESSION_ID_REGEX = /^[a-zA-Z0-9_\-]{3,100}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionId, channelName, candidateUid, agentId, turns, currentPhase, initialRole, candidateName, appliedRole, jobDescription } = body;

    // Security validation: Reject client-provided evaluation attempts or arbitrary role overrides
    if (body.evaluation || body.overallScore || body.dimensionScores) {
      return NextResponse.json(
        { error: 'Security violation: Client-provided evaluation scores are rejected. Evaluation is server-controlled.' },
        { status: 400 },
      );
    }

    if (body.roleTransitionHistory || body.currentRole || body.activeInterviewer) {
      return NextResponse.json(
        { error: 'Security violation: Client-controlled role transitions/active interviewers are rejected. Role transitions are server-managed.' },
        { status: 400 },
      );
    }

    if (!sessionId || typeof sessionId !== 'string' || !SESSION_ID_REGEX.test(sessionId)) {
      return NextResponse.json(
        { error: 'Invalid or missing sessionId. Must be 3-100 alphanumeric/hyphen characters.' },
        { status: 400 },
      );
    }

    if (action === 'create') {
      const session = createSession({
        sessionId,
        candidateName,
        appliedRole,
        jobDescription,
        channelName: channelName || sessionId,
        candidateUid: candidateUid ? String(candidateUid) : undefined,
        agentId: agentId ? String(agentId) : undefined,
        initialRole,
      });
      return NextResponse.json({ success: true, session }, { status: 201 });
    }

    if (action === 'update') {
      const session = updateSessionTurns(
        sessionId,
        (turns as InterviewTurn[]) || [],
        currentPhase as InterviewPhase,
      );
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, session });
    }

    if (action === 'complete') {
      const session = completeSession(
        sessionId,
        (turns as InterviewTurn[]) || [],
        currentPhase as InterviewPhase,
      );
      if (!session) {
        return NextResponse.json({ error: 'Failed to complete session' }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        session,
        evaluation: session.evaluation,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported actions: "create", "update", "complete".' },
      { status: 400 },
    );
  } catch (error) {
    console.error('Error in /api/interview/session:', error);
    return NextResponse.json(
      { error: 'Internal server error processing session request' },
      { status: 500 },
    );
  }
}
