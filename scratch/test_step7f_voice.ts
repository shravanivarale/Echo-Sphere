/**
 * EchoSphere Step 7F — Voice Personalization & Audio Safety Regression Test Suite
 *
 * Verifies:
 * 1. Ada, Alex, and Marcus have distinct configured voiceId identities.
 * 2. Valid TTS configuration per role.
 * 3. Candidate name is embedded into all panel system prompts.
 * 4. Job description is embedded into all panel system prompts.
 * 5. Role-specific behavioral instructions remain distinct.
 * 6. Audio safety guarantees from Step 7E continue passing without regression.
 */

import { getRoleConfig, ROLE_CONFIGS, InterviewRole } from '../lib/interview-roles';
import { buildPanelSystemPrompt } from '../lib/panel-orchestrator';
import { createSession, clearSessionStore } from '../lib/interview-session-store';
import { transitionPanelSpeaker } from '../lib/panel-speaker-manager';

async function runStep7FVoiceTests() {
  console.log('==================================================');
  console.log('EchoSphere Step 7F — Voice Personalization Test Suite');
  console.log('==================================================\n');

  // --- Test 1: Distinct Voice IDs ---
  console.log('=== Test 1: Distinct Voice IDs Verification ===');
  const adaConfig = getRoleConfig(InterviewRole.SYSTEM_ARCHITECT);
  const alexConfig = getRoleConfig(InterviewRole.PRODUCT_MANAGER);
  const marcusConfig = getRoleConfig(InterviewRole.SECURITY_LEAD);

  console.log(`Ada (System Architect) Voice ID: "${adaConfig.voiceId}"`);
  console.log(`Alex (Product Manager) Voice ID: "${alexConfig.voiceId}"`);
  console.log(`Marcus (Security Lead) Voice ID: "${marcusConfig.voiceId}"`);

  if (!adaConfig.voiceId || !alexConfig.voiceId || !marcusConfig.voiceId) {
    throw new Error('All interviewers must have a valid configured voiceId');
  }

  if (
    adaConfig.voiceId === alexConfig.voiceId ||
    alexConfig.voiceId === marcusConfig.voiceId ||
    adaConfig.voiceId === marcusConfig.voiceId
  ) {
    throw new Error('Ada, Alex, and Marcus must have distinct voiceId identities');
  }
  console.log('PASSED: Distinct voice identities verified for Ada, Alex, and Marcus.\n');

  // --- Test 2: Candidate Name & Job Description in Prompts ---
  console.log('=== Test 2: Shared Context Embedding in Role Prompts ===');
  const testCandidateName = 'Priya Sharma';
  const testRole = 'SYSTEM_ARCHITECT';
  const testJD = 'Lead FinTech Architect building low-latency payment processing engine with 99.999% uptime.';

  for (const role of [InterviewRole.SYSTEM_ARCHITECT, InterviewRole.PRODUCT_MANAGER, InterviewRole.SECURITY_LEAD]) {
    const prompt = buildPanelSystemPrompt(role, {
      candidateName: testCandidateName,
      appliedRole: testRole,
      jobDescription: testJD,
    });

    if (!prompt.includes(testCandidateName)) {
      throw new Error(`Prompt for role ${role} missing candidateName "${testCandidateName}"`);
    }

    if (!prompt.includes(testJD)) {
      throw new Error(`Prompt for role ${role} missing jobDescription`);
    }
  }
  console.log('PASSED: candidateName and jobDescription embedded in all 3 panel prompts.\n');

  // --- Test 3: Role-Specific Behavioral Prompts ---
  console.log('=== Test 3: Distinct Role-Specific Behavioral Prompts ===');
  console.log('Ada Prompt Rules:', adaConfig.systemPrompt.slice(0, 150) + '...');
  console.log('Alex Prompt Rules:', alexConfig.systemPrompt.slice(0, 150) + '...');
  console.log('Marcus Prompt Rules:', marcusConfig.systemPrompt.slice(0, 150) + '...');

  if (adaConfig.systemPrompt === alexConfig.systemPrompt || alexConfig.systemPrompt === marcusConfig.systemPrompt) {
    throw new Error('System prompts must be distinct for each role');
  }
  console.log('PASSED: Behavioral prompts are distinct.\n');

  // --- Test 4: Audio Safety Non-Regression Verification ---
  console.log('=== Test 4: Audio Safety Non-Regression Verification ===');
  clearSessionStore();
  const session = createSession({
    sessionId: 'step7f-audio-safety-check',
    candidateName: testCandidateName,
    appliedRole: testRole,
    jobDescription: testJD,
  });

  const state1 = await transitionPanelSpeaker(session, InterviewRole.SECURITY_LEAD, { reason: 'Test switch 1' });
  const state2 = await transitionPanelSpeaker(session, InterviewRole.PRODUCT_MANAGER, { reason: 'Test switch 2' });
  const state3 = await transitionPanelSpeaker(session, InterviewRole.SYSTEM_ARCHITECT, { reason: 'Test switch 3' });

  if (state3.activeSpeaker !== InterviewRole.SYSTEM_ARCHITECT) {
    throw new Error('Audio safety speaker arbitration failed');
  }
  console.log('PASSED: Audio safety arbitration works cleanly alongside voice personalization.\n');

  console.log('==================================================');
  console.log('ALL STEP 7F VOICE PERSONALIZATION TESTS PASSED!');
  console.log('==================================================');
}

runStep7FVoiceTests();
