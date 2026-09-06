import { AgoraClient, Area, Agent, DeepgramSTT, OpenAI, SarvamTTS } from 'agora-agents';

const sarvamKey = 'sk_7239vl14_zzUOfCYHIDTLLCppLHRExzkF';
const appId = '0f080f4c803a4a0a8bae64983c1252f9';
const appCertificate = '891f6f569a684dceb59506d3a88bb165';

// Test direct Sarvam API to see what parameters bulbul:v3 requires
async function testSpeakers() {
  const speakers = [
    { role: 'Neerja (Female)', speaker: 'ritu' },
    { role: 'Prabhat (Male)', speaker: 'aditya' },
    { role: 'Madhur (Male)', speaker: 'ashutosh' },
  ];

  for (const s of speakers) {
    console.log(`Testing speaker "${s.speaker}" for ${s.role}...`);
    const res = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': sarvamKey,
      },
      body: JSON.stringify({
        inputs: [`Hello, I am speaking as ${s.role}.`],
        target_language_code: 'en-IN',
        speaker: s.speaker,
        model: 'bulbul:v3',
      }),
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`SUCCESS for ${s.speaker}! Audios returned:`, data.audios?.length);
    } else {
      console.error(`FAILED for ${s.speaker}:`, JSON.stringify(data));
    }
  }
}

testSpeakers();
