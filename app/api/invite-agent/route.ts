import { NextRequest, NextResponse } from 'next/server';
import {
  AgoraClient,
  Agent,
  Area,
  DeepgramSTT,
  ExpiresIn,
  MiniMaxTTS,
  OpenAI,
} from 'agora-agents';
import { AgentResponse } from '@/types/conversation';

import { getRoleConfig, InterviewRole } from '@/lib/interview-roles';
import { getSession, createSession } from '@/lib/interview-session-store';
import { PanelLedger } from '@/lib/panel-ledger';

// Silent STT-only system prompt: the cloud agent transcribes candidate speech
// but is instructed to NEVER produce any audio output. All voice responses
// are delivered exclusively via the Sarvam REST TTS → browser Audio() pipeline.
const STT_ONLY_SYSTEM_PROMPT = `You are a silent transcription assistant embedded in a multi-agent interview panel.
Your ONLY job is to listen to the candidate's speech for transcription purposes.
You must NEVER generate any spoken response, greeting, or audio output of any kind.
Do NOT greet the candidate. Do NOT answer questions. Do NOT acknowledge anything.
Remain completely silent at all times. Your only function is silent audio capture for transcription.`;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

/**
 * Builds a single silent STT-only agent (Neerja, UID 1001).
 * This agent listens to the candidate for transcript capture via AgoraVoiceAI
 * but NEVER generates any audio output. All voice responses come from Sarvam REST.
 */
function buildSttOnlyAgent(
  agoraClient: AgoraClient,
  instructions: string,
): Agent {
  return new Agent({
    client: agoraClient,
    instructions,
    greeting: undefined,
    failureMessage: 'Please wait a moment.',
    maxHistory: 30,
    turnDetection: {
      config: {
        speech_threshold: 0.5,
        start_of_speech: {
          mode: 'vad',
          vad_config: {
            interrupt_duration_ms: 160,
            prefix_padding_ms: 300,
          },
        },
        end_of_speech: {
          mode: 'vad',
          vad_config: {
            silence_duration_ms: 500,
          },
        },
      },
    },
    advancedFeatures: { enable_rtm: true, enable_tools: false },
    parameters: {
      data_channel: 'rtm',
      enable_error_message: true,
      enable_metrics: true,
    },
  })
    .withStt(new DeepgramSTT({ model: 'nova-3', language: 'en' }))
    .withLlm(
      new OpenAI({
        model: 'gpt-4o-mini',
        maxHistory: 10,
        params: { max_tokens: 1024, temperature: 0.7, top_p: 0.95 },
      }),
    )
    .withTts(
      new MiniMaxTTS({
        model: 'speech_2_6_turbo',
        voiceId: 'English_captivating_female1',
      }),
    );
}

export async function POST(request: NextRequest) {
  try {
    // ── 1. Parse request ───────────────────────────────────────────────────────
    const body = await request.json();
    const {
      requester_id,
      channel_name,
      candidate_name,
      applied_role,
      job_description,
      resume_text,
      resumeText: rawResumeText,
    } = body;

    const existingSession = channel_name ? getSession(channel_name) : undefined;
    const candidateName = candidate_name || existingSession?.candidateName;
    const appliedRole = applied_role || existingSession?.appliedRole;
    const jobDescription = job_description || existingSession?.jobDescription;
    const resumeText = resume_text || rawResumeText || existingSession?.resumeText;

    const appId = requireEnv('NEXT_PUBLIC_AGORA_APP_ID');
    const appCertificate = requireEnv('NEXT_AGORA_APP_CERTIFICATE');

    if (!channel_name || !requester_id) {
      return NextResponse.json(
        { error: 'channel_name and requester_id are required' },
        { status: 400 },
      );
    }

    // ── 2. Shared Agora client ─────────────────────────────────────────────────
    const agoraClient = new AgoraClient({ area: Area.US, appId, appCertificate });

    // ── 3. Start ONE silent STT-only agent (Neerja, UID 1001) ─────────────────
    // Architecture:
    //   • This single agent listens to the candidate (remoteUids: [requester_id])
    //     for transcript capture via AgoraVoiceAI + RTM.
    //   • Its system prompt instructs it to NEVER generate audio output.
    //   • ALL panelist voice responses (Neerja/Prabhat/Madhur) are delivered
    //     exclusively via the Sarvam REST TTS → browser Audio() pipeline
    //     orchestrated by /api/interview/panel-turn.
    //   • This eliminates all cloud TTS audio overlap completely.
    const neerjaConfig = getRoleConfig(InterviewRole.SYSTEM_ARCHITECT);
    const sttAgent = buildSttOnlyAgent(agoraClient, STT_ONLY_SYSTEM_PROMPT);

    const sttSession = sttAgent.createSession({
      name: `conversation-${Date.now()}`,
      channel: channel_name,
      agentUid: String(neerjaConfig.uid), // 1001 — fixed UID so AgoraVoiceAI can track it
      remoteUids: [String(requester_id)], // listen to the candidate for STT
      idleTimeout: 300,                   // 5-min idle timeout
      expiresIn: ExpiresIn.hours(1),
      debug: false,
    });

    const agentId = await sttSession.start();
    console.log(
      `[InviteAgent] STT-only agent started: UID=${neerjaConfig.uid} | AgentID="${agentId}" | Channel="${channel_name}"`,
    );

    const agentIds: Partial<Record<InterviewRole, string>> = {
      [InterviewRole.SYSTEM_ARCHITECT]: agentId,
    };
    const primaryAgentId = agentId;

    // ── 6. Register server session with all agent IDs & Panel Ledger ─────────────────────────
    PanelLedger.clear(channel_name);

    createSession({
      sessionId: channel_name,
      channelName: channel_name,
      candidateUid: String(requester_id),
      candidateName,
      appliedRole,
      jobDescription,
      resumeText,
      agentId: primaryAgentId,
      agentIds,
      initialRole: InterviewRole.SYSTEM_ARCHITECT,
    });

    console.log(
      `[InviteAgent] Panel ready: Channel="${channel_name}" | Agents=${JSON.stringify(agentIds)}`,
    );

    return NextResponse.json({
      agent_id: primaryAgentId,
      agent_ids: agentIds,
      create_ts: Math.floor(Date.now() / 1000),
      state: 'RUNNING',
    } as AgentResponse);
  } catch (error) {
    console.error('Error starting conversation:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to start conversation',
      },
      { status: 500 },
    );
  }
}
