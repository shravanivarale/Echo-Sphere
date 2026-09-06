import type { RTMClient } from 'agora-rtm';
import type { InterviewSession } from './interview';
import type { InterviewRole } from './interview';

export interface AgoraTokenData {
  token: string;
  uid: string;
  channel: string;
  /** Legacy single-agent ID (Neerja / SYSTEM_ARCHITECT) */
  agentId?: string;
  /** All three panelist agent IDs keyed by InterviewRole */
  agentIds?: Partial<Record<InterviewRole, string>>;
}

export interface ClientStartRequest {
  requester_id: string;
  channel_name: string;
}

export interface StopConversationRequest {
  /** Single agent ID (backward-compatible) */
  agent_id?: string;
  /** Multiple agent IDs to stop in parallel */
  agent_ids?: string[];
}

export interface AgentResponse {
  /** Primary/opening agent ID (Neerja) — kept for backward compat */
  agent_id: string;
  /** All three panelist agent IDs keyed by InterviewRole */
  agent_ids?: Partial<Record<InterviewRole, string>>;
  create_ts: number;
  state: string;
}

export interface AgoraRenewalTokens {
  rtcToken: string;
  rtmToken: string;
}

export interface ConversationComponentProps {
  agoraData: AgoraTokenData;
  rtmClient: RTMClient;
  onTokenWillExpire: (uid: string) => Promise<AgoraRenewalTokens>;
  onEndConversation: (completedSession?: InterviewSession) => void;
}

export type { InterviewSession };

