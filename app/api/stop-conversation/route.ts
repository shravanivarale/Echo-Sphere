import { NextRequest, NextResponse } from 'next/server';
import { getSession, deleteSession } from '@/lib/interview-session-store';
import { AgoraClient, Area } from 'agora-agents';
import { StopConversationRequest } from '@/types/conversation';

/**
 * Stops one or many agents belonging to a session.
 *   • Legacy single‑agent mode: `agent_id` is respected.
 *   • Multi‑agent mode: `agent_ids` array is honoured and all IDs are stopped.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as StopConversationRequest;
    const { agent_id, agent_ids } = body;

    if (!agent_id && (!agent_ids || agent_ids.length === 0)) {
      return NextResponse.json(
        { error: 'agent_id is required' },
        { status: 400 },
      );
    }

    const sessionId = req.headers.get('x-session-id');
    const session = sessionId ? getSession(sessionId) : undefined;

    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
    const appCertificate = process.env.NEXT_AGORA_APP_CERTIFICATE;
    if (!appId || !appCertificate) {
      throw new Error('Missing Agora credentials');
    }

    const agoraClient = new AgoraClient({ area: Area.US, appId, appCertificate });

    // Normalise IDs – include legacy single‑agent ID if present for safety.
    const idsToStop = new Set<string>();
    if (agent_id) idsToStop.add(agent_id);
    if (Array.isArray(agent_ids)) {
      for (const id of agent_ids) idsToStop.add(id);
    }
    // Backwards‑compatible fallback to stored session ids.
    if (session?.agentId) idsToStop.add(session.agentId);
    if (session?.agentIds) {
      Object.values(session.agentIds).forEach((id) => {
        if (id) idsToStop.add(id);
      });
    }

    // Stop each agent sequentially – the Agora SDK wait for completion.
    for (const id of idsToStop) {
      try {
        await agoraClient.stopAgent(id);
        console.log(`[StopConversation] Stopped agent ID=${id}`);
      } catch (e) {
        console.warn(`[StopConversation] Failed to stop agent ID=${id}:`, e);
      }
    }

    // Clean up the stored session.
    if (session?.sessionId) {
      deleteSession(session.sessionId);
    }
    return NextResponse.json({ success: true, stoppedAgentIds: Array.from(idsToStop) });
  } catch (error) {
    console.error('Error stopping conversation:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
