/**
 * EchoSphere Step 7D Live Scenario Test Script
 *
 * Executes the exact live scenario requested by the user:
 * Candidate Name: Shravani
 * Applied Role: SYSTEM_ARCHITECT
 * Edited JD: "The engineer should have strong experience designing distributed systems and production APIs."
 */

import { createSession, getSession, updateSessionTurns, completeSession, clearSessionStore } from '../lib/interview-session-store';
import { selectNextPanelSpeaker, buildPanelSystemPrompt } from '../lib/panel-orchestrator';
import { getRoleConfig } from '../lib/interview-roles';
import { InterviewRole, InterviewPhase, InterviewTurn } from '../types/interview';

async function testLiveScenario() {
  console.log('==================================================');
  console.log('EchoSphere Step 7D — Live Scenario Simulation');
  console.log('==================================================\n');

  clearSessionStore();

  const sessionId = 'shravani-panel-test-7d';
  const candidateName = 'Shravani';
  const appliedRole = 'SYSTEM_ARCHITECT';
  const editedJD = `Staff System Architect Position.
Key Requirements:
- The engineer should have strong experience designing distributed systems and production APIs.
- Deep expertise in database sharding, caching, and message queues.
- High availability, zero-trust security, and failure domain isolation.`;

  // 1. Create Session
  console.log('1. Creating Session with Candidate Context...');
  const session = createSession({
    sessionId,
    candidateName,
    appliedRole,
    jobDescription: editedJD,
  });

  console.log(`   Session Registered: ${session.sessionId}`);
  console.log(`   Candidate Name: ${session.candidateName}`);
  console.log(`   Applied Role: ${session.appliedRole}`);
  console.log(`   Job Description:\n"""\n${session.jobDescription}\n"""\n`);

  // 2. Verify Prompt Injection for Ada, Alex, Marcus
  console.log('2. Verifying System Prompts for 3 Panelists...');
  [InterviewRole.SYSTEM_ARCHITECT, InterviewRole.PRODUCT_MANAGER, InterviewRole.SECURITY_LEAD].forEach((role) => {
    const prompt = buildPanelSystemPrompt(role, { candidateName, appliedRole, jobDescription: editedJD });
    const config = getRoleConfig(role);
    console.log(`   - [${config.interviewerName}] Prompt contains candidate name ("Shravani"): ${prompt.includes('Shravani') ? 'YES' : 'NO'}`);
    console.log(`   - [${config.interviewerName}] Prompt contains edited JD quote: ${prompt.includes('production APIs') ? 'YES' : 'NO'}`);
  });
  console.log();

  // 3. Turn 1 Simulation: Candidate Background / Systems Intro
  console.log('3. Turn 1 Simulation...');
  const turn1: InterviewTurn = {
    turnId: 't-01',
    uid: '2001',
    role: 'candidate',
    text: "My name is Shravani and I'm particularly interested in designing production APIs and distributed systems.",
    status: 'END',
    timestamp: Date.now(),
  };

  const sel1 = selectNextPanelSpeaker(session, turn1.text);
  console.log(`   Candidate Utterance: "${turn1.text}"`);
  console.log(`   Orchestrator Decision: ${sel1.interviewerName} (${sel1.selectedRole})`);
  console.log(`   Rationale: ${sel1.reason}\n`);

  // 4. Turn 2 Simulation: Kafka / Architecture Probe
  console.log('4. Turn 2 Simulation...');
  const turn2: InterviewTurn = {
    turnId: 't-02',
    uid: '2001',
    role: 'candidate',
    text: "As I mentioned earlier, I would use Kafka for asynchronous event processing and message queueing across our microservices.",
    status: 'END',
    timestamp: Date.now() + 2000,
  };

  const sel2 = selectNextPanelSpeaker(session, turn2.text);
  console.log(`   Candidate Utterance: "${turn2.text}"`);
  console.log(`   Orchestrator Decision: ${sel2.interviewerName} (${sel2.selectedRole})`);
  console.log(`   Rationale: ${sel2.reason}\n`);

  // 5. Turn 3 Simulation: Security / OAuth Probe
  console.log('5. Turn 3 Simulation...');
  const turn3: InterviewTurn = {
    turnId: 't-03',
    uid: '2001',
    role: 'candidate',
    text: "For security, I would configure OAuth2 authentication, JWT validation, and rate limiting with TLS encryption on our API gateway.",
    status: 'END',
    timestamp: Date.now() + 4000,
  };

  const sel3 = selectNextPanelSpeaker(session, turn3.text);
  console.log(`   Candidate Utterance: "${turn3.text}"`);
  console.log(`   Orchestrator Decision: ${sel3.interviewerName} (${sel3.selectedRole})`);
  console.log(`   Rationale: ${sel3.reason}\n`);

  // 6. Finalize & Evaluate
  console.log('6. Finalizing Session & Running Evaluation...');
  updateSessionTurns(sessionId, [turn1, turn2, turn3]);
  const completed = completeSession(sessionId);

  if (completed && completed.evaluation) {
    console.log(`   Overall Weighted Score: ${completed.evaluation.overallScore}/10`);
    console.log(`   Recommendation: ${completed.evaluation.recommendation}`);
    console.log('   Dimension Breakdown:');
    completed.evaluation.dimensionScores.forEach((d) => {
      console.log(`     - [${d.primaryRole}] ${d.dimension}: ${d.score}/10`);
    });
  }

  console.log('\n==================================================');
  console.log('SIMULATION COMPLETED SUCCESSFULLY');
  console.log('==================================================');
}

testLiveScenario();
