import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/interview-session-store';
import {
  transitionPanelSpeaker,
  updateSpeakerStatus,
  createInitialSpeakerState,
} from '@/lib/panel-speaker-manager';
import { selectNextPanelSpeaker } from '@/lib/panel-orchestrator';
import { InterviewRole } from '@/types/interview';
import { DEFAULT_AGENT_UID } from '@/lib/agora';

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
    const { action, sessionId, targetRole, candidateText, recentTranscript } = body;

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

      // ── Multi-agent speaker activation via LLM system_messages update ─────────
      //
      // Architecture: 3 separate Agora agents run simultaneously in the channel,
      // each with their own UID (1001/1002/1003) and voice (priya/shubh/aditya).
      //
      // Speaker switching works by updating each agent's system prompt:
      //   • Active speaker  → injected with "YOU ARE THE ACTIVE SPEAKER — respond now"
      //   • Silent speakers → injected with "YOU ARE ON STANDBY — do not respond"
      //
      // This is the ONLY supported runtime update (llm.system_messages via the SDK).
      // TTS and remoteUids cannot be changed at runtime via the update API.
      const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
      const appCertificate = process.env.NEXT_AGORA_APP_CERTIFICATE;

      if (session.agentIds && appId && appCertificate) {
        try {
          const { AgoraClient, Area, generateConvoAIToken } = await import('agora-agents');
          const { getRoleConfig } = await import('@/lib/interview-roles');
          const { buildPanelSystemPrompt } = await import('@/lib/panel-orchestrator');

          const agoraClient = new AgoraClient({ area: Area.US, appId, appCertificate });

          // Build context summary from recent transcript (last 6 turns max)
          const contextSummary = recentTranscript
            ? `\n\n# Recent Conversation Context\n${recentTranscript}`
            : '';

          // Update ALL panelist agents in parallel: activate the selected one, silence the rest
          const allRoles = Object.values(InterviewRole) as InterviewRole[];

          await Promise.allSettled(
            allRoles.map(async (role) => {
              const agentId = session.agentIds?.[role];
              if (!agentId) return;

              const roleConfig = getRoleConfig(role);
              const isActiveSpeaker = role === selection.selectedRole;

              const instructions = buildPanelSystemPrompt(role, {
                candidateName: session.candidateName,
                appliedRole: session.appliedRole,
                jobDescription: session.jobDescription,
                resumeText: session.resumeText,
              });

              const activeSpeakerDirective = isActiveSpeaker
                ? `\n\n# TURN STATUS — ACTIVE SPEAKER\nYOU ARE NOW THE ACTIVE SPEAKER. The candidate just said: "${candidateText || 'something'}". Respond as ${roleConfig.interviewerName} in your characteristic voice. Ask ONE focused follow-up question in your domain.${contextSummary}`
                : `\n\n# TURN STATUS — STANDBY\n${roleConfig.interviewerName}, you are currently ON STANDBY. ${selection.interviewerName} (${getRoleConfig(selection.selectedRole).displayName}) is the active speaker for this turn. Do NOT respond, generate speech, or interrupt. Stay completely silent.${contextSummary}`;

              const roleConfig_uid = roleConfig.uid;
              const channelName = session.channelName || session.sessionId;

              const token = generateConvoAIToken({
                appId,
                appCertificate,
                channelName,
                uid: roleConfig_uid,
              });

              await agoraClient.agents.update(
                {
                  appid: appId,
                  agentId,
                  properties: {
                    llm: {
                      system_messages: [
                        { role: 'system', content: instructions + activeSpeakerDirective },
                      ],
                    },
                  },
                },
                { headers: { Authorization: `agora token=${token}` } },
              );

              console.log(
                `[PanelSpeakerAPI] Updated: ${roleConfig.interviewerName} → ${isActiveSpeaker ? 'ACTIVE' : 'STANDBY'} | AgentID="${agentId}"`,
              );
            }),
          );
        } catch (updateErr) {
          console.warn('[PanelSpeakerAPI] Agent update error:', updateErr);
        }
      } else if (session.agentId && appId && appCertificate && !session.agentIds) {
        // ── Backward-compat: single-agent mode (legacy) ───────────────────────
        try {
          const { AgoraClient, Area, generateConvoAIToken } = await import('agora-agents');
          const { buildPanelSystemPrompt } = await import('@/lib/panel-orchestrator');

          const agoraClient = new AgoraClient({ area: Area.US, appId, appCertificate });
          const instructions = buildPanelSystemPrompt(selection.selectedRole, {
            candidateName: session.candidateName,
            appliedRole: session.appliedRole,
            jobDescription: session.jobDescription,
            resumeText: session.resumeText,
          });

          const token = generateConvoAIToken({
            appId,
            appCertificate,
            channelName: session.channelName || session.sessionId,
            uid: DEFAULT_AGENT_UID,
          });

          await agoraClient.agents.update(
            {
              appid: appId,
              agentId: session.agentId,
              properties: {
                llm: {
                  system_messages: [{ role: 'system', content: instructions }],
                },
              },
            },
            { headers: { Authorization: `agora token=${token}` } },
          );
          console.log(`[PanelSpeakerAPI] Legacy single-agent updated to: ${selection.interviewerName}`);
        } catch (updateErr) {
          console.warn('[PanelSpeakerAPI] Legacy agent update error:', updateErr);
        }
      }

      console.log(
        `[PanelSpeakerAPI] Transition: Session="${sessionId}" | ActiveSpeaker="${speakerState.activeSpeaker}" | Reason="${selection.reason}"`,
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
