import { NextRequest, NextResponse } from 'next/server';
import { processInterviewTurn } from '@/lib/panel-planner';
import { generateExpertAudioTurn } from '@/lib/persona-generator';
import { generateSarvamAudio } from '@/lib/sarvam-tts';
import { PanelLedger } from '@/lib/panel-ledger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, userSpeechText, action } = body as {
      sessionId?: string;
      userSpeechText?: string;
      action?: 'greeting' | 'turn';
    };

    const targetSessionId = sessionId || 'default-session';

    // Session opening greeting action
    if (action === 'greeting') {
      const greetingText =
        'Hi there, welcome to EchoSphere! I am Neerja, your System Architect for today, along with Prabhat and Madhur. Could you start by giving us a quick introduction about yourself?';

      const existingTurns = PanelLedger.getTurns(targetSessionId);
      const alreadyHasGreeting = existingTurns.some(
        (t) => t.role === 'Neerja' && t.content.includes('welcome to EchoSphere'),
      );
      if (!alreadyHasGreeting) {
        PanelLedger.append(targetSessionId, {
          role: 'Neerja',
          content: greetingText,
        });
      }

      let audioBase64 = '';
      try {
        const audioRes = await generateSarvamAudio({
          text: greetingText,
          speaker: 'priya',
        });
        audioBase64 = audioRes.audioBase64;
      } catch (e) {
        console.warn('[PanelTurnAPI] Sarvam TTS greeting failed:', e);
      }

      return NextResponse.json({
        success: true,
        selectedExpert: 'Neerja',
        role: 'SYSTEM_ARCHITECT',
        uid: 1001,
        responseText: greetingText,
        audioBase64,
        audioContentType: 'audio/wav',
      });
    }

    // Standard candidate turn action
    const text = userSpeechText?.trim() || '';

    // Step 1: Central Planner (Traffic Cop) selects the next speaker
    const { selectedExpert, currentTranscript } = await processInterviewTurn(
      text,
      targetSessionId,
    );

    // Step 2: Target Expert Persona generates response text with full memory
    const expertTurn = await generateExpertAudioTurn(
      selectedExpert,
      currentTranscript,
      targetSessionId,
    );

    // Step 3: Sarvam REST API generates bulbul:v3 audio in the target expert's voice
    let audioBase64 = '';
    try {
      const audioRes = await generateSarvamAudio({
        text: expertTurn.responseText,
        speaker: expertTurn.sarvamSpeaker,
      });
      audioBase64 = audioRes.audioBase64;
    } catch (e) {
      console.warn(`[PanelTurnAPI] Sarvam TTS generation failed for ${selectedExpert}:`, e);
    }

    return NextResponse.json({
      success: true,
      selectedExpert: expertTurn.expertName,
      role: expertTurn.role,
      uid: expertTurn.uid,
      responseText: expertTurn.responseText,
      audioBase64,
      audioContentType: 'audio/wav',
    });
  } catch (error) {
    console.error('[PanelTurnAPI] Error processing panel turn:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
