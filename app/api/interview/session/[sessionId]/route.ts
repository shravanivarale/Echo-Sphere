import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/interview-session-store';

const SESSION_ID_REGEX = /^[a-zA-Z0-9_\-]{3,100}$/;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await context.params;

    if (!sessionId || !SESSION_ID_REGEX.test(sessionId)) {
      return NextResponse.json(
        { error: 'Invalid sessionId format.' },
        { status: 400 },
      );
    }

    const session = getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      session,
      evaluation: session.evaluation || null,
    });
  } catch (error) {
    console.error('Error in GET /api/interview/session/[sessionId]:', error);
    return NextResponse.json(
      { error: 'Internal server error fetching session' },
      { status: 500 },
    );
  }
}
