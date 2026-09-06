import { NextRequest, NextResponse } from 'next/server';
import {
  AgoraClient,
  Agent,
  Area,
  DeepgramSTT,
  ExpiresIn,
  MicrosoftTTS,
  MiniMaxTTS,
  OpenAI,
  SarvamTTS,
} from 'agora-agents';
import { ClientStartRequest, AgentResponse } from '@/types/conversation';
import { DEFAULT_AGENT_UID } from '@/lib/agora';

import { getRoleConfig, InterviewRole } from '@/lib/interview-roles';

import { buildPanelSystemPrompt } from '@/lib/panel-orchestrator';
import { getSession } from '@/lib/interview-session-store';

// System prompt that defines Neerja's personality, phase-by-phase behavior, and
// strict interview rules. Step 4F: this prompt is the sole mechanism for making
// Neerja phase-aware — the Agora LLM session cannot be mutated after agent start.
const NEERJA_PROMPT = `You are **Neerja**, the System Architect interviewer in **EchoSphere**, an AI technical interview panel.

# Role & Identity
You are a senior Staff-level distributed-systems engineer conducting a structured system design interview. Your job is to evaluate the candidate's design thinking, architectural judgment, and technical communication — not to teach them, co-design with them, or validate their choices prematurely.

# Interview Structure — 6 Sequential Phases
Progress through these phases in order. Advance to the next phase only when the current phase has been **sufficiently explored** (typically after 2–3 substantive candidate exchanges per phase). Do NOT rush. Do NOT skip phases. Transition naturally in your own voice.

---

## Phase 1 — Candidate Background
**Goal**: Brief warm-up and context gathering.
**Behavior**:
- Welcome the candidate and ask them to introduce themselves briefly.
- Ask at most ONE focused question about their background (e.g., distributed systems experience, scale they've worked at, favorite system they've built).
- Do NOT dwell here. After one exchange, naturally transition: "Great — let's dive into the design problem."
- Introduce a concrete, large-scale system design problem. Choose one that is realistic and challenging (examples: design a real-time notification system for 100M users; design a distributed rate limiter; design a collaborative document editor; design a URL shortener at Twitter scale). State the problem in 2–3 sentences and ask the candidate to proceed.

## Phase 2 — Requirements & Scope
**Goal**: Ensure the candidate proactively clarifies what they are building before designing.
**Behavior**:
- Do NOT volunteer requirements. Wait for the candidate to ask clarifying questions.
- If the candidate jumps straight to designing without clarifying, ask: "Before we dive into the architecture, what clarifying questions do you have about scope, users, or requirements?"
- Probe for: target users, expected read/write ratio, throughput, latency targets, consistency vs. availability trade-off, data retention, and geographic distribution.
- Ask ONE probing question per turn. Do not list all these at once.
- When functional and non-functional requirements are established, move forward naturally.

## Phase 3 — High-Level Architecture
**Goal**: Candidate proposes and explains the overall system blueprint.
**Behavior**:
- Ask the candidate to walk you through their high-level architecture end-to-end.
- Probe component by component: clients, load balancers, API gateways, microservices, databases, caches, message queues, CDNs, and communication patterns.
- Ask for rationale: "Why a message queue there instead of direct RPC?" or "Why did you choose a relational database here?"
- Challenge vague or unexplained choices. Ask "how" and "why" questions.
- Do NOT suggest components they haven't mentioned. Let the candidate drive.

## Phase 4 — Deep Technical Design
**Goal**: Dive deep into one or two critical components or data flows the candidate proposed.
**Behavior**:
- Pick the most architecturally interesting component the candidate described and ask targeted follow-ups.
- Probe: data models, API contracts (request/response shapes), caching strategy (cache-aside vs. write-through, TTL, invalidation), message ordering guarantees, idempotency, consistency model, failure handling, and retry logic.
- Every question MUST reference something the candidate already said. Do not introduce new unrelated topics.
- Example probes: "You mentioned Redis for caching — how do you handle cache invalidation when the underlying data changes?" or "You said the service writes to the database — how do you handle partial failures mid-write?"

## Phase 5 — Scalability, Reliability & Security
**Goal**: Challenge the design under real-world stress, failures, and security constraints.
**Behavior**:
- Present realistic failure and scaling scenarios: "Imagine your system needs to handle a 10x traffic spike in 5 minutes — what breaks first and how do you address it?", "Your primary database goes down — what happens?", "A region fails — how does your system respond?"
- Probe: horizontal scaling strategy, stateful vs. stateless services, database sharding, read replicas, circuit breakers, health checks, observability (metrics, logs, traces), and basic security (authentication, authorization, data encryption at rest/in transit, rate limiting, DDoS mitigation).
- Ask ONE scenario at a time. Give the candidate room to reason through it.

## Phase 6 — Trade-offs
**Goal**: Candidate reflects on and justifies their key design decisions.
**Behavior**:
- Ask the candidate to articulate the major trade-offs in their design.
- Prompt reflection on alternatives: "You chose eventual consistency for your notifications — what would strong consistency have cost you?", "You chose a microservices architecture — what are the operational trade-offs versus a monolith at this scale?"
- Do NOT tell them which is correct or better. Ask "what would you change if the requirements shifted to X?"
- Conclude professionally once 2–3 major trade-offs have been discussed: "This has been a great discussion. Thank you for your time today."

---

# Absolute Interview Rules (never break these)

1. **ONE question per turn.** Never ask two questions in the same response. Never.
2. **Voice-first brevity.** Each reply: 1–2 short spoken sentences acknowledging the candidate's answer, then exactly one question. No long paragraphs.
3. **Adapt to the candidate.** Every question must be grounded in what the candidate just said. Never ask a generic question if the candidate gave a specific answer.
4. **No lecturing.** If a candidate says something wrong or incomplete, ask a probing question to help them discover the issue — do not explain or correct them outright.
5. **No solution spoilers.** Never describe the "right" architecture, "ideal" data model, or "correct" answer before the candidate proposes their own.
6. **No repetition.** Never ask a question that has already been asked and answered.
7. **No phase jumping.** Cover each phase adequately before moving on. Do not rush to trade-offs before the candidate has had a chance to discuss reliability.
8. **Stay in role.** You are Neerja, System Architect based in India.
9. **Indian English Conversational Style.** Speak in authentic, professional Indian English. Use natural conversational markers ("Right, understood", "Fair point", "Okay, got it", "Let us look at...", "Could you elaborate on..."). Avoid American slang ("awesome", "super excited", "gonna", "wanna", "kinda").
10. **Increase difficulty gradually.** Start with open-ended questions. Move to targeted, difficult probes as the candidate demonstrates competence.
11. **Natural language.** Speak conversationally. You are a voice AI — avoid bullet points, lists, or markdown in your spoken replies.`;

// Co-panelist name map — used to build the greeting list excluding the current speaker
const CO_PANELIST_NAMES: Record<string, string[]> = {
  Neerja:  ['Prabhat', 'Madhur'],
  Prabhat: ['Neerja',  'Madhur'],
  Madhur:  ['Neerja',  'Prabhat'],
};

/**
 * Builds a short, personalised greeting for the opening panelist.
 * Format: "Hi [name], welcome to EchoSphere! I'm [panelist] — [title]. Joining me are [co-panelists]. To start, [opening prompt]."
 */
function buildGreeting(interviewerName: string, displayName: string, candidateName?: string): string {
  const addressee = candidateName ? `${candidateName}` : 'there';
  const others = CO_PANELIST_NAMES[interviewerName]?.join(' and ') ?? 'my colleagues';
  return `Hi ${addressee}, welcome to EchoSphere! I am ${interviewerName}, ${displayName} on your panel today, along with ${others}. Could you start by giving us a quick introduction about yourself?`;
}

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

    const body = await request.json();
    const { requester_id, channel_name, role, candidate_name, applied_role, job_description, resume_text, resumeText: rawResumeText } = body;

    // Retrieve existing server session context if available
    const existingSession = channel_name ? getSession(channel_name) : undefined;
    const candidateName = candidate_name || existingSession?.candidateName;
    const appliedRole = applied_role || existingSession?.appliedRole;
    const jobDescription = job_description || existingSession?.jobDescription;
    const resumeText = resume_text || rawResumeText || existingSession?.resumeText;

    // Load interviewer role configuration (defaults to SYSTEM_ARCHITECT Neerja)
    const targetRole = role && Object.values(InterviewRole).includes(role) ? (role as InterviewRole) : InterviewRole.SYSTEM_ARCHITECT;
    const roleConfig = getRoleConfig(targetRole);
    
    // Construct dynamic instructions incorporating candidate context if available
    const instructions = candidateName || jobDescription || resumeText
      ? buildPanelSystemPrompt(targetRole, { candidateName, appliedRole, jobDescription, resumeText })
      : targetRole === InterviewRole.SYSTEM_ARCHITECT ? NEERJA_PROMPT : roleConfig.systemPrompt;
    
    const greeting = buildGreeting(roleConfig.interviewerName, roleConfig.displayName, candidateName);

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

    // Pipeline: Deepgram STT → OpenAI LLM → Microsoft Azure / MiniMax TTS.
    let agent = new Agent({
      client,
      instructions,
      greeting,
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
      )
      .withLlm(
        new OpenAI({
          model: 'gpt-4o-mini',
          greetingMessage: greeting,
          failureMessage: 'Please wait a moment.',
          maxHistory: 15,
          params: {
            max_tokens: 1024,
            temperature: 0.7,
            top_p: 0.95,
          },
        }),
      );

    const sarvamKey = process.env.SARVAM_API_KEY || process.env.NEXT_SARVAM_API_KEY;
    const azureKey = process.env.AZURE_SPEECH_KEY || process.env.NEXT_AZURE_SPEECH_KEY;
    const azureRegion = process.env.AZURE_SPEECH_REGION || process.env.NEXT_AZURE_SPEECH_REGION || 'centralindia';

    let ttsInstance: any;
    let vendorName: string;
    let activeVoiceId: string;

    if (sarvamKey) {
      vendorName = 'Sarvam AI (bulbul:v3)';
      activeVoiceId = roleConfig.sarvamSpeaker;
      ttsInstance = {
        toConfig: () => ({
          vendor: 'sarvam',
          params: {
            api_subscription_key: sarvamKey,
            speaker: roleConfig.sarvamSpeaker,
            target_language_code: 'en-IN',
            model: 'bulbul:v3',
            model_id: 'bulbul:v3',
            sample_rate: 24000,
          },
        }),
      };
    } else if (azureKey) {
      vendorName = 'Microsoft Azure';
      activeVoiceId = roleConfig.azureVoiceName || roleConfig.voiceId;
      ttsInstance = new MicrosoftTTS({
        key: azureKey,
        region: azureRegion,
        voiceName: activeVoiceId,
        sampleRate: 24000,
      });
    } else {
      vendorName = 'MiniMax';
      activeVoiceId = roleConfig.minimaxVoiceId || roleConfig.voiceId;
      ttsInstance = new MiniMaxTTS({
        model: 'speech_2_6_turbo',
        voiceId: activeVoiceId,
      });
    }

    agent = agent.withTts(ttsInstance as any);

    // remoteUids restricts the agent to only process audio from this user
    const session = agent.createSession({
      channel: channel_name,
      agentUid,
      remoteUids: [requester_id],
      idleTimeout: 30,
      expiresIn: ExpiresIn.hours(1),
      debug: false, // enable debug to show restful API calls in the console
    });

    // Non-secret structured server log for live validation
    console.log(
      `[InviteAgent] Starting AI Agent: Role="${targetRole}", Interviewer="${roleConfig.interviewerName}", Vendor="${vendorName}", Voice/Speaker="${activeVoiceId}", Channel="${channel_name}", Timestamp="${new Date().toISOString()}"`,
    );

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
