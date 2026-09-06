import { AgoraClient, Area, Agent, DeepgramSTT, OpenAI } from 'agora-agents';

const sarvamKey = 'sk_7239vl14_zzUOfCYHIDTLLCppLHRExzkF';
const appId = '0f080f4c803a4a0a8bae64983c1252f9';
const appCertificate = '891f6f569a684dceb59506d3a88bb165';

class SarvamV3TTS {
  constructor(private options: { key: string; speaker: string; sampleRate?: number }) {}
  toConfig() {
    return {
      vendor: 'sarvam',
      params: {
        api_subscription_key: this.options.key,
        speaker: this.options.speaker,
        target_language_code: 'en-IN',
        model: 'bulbul:v3',
        model_id: 'bulbul:v3',
        sample_rate: this.options.sampleRate || 24000,
      },
    };
  }
}

async function testAgoraSarvam() {
  const client = new AgoraClient({
    area: Area.US,
    appId,
    appCertificate,
  });

  const agent = new Agent({
    client,
    instructions: 'You are Neerja, a software architect from India. Greet the candidate in Indian English.',
    greeting: 'Hello candidate, welcome to EchoSphere! I am Neerja.',
  })
    .withStt(new DeepgramSTT({ model: 'nova-3', language: 'en' }))
    .withLlm(new OpenAI({ model: 'gpt-4o-mini' }))
    .withTts(new SarvamV3TTS({ key: sarvamKey, speaker: 'ritu', sampleRate: 24000 }) as any);

  const testChannel = `test-sarvam-${Date.now()}`;
  console.log(`Starting agent in channel: ${testChannel}...`);

  const session = agent.createSession({
    channel: testChannel,
    agentUid: '123456',
    remoteUids: ['999999'],
    idleTimeout: 10,
    debug: true,
  });

  try {
    const agentId = await session.start();
    console.log(`SUCCESS! Agent started with ID: ${agentId}`);
    
    setTimeout(async () => {
      console.log('Stopping test agent...');
      await session.stop().catch(() => {});
      console.log('Test agent stopped.');
      process.exit(0);
    }, 4000);
  } catch (err: any) {
    console.error('FAILED to start agent:', err?.message || err);
    process.exit(1);
  }
}

testAgoraSarvam();
