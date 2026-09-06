import { AgoraClient, Area, Agent, DeepgramSTT, OpenAI, generateConvoAIToken } from 'agora-agents';
import { DEFAULT_AGENT_UID } from '../lib/agora';

const sarvamKey = 'sk_7239vl14_zzUOfCYHIDTLLCppLHRExzkF';
const appId = '0f080f4c803a4a0a8bae64983c1252f9';
const appCertificate = '891f6f569a684dceb59506d3a88bb165';

class AgoraSarvamTTS {
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

async function testUpdate() {
  const client = new AgoraClient({
    area: Area.US,
    appId,
    appCertificate,
  });

  const channel = `test-update-${Date.now()}`;
  const agent = new Agent({
    client,
    instructions: 'You are Neerja.',
    greeting: 'Hello.',
  })
    .withStt(new DeepgramSTT({ model: 'nova-3', language: 'en' }))
    .withLlm(new OpenAI({ model: 'gpt-4o-mini' }))
    .withTts(new AgoraSarvamTTS({ key: sarvamKey, speaker: 'ritu' }) as any);

  const session = agent.createSession({
    channel,
    agentUid: String(DEFAULT_AGENT_UID),
    remoteUids: ['999999'],
    idleTimeout: 10,
  });

  const agentId = await session.start();
  console.log(`Agent started: ${agentId}`);

  // Test update
  const token = generateConvoAIToken({
    appId,
    appCertificate,
    channelName: channel,
    uid: DEFAULT_AGENT_UID,
  });
  console.log('Testing update with token...');
  try {
    const res = await client.agents.update(
      {
        appid: appId,
        agentId,
        properties: {
          tts: {
            vendor: 'sarvam',
            params: {
              api_subscription_key: sarvamKey,
              speaker: 'aditya',
              target_language_code: 'en-IN',
              model: 'bulbul:v3',
              model_id: 'bulbul:v3',
              sample_rate: 24000,
            },
          },
        } as any,
      },
      { headers: { Authorization: `agora token=${token}` } },
    );
    console.log('SUCCESS! agents.update succeeded!', res);
  } catch (err: any) {
    console.error('Update failed:', err);
  } finally {
    await session.stop().catch(() => {});
    process.exit(0);
  }
}

testUpdate();
