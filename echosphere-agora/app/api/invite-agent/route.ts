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
import { ClientStartRequest, AgentResponse } from '@/types/conversation';
import { DEFAULT_AGENT_UID } from '@/lib/agora';

// System prompt that defines the agent's personality and behavior.
// Swap this out to change what the agent talks about.
const ADA_PROMPT = `You are the **System Architect** interviewer in **EchoSphere**, an AI technical interview panel.

# Role
You evaluate the candidate's system design thinking, architectural judgment, and technical communication. You are a senior technical interviewer, not a tutor, pair programmer, or general-purpose assistant. Never solve the problem for the candidate or provide the architecture yourself.

# Interview Progression
Follow this 6-phase progression sequentially. Advance to the next phase only when the current phase has been sufficiently explored.

- **Phase 1 — Candidate Background**:
  Acknowledge the candidate's introduction. Ask at most one focused question about their technical background or distributed systems experience, then transition into the design problem.
- **Phase 2 — Problem Understanding & Requirements**:
  Present a realistic, large-scale system design scenario (e.g., real-time collaborative platform, global notification service, or distributed rate limiter). Prompt the candidate to clarify scope, users, functional requirements, and non-functional requirements (throughput, latency, consistency, availability). Do not volunteer requirements unless the candidate explicitly asks for clarification.
- **Phase 3 — High-Level Architecture**:
  Ask the candidate to propose an end-to-end high-level architecture. Probe for major components: clients, API gateways, services, databases, caches, queues, and communication paths. Ask them to explain the rationale behind their component choices.
- **Phase 4 — Deep Technical Design**:
  Dive into a critical component or data flow based on what the candidate proposed. Ask targeted follow-up questions exploring data modeling, APIs, caching strategies, message ordering, consistency guarantees, or failure handling. Questions must strictly depend on what the candidate has already said.
- **Phase 5 — Scalability, Reliability & Security**:
  Challenge the candidate with real-world failure modes and scale increases (e.g., 10x traffic spike, database failover, network partition, hotspotting). Ask about bottlenecks, horizontal scaling, fault tolerance, circuit breaking, monitoring, and basic security considerations. Stay within the System Architect role.
- **Phase 6 — Trade-offs**:
  Ask the candidate to justify their key architectural choices. Explore alternatives and trade-offs (e.g., SQL vs. NoSQL, sync vs. async, strong vs. eventual consistency). Do not tell them which choice is correct. Conclude the interview professionally once trade-offs are evaluated.

# General Interview Rules
- **Voice-first brevity**: Spoken replies must be natural and concise—typically 1–2 short conversational sentences acknowledging what was said, followed by exactly ONE question.
- **Strictly ONE question at a time**: Never stack or combine multiple questions in one turn.
- **Adaptive follow-ups**: Wait for the candidate's response. Base every question on what the candidate actually said in their previous response. Prefer targeted follow-ups when an answer is vague, incomplete, or technically interesting.
- **Dynamic difficulty**: If the candidate gives strong, insightful answers, increase depth and difficulty gradually. If they struggle, offer a simpler guiding question to refocus them rather than giving away the answer.
- **No lecturing or solution revealing**: Do not lecture, give long speeches, or propose an ideal architecture before the candidate does.
- **No repetition**: Avoid repeating questions the candidate has already answered.
- **Role boundaries**: Stay strictly in the System Architect role at all times. EchoSphere will later add Product Manager and Security Lead interviewers; they are not active yet. Do not pretend they are present, speak as them, or hand off to them.`;

// First thing the agent says when a user joins the channel.
const GREETING = `Welcome to EchoSphere. I'm the System Architect on this interview panel. I'll focus on system design, scalability, and trade-offs. Please introduce yourself, then we can begin the technical interview.`;

// agentUid identifies the AI in the RTC channel and shares its default with the client.
const agentUid = String(DEFAULT_AGENT_UID);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export async function POST(request: NextRequest) {
  try {
    // --- 1. Parse request ---

    const body: ClientStartRequest = await request.json();
    const { requester_id, channel_name } = body;

    // Validate required env vars on first request so misconfiguration surfaces
    // with a clear error message rather than a silent failure.
    const appId = requireEnv('NEXT_PUBLIC_AGORA_APP_ID');
    const appCertificate = requireEnv('NEXT_AGORA_APP_CERTIFICATE');

    if (!channel_name || !requester_id) {
      return NextResponse.json(
        { error: 'channel_name and requester_id are required' },
        { status: 400 },
      );
    }

    // --- 2. Build and start the agent ---

    // AgoraClient authenticates API calls to the Agora Conversational AI service.
    // area: change to Area.EU or Area.AP for European or Asia-Pacific deployments.
    const client = new AgoraClient({
      area: Area.US,
      appId,
      appCertificate,
    });

    // Pipeline: Deepgram (reseller) STT → OpenAI (reseller) LLM → MiniMax (reseller) TTS.
    // Omit vendor API keys for supported models — AgentKit infers reseller presets on start (see Agora Console / billing).
    const agent = new Agent({
      client,
      instructions: ADA_PROMPT,
      greeting: GREETING,
      failureMessage: 'Please wait a moment.',
      maxHistory: 50,
      // VAD controls how the agent detects the start and end of a user's turn.
      turnDetection: {
        config: {
          speech_threshold: 0.5,
          start_of_speech: {
            mode: 'vad',
            vad_config: {
              interrupt_duration_ms: 160, // ms of speech before interruption triggers
              prefix_padding_ms: 300, // audio captured before speech is detected
            },
          },
          end_of_speech: {
            mode: 'vad',
            vad_config: {
              silence_duration_ms: 480, // ms of silence before turn ends
            },
          },
        },
      },
      // RTM is required for transcript events in the browser client.
      // enable_tools is required for MCP tool invocation.
      advancedFeatures: { enable_rtm: true, enable_tools: true },
      // Required for browser RTM events:
      // - data_channel: 'rtm' enables RTM delivery path for state/metrics/errors
      // - enable_error_message emits AGENT_ERROR payloads
      // - enable_metrics emits AGENT_METRICS latency payloads
      parameters: {
        // web client → ultra-low-latency chorus profile
        audio_scenario: 'chorus',
        data_channel: 'rtm',
        enable_error_message: true,
        enable_metrics: true,
      },
    })
      .withStt(
        new DeepgramSTT({
          model: 'nova-3',
          language: 'en',
        }),
        // BYOK: uncomment the following block and set NEXT_DEEPGRAM_API_KEY
        // new DeepgramSTT({
        //   apiKey: requireEnv('NEXT_DEEPGRAM_API_KEY'),
        //   model: 'nova-3',
        //   language: 'en',
        // }),
      )
      .withLlm(
        // Agora-managed ready-to-use OpenAI model (inferred reseller preset openai_gpt_4o_mini).
        // No external API key or custom endpoint required.
        new OpenAI({
          model: 'gpt-4o-mini',
          greetingMessage: GREETING,
          failureMessage: 'Please wait a moment.',
          maxHistory: 15,
          params: {
            max_tokens: 1024,
            temperature: 0.7,
            top_p: 0.95,
          },
        }),
      )
      .withTts(
        new MiniMaxTTS({
          model: 'speech_2_6_turbo',
          voiceId: 'English_captivating_female1',
        }),
        // BYOK — ElevenLabs (set NEXT_ELEVENLABS_API_KEY; optional NEXT_ELEVENLABS_VOICE_ID)
        // new (await import('agora-agents')).ElevenLabsTTS({
        //   key: requireEnv('NEXT_ELEVENLABS_API_KEY'),
        //   modelId: 'eleven_flash_v2_5',
        //   voiceId: process.env.NEXT_ELEVENLABS_VOICE_ID ?? 'pNInz6obpgDQGcFmaJgB',
        //   sampleRate: 24000,
        // }),
      );

    // remoteUids restricts the agent to only process audio from this user
    const session = agent.createSession({
      channel: channel_name,
      agentUid,
      remoteUids: [requester_id],
      idleTimeout: 30,
      expiresIn: ExpiresIn.hours(1),
      debug: false, // enable debug to show restful API calls in the console
    });

    const agentId = await session.start();

    return NextResponse.json({
      agent_id: agentId,
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
