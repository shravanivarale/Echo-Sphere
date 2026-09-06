/**
 * EchoSphere Sarvam AI REST TTS Synthesizer
 *
 * Direct REST integration with Sarvam AI's Text-to-Speech API using `bulbul:v3` model.
 * Generates distinct voice audio buffers for Neerja (priya), Prabhat (shubh), and Madhur (aditya).
 */

export interface SarvamTTSRequest {
  text: string;
  speaker: 'priya' | 'shubh' | 'aditya' | string;
  targetLanguageCode?: string;
  sampleRate?: number;
}

export interface SarvamTTSResponse {
  audioBase64: string;
  audioContentType: string;
}

export async function generateSarvamAudio(
  params: SarvamTTSRequest,
): Promise<SarvamTTSResponse> {
  const apiKey =
    process.env.SARVAM_API_KEY || process.env.NEXT_SARVAM_API_KEY;

  if (!apiKey) {
    throw new Error('SARVAM_API_KEY environment variable is missing');
  }

  const response = await fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST',
    headers: {
      'api-subscription-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: [params.text],
      target_language_code: params.targetLanguageCode || 'en-IN',
      speaker: params.speaker,
      speech_sample_rate: params.sampleRate || 24000,
      enable_preprocessing: true,
      model: 'bulbul:v3',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Sarvam TTS API failed with status ${response.status}: ${errorText}`,
    );
  }

  const data = (await response.json()) as { audios?: string[] };
  if (!data.audios || data.audios.length === 0) {
    throw new Error('Sarvam TTS API returned empty audio response');
  }

  return {
    audioBase64: data.audios[0],
    audioContentType: 'audio/wav',
  };
}
