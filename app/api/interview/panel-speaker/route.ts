import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/interview-session-store';
import {
  transitionPanelSpeaker,
  updateSpeakerStatus,
  createInitialSpeakerState,
} from '@/lib/panel-speaker-manager';
import { selectNextPanelSpeaker } from '@/lib/panel-orchestrator';
import { InterviewRole } from '@/types/interview';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId parameter' }, { status: 400 });
  }

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const speakerState = session.panelSpeakerState || createInitialSpeakerState(session.currentRole);
  return NextResponse.json({ success: true, sessionId, speakerState });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionId, targetRole, candidateText } = body;

    // Security validation: Reject client-forged activeSpeaker overrides
    if (body.overrideActiveSpeaker || body.forceSpeaker) {
      return NextResponse.json(
        { error: 'Security violation: Client-controlled panel speaker overrides are rejected. Speaker selection is server-managed.' },
        { status: 400 },
      );
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid sessionId' }, { status: 400 });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (action === 'get_status') {
      const speakerState = session.panelSpeakerState || createInitialSpeakerState(session.currentRole);
      return NextResponse.json({ success: true, speakerState });
    }

    if (action === 'evaluate_and_transition') {
      // Server orchestrator determines speaker turn based on relevance & shared context
      const selection = selectNextPanelSpeaker(session, candidateText);
      const speakerState = await transitionPanelSpeaker(session, selection.selectedRole, {
        reason: selection.reason,
      });

      // Update Agora ConvoAI Agent persona and voice ID live if agentId and credentials exist
      const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
      const appCertificate = process.env.NEXT_AGORA_APP_CERTIFICATE;

      if (session.agentId && appId && appCertificate) {
        try {
          const { AgoraClient, Area } = await import('agora-agents');
          const { getRoleConfig } = await import('@/lib/interview-roles');
          const { buildPanelSystemPrompt } = await import('@/lib/panel-orchestrator');

          const roleConfig = getRoleConfig(selection.selectedRole);
          const instructions = buildPanelSystemPrompt(selection.selectedRole, {
            candidateName: session.candidateName,
            appliedRole: session.appliedRole,
            jobDescription: session.jobDescription,
          });

          const client = new AgoraClient({
            area: Area.US,
            appId,
            appCertificate,
          });

          await client.agents.update({
            appid: appId,
            agentId: session.agentId,
            properties: {
              llm: {
                system_messages: [
                  {
                    role: 'system',
                    content: instructions,
                  },
                ],
              },
            },
          });
          console.log(
            `[PanelSpeakerAPI] Agora Agent properties updated live to ${selection.interviewerName} (${roleConfig.voiceId})`,
          );
        } catch (updateErr) {
          console.warn(`[PanelSpeakerAPI] Live agent update notification:`, updateErr);
        }
      }

      console.log(
        `[PanelSpeakerAPI] Speaker Transition: Session="${sessionId}", ActiveSpeaker="${speakerState.activeSpeaker}", Reason="${selection.reason}", Timestamp="${new Date(speakerState.lastTransitionTimestamp).toISOString()}"`,
      );

      return NextResponse.json({
        success: true,
        speakerState,
        selectedRole: selection.selectedRole,
        interviewerName: selection.interviewerName,
        reason: selection.reason,
      });
    }

    if (action === 'transition') {
      if (!targetRole || !Object.values(InterviewRole).includes(targetRole)) {
        return NextResponse.json({ error: 'Invalid targetRole' }, { status: 400 });
      }

      const speakerState = await transitionPanelSpeaker(session, targetRole, {
        reason: `Explicit server transition request to ${targetRole}`,
      });
      return NextResponse.json({ success: true, speakerState });
    }

    if (action === 'interrupt') {
      const speakerState = updateSpeakerStatus(session, 'INTERRUPTED', 'Active speaker interrupted by system');
      return NextResponse.json({ success: true, speakerState });
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported actions: "get_status", "evaluate_and_transition", "transition", "interrupt".' },
      { status: 400 },
    );
  } catch (error) {
    console.error('Error in /api/interview/panel-speaker:', error);
    return NextResponse.json({ error: 'Internal server error processing speaker request' }, { status: 500 });
  }
}
