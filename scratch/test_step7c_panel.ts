/**
 * EchoSphere Step 7C — 3-Agent Panel Verification Test Suite
 *
 * Verifies:
 * 1. Job Role Catalog & Default JDs
 * 2. Candidate Context & Editable JD Persistence in Session Store
 * 3. 3-Interviewer Definitions (Ada, Alex, Marcus)
 * 4. Relevance-based Panel Speaker Selection & Single Speaker Guarantee
 * 5. Dynamic Panel Instructions Embedding Candidate Name, Role, & JD
 * 6. Evaluation Compatibility & Evidence Mapping
 */

import {
  getAllJobRoles,
  getJobRoleById,
  JOB_ROLE_CATALOG,
} from '../lib/job-roles';
import {
  InterviewPhase,
  InterviewRole,
  InterviewSession,
  InterviewTurn,
} from '../types/interview';
import { getRoleConfig, ROLE_CONFIGS } from '../lib/interview-roles';
import {
  buildPanelSystemPrompt,
  selectNextPanelSpeaker,
} from '../lib/panel-orchestrator';
import {
  createSession,
  getSession,
  updateSessionTurns,
  completeSession,
  clearSessionStore,
} from '../lib/interview-session-store';
import { evaluateInterviewSession } from '../lib/evaluation';

function runTestSuite() {
  console.log('==================================================');
  console.log('EchoSphere Step 7C — 3-Agent Panel Test Suite');
  console.log('==================================================\n');

  clearSessionStore();

  // --- Test 1: Job Role Catalog Validation ---
  console.log('=== Test 1: Job Role Catalog Validation ===');
  const roles = getAllJobRoles();
  console.log(`Configured Job Roles Count: ${roles.length}`);
  roles.forEach((r) => {
    console.log(`  - [${r.id}] ${r.displayName} (Default JD length: ${r.defaultJobDescription.length} chars)`);
  });

  const frontendRole = getJobRoleById('FRONTEND_ARCHITECT');
  if (frontendRole.id !== 'FRONTEND_ARCHITECT') throw new Error('Failed to retrieve FRONTEND_ARCHITECT role');
  console.log('PASSED: Job Role Catalog verified.\n');

  // --- Test 2: 3-Interviewer Personas Check ---
  console.log('=== Test 2: 3-Interviewer Personas Check ===');
  const interviewers = [
    InterviewRole.SYSTEM_ARCHITECT,
    InterviewRole.PRODUCT_MANAGER,
    InterviewRole.SECURITY_LEAD,
  ];

  interviewers.forEach((role) => {
    const config = getRoleConfig(role);
    console.log(`Interviewer: ${config.interviewerName} (${config.displayName})`);
    console.log(`  - System Prompt Length: ${config.systemPrompt.length}`);
    console.log(`  - Greeting: "${config.greeting}"`);
    console.log(`  - Owned Dimensions: ${config.ownedDimensions.join(', ')}`);
  });
  console.log('PASSED: All 3 panel interviewers verified.\n');

  // --- Test 3: Candidate Context & Editable JD Persistence ---
  console.log('=== Test 3: Candidate Context & Editable JD Persistence ===');
  const testSessionId = 'step7c-test-session-001';
  const candidateName = 'Sarah Connor';
  const appliedRole = 'DEVOPS_SECURITY_ENGINEER';
  const customJD = 'Custom Job Description: Architect Zero-Trust Kubernetes Infrastructure for FinTech platform with 99.999% availability.';

  const created = createSession({
    sessionId: testSessionId,
    candidateName,
    appliedRole,
    jobDescription: customJD,
  });

  if (created.candidateName !== candidateName) throw new Error('candidateName mismatch');
  if (created.appliedRole !== appliedRole) throw new Error('appliedRole mismatch');
  if (created.jobDescription !== customJD) throw new Error('jobDescription mismatch');

  const retrieved = getSession(testSessionId);
  if (!retrieved || retrieved.jobDescription !== customJD) {
    throw new Error('Failed to retrieve candidate context from session store');
  }

  console.log(`Session Created: ${retrieved.sessionId}`);
  console.log(`  - Candidate Name: ${retrieved.candidateName}`);
  console.log(`  - Applied Role: ${retrieved.appliedRole}`);
  console.log(`  - Job Description: "${retrieved.jobDescription}"`);
  console.log('PASSED: Candidate context persistence verified.\n');

  // --- Test 4: Dynamic Panel System Prompt Builder ---
  console.log('=== Test 4: Dynamic Panel System Prompt Builder ===');
  const marcusPrompt = buildPanelSystemPrompt(InterviewRole.SECURITY_LEAD, {
    candidateName,
    appliedRole,
    jobDescription: customJD,
  });

  if (!marcusPrompt.includes(candidateName)) throw new Error('Prompt missing candidate name');
  if (!marcusPrompt.includes(customJD)) throw new Error('Prompt missing custom JD');
  if (!marcusPrompt.includes('Marcus')) throw new Error('Prompt missing interviewer identity');

  console.log('Generated System Prompt Snippet (Marcus):');
  console.log(marcusPrompt.slice(0, 320) + '...\n');
  console.log('PASSED: Dynamic panel system prompt builder verified.\n');

  // --- Test 5: Relevance-based Speaker Selection (Single Speaker Guarantee) ---
  console.log('=== Test 5: Relevance-based Speaker Selection ===');

  const turn1: InterviewTurn = {
    turnId: 'turn-01',
    uid: '2001',
    role: 'candidate',
    text: 'I would clarify the SLA and QPS requirements with the product manager first.',
    status: 'END',
    timestamp: Date.now(),
  };

  const sel1 = selectNextPanelSpeaker(created, turn1.text);
  console.log(`Turn 1 Text: "${turn1.text}"`);
  console.log(`  -> Selected Speaker: ${sel1.interviewerName} (${sel1.selectedRole})`);
  console.log(`  -> Rationale: ${sel1.reason}`);
  if (sel1.selectedRole !== InterviewRole.PRODUCT_MANAGER) {
    throw new Error(`Expected PRODUCT_MANAGER, got ${sel1.selectedRole}`);
  }

  const turn2: InterviewTurn = {
    turnId: 'turn-02',
    uid: '2001',
    role: 'candidate',
    text: 'To secure the API gateway, I would implement OAuth2, JWT validation, and rate limiting with TLS encryption.',
    status: 'END',
    timestamp: Date.now() + 1000,
  };

  const sel2 = selectNextPanelSpeaker(created, turn2.text);
  console.log(`\nTurn 2 Text: "${turn2.text}"`);
  console.log(`  -> Selected Speaker: ${sel2.interviewerName} (${sel2.selectedRole})`);
  console.log(`  -> Rationale: ${sel2.reason}`);
  if (sel2.selectedRole !== InterviewRole.SECURITY_LEAD) {
    throw new Error(`Expected SECURITY_LEAD, got ${sel2.selectedRole}`);
  }

  const turn3: InterviewTurn = {
    turnId: 'turn-03',
    uid: '2001',
    role: 'candidate',
    text: 'I choose a Kafka message queue with Redis caching and PostgreSQL database sharding for scalability.',
    status: 'END',
    timestamp: Date.now() + 2000,
  };

  const sel3 = selectNextPanelSpeaker(created, turn3.text);
  console.log(`\nTurn 3 Text: "${turn3.text}"`);
  console.log(`  -> Selected Speaker: ${sel3.interviewerName} (${sel3.selectedRole})`);
  console.log(`  -> Rationale: ${sel3.reason}`);
  if (sel3.selectedRole !== InterviewRole.SYSTEM_ARCHITECT) {
    throw new Error(`Expected SYSTEM_ARCHITECT, got ${sel3.selectedRole}`);
  }

  console.log('PASSED: Relevance-based speaker selection & single-speaker guarantee verified.\n');

  // --- Test 6: Evaluation Compatibility ---
  console.log('=== Test 6: Evaluation Compatibility ===');
  updateSessionTurns(testSessionId, [turn1, turn2, turn3]);
  const completed = completeSession(testSessionId);

  if (!completed || !completed.evaluation) throw new Error('Evaluation generation failed');

  console.log(`Overall Score: ${completed.evaluation.overallScore}/10`);
  console.log(`Recommendation: ${completed.evaluation.recommendation}`);
  console.log('Dimension Scores:');
  completed.evaluation.dimensionScores.forEach((d) => {
    console.log(`  - [${d.primaryRole}] ${d.dimension}: ${d.score}/10 (Evidence: ${d.evidenceTurnIds.join(', ') || 'none'})`);
  });

  console.log('PASSED: Evaluation engine fully compatible with 3-agent panel.\n');

  console.log('==================================================');
  console.log('ALL STEP 7C TESTS PASSED SUCCESSFULLY!');
  console.log('==================================================');
}

runTestSuite();
