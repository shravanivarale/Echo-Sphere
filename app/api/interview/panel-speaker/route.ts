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
          const { AgoraClient, Area, generateConvoAIToken } = await import('agora-agents');
          const { getRoleConfig } = await import('@/lib/interview-roles');
          const { buildPanelSystemPrompt } = await import('@/lib/panel-orchestrator');

          const roleConfig = getRoleConfig(selection.selectedRole);
          const instructions = buildPanelSystemPrompt(selection.selectedRole, {
            candidateName: session.candidateName,
            appliedRole: session.appliedRole,
            jobDescription: session.jobDescription,
            resumeText: session.resumeText,
          });

          const client = new AgoraClient({
            area: Area.US,
            appId,
            appCertificate,
          });

          const token = generateConvoAIToken({
            appId,
            appCertificate,
            channelName: session.channelName || session.sessionId,
            uid: DEFAULT_AGENT_UID,
          });
          const headers = { Authorization: `agora token=${token}` };

          const sarvamKey = process.env.SARVAM_API_KEY || process.env.NEXT_SARVAM_API_KEY;
          const azureKey = process.env.AZURE_SPEECH_KEY || process.env.NEXT_AZURE_SPEECH_KEY;
          const azureRegion = process.env.AZURE_SPEECH_REGION || process.env.NEXT_AZURE_SPEECH_REGION || 'centralindia';

          const ttsPayload = sarvamKey
            ? {
                vendor: 'sarvam',
                params: {
                  api_subscription_key: sarvamKey,
                  speaker: roleConfig.sarvamSpeaker,
                  target_language_code: 'en-IN',
                  model: 'bulbul:v3',
                  model_id: 'bulbul:v3',
                  sample_rate: 24000,
                },
              }
            : azureKey
            ? {
                vendor: 'microsoft',
                params: {
                  key: azureKey,
                  region: azureRegion,
                  voice_name: roleConfig.azureVoiceName || roleConfig.voiceId,
                },
              }
            : {
                vendor: 'minimax',
                params: {
                  model: 'speech_2_6_turbo',
                  language_boost: 'English',
                  voice_setting: {
                    voice_id: roleConfig.minimaxVoiceId || roleConfig.voiceId,
                  },
                },
              };

          await client.agents.update(
            {
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
                tts: ttsPayload,
              } as any,
            },
            { headers },
          );
          const activeSpeakerName = sarvamKey ? roleConfig.sarvamSpeaker : azureKey ? (roleConfig.azureVoiceName || roleConfig.voiceId) : (roleConfig.minimaxVoiceId || roleConfig.voiceId);
          const activeVendor = sarvamKey ? 'Sarvam AI' : azureKey ? 'Microsoft Azure' : 'MiniMax';
          console.log(
            `[PanelSpeakerAPI] Agora Agent properties updated live to ${selection.interviewerName} (${activeSpeakerName}) [${activeVendor}]`,
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
