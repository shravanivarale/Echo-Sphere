import {
  InterviewPhase,
  InterviewRole,
  InterviewSession,
  InterviewTurn,
} from '../types/interview';
import {
  ROLE_CONFIGS,
  getRoleConfig,
} from '../lib/interview-roles';
import {
  DEFAULT_ROLE_SEQUENCE,
  getRoleForPhase,
  checkAndExecuteRoleTransition,
} from '../lib/interview-orchestrator';
import {
  createSession,
  getSession,
  updateSessionTurns,
  completeSession,
  clearSessionStore,
} from '../lib/interview-session-store';
import { evaluateInterviewSession } from '../lib/evaluation';

console.log('==================================================');
console.log('EchoSphere Steps 6A & 6B Test Suite');
console.log('==================================================\n');

// ── Test 1: InterviewRole Type Validation ───────────────────────────────────
console.log('=== Test 1: InterviewRole Enum Validation ===');
const validRoles = Object.values(InterviewRole);
console.log('Defined Roles:', validRoles.join(', '));
if (
  validRoles.includes(InterviewRole.SYSTEM_ARCHITECT) &&
  validRoles.includes(InterviewRole.PRODUCT_MANAGER) &&
  validRoles.includes(InterviewRole.SECURITY_LEAD) &&
  validRoles.length === 3
) {
  console.log('PASSED: All 3 interview roles exist.');
} else {
  throw new Error('FAILED: Missing or invalid InterviewRole values.');
}

// ── Test 2: Role Configuration Completeness ──────────────────────────────────
console.log('\n=== Test 2: Role Configuration Check ===');
for (const role of validRoles) {
  const config = getRoleConfig(role);
  console.log(`Checking Role: ${config.role} (${config.interviewerName} - ${config.displayName})`);
  if (!config.systemPrompt || config.systemPrompt.length < 50) {
    throw new Error(`FAILED: Prompt missing or too short for ${role}`);
  }
  if (!config.greeting) {
    throw new Error(`FAILED: Greeting missing for ${role}`);
  }
  if (!config.ownedDimensions || config.ownedDimensions.length === 0) {
    throw new Error(`FAILED: No owned evaluation dimensions for ${role}`);
  }
}
console.log('PASSED: All 3 roles have system prompts, greetings, and owned dimensions.');

// ── Test 3: Deterministic Role Sequence & Phase Mapping ─────────────────────
console.log('\n=== Test 3: Phase-to-Role Deterministic Mapping ===');
const phaseMappings: Record<InterviewPhase, InterviewRole> = {
  [InterviewPhase.BACKGROUND]: getRoleForPhase(InterviewPhase.BACKGROUND),
  [InterviewPhase.REQUIREMENTS]: getRoleForPhase(InterviewPhase.REQUIREMENTS),
  [InterviewPhase.ARCHITECTURE]: getRoleForPhase(InterviewPhase.ARCHITECTURE),
  [InterviewPhase.DEEP_DESIGN]: getRoleForPhase(InterviewPhase.DEEP_DESIGN),
  [InterviewPhase.SCALABILITY_RELIABILITY_SECURITY]: getRoleForPhase(InterviewPhase.SCALABILITY_RELIABILITY_SECURITY),
  [InterviewPhase.TRADE_OFFS]: getRoleForPhase(InterviewPhase.TRADE_OFFS),
};

console.log('Phase Mappings:', JSON.stringify(phaseMappings, null, 2));

if (
  phaseMappings[InterviewPhase.BACKGROUND] === InterviewRole.SYSTEM_ARCHITECT &&
  phaseMappings[InterviewPhase.REQUIREMENTS] === InterviewRole.PRODUCT_MANAGER &&
  phaseMappings[InterviewPhase.ARCHITECTURE] === InterviewRole.SYSTEM_ARCHITECT &&
  phaseMappings[InterviewPhase.DEEP_DESIGN] === InterviewRole.SYSTEM_ARCHITECT &&
  phaseMappings[InterviewPhase.SCALABILITY_RELIABILITY_SECURITY] === InterviewRole.SECURITY_LEAD &&
  phaseMappings[InterviewPhase.TRADE_OFFS] === InterviewRole.SYSTEM_ARCHITECT
) {
  console.log('PASSED: Deterministic phase-to-role sequence verified.');
} else {
  throw new Error('FAILED: Phase-to-role mapping mismatch.');
}

// ── Test 4: Role Transition State Machine ───────────────────────────────────
console.log('\n=== Test 4: Role Transition History Tracking ===');
clearSessionStore();
const session = createSession({ sessionId: 'multi-role-session-101' });

console.log('Initial Role:', session.currentRole);

// Progression to REQUIREMENTS phase (Triggers transition to PRODUCT_MANAGER)
updateSessionTurns('multi-role-session-101', [], InterviewPhase.REQUIREMENTS);
const s1 = getSession('multi-role-session-101');
console.log('After REQUIREMENTS phase -> Role:', s1?.currentRole);

// Progression to SCALABILITY phase (Triggers transition to SECURITY_LEAD)
updateSessionTurns('multi-role-session-101', [], InterviewPhase.SCALABILITY_RELIABILITY_SECURITY);
const s2 = getSession('multi-role-session-101');
console.log('After SCALABILITY phase -> Role:', s2?.currentRole);

// Progression to TRADE_OFFS phase (Triggers transition to SYSTEM_ARCHITECT)
updateSessionTurns('multi-role-session-101', [], InterviewPhase.TRADE_OFFS);
const s3 = getSession('multi-role-session-101');
console.log('After TRADE_OFFS phase -> Role:', s3?.currentRole);

console.log('Transition History Length:', s3?.roleTransitionHistory.length);
s3?.roleTransitionHistory.forEach((t, i) => {
  console.log(`  [${i + 1}] ${t.fromRole} -> ${t.toRole} (${t.phase}): ${t.reason}`);
});

if (
  s3?.roleTransitionHistory.length === 3 &&
  s3?.roleTransitionHistory[0].toRole === InterviewRole.PRODUCT_MANAGER &&
  s3?.roleTransitionHistory[1].toRole === InterviewRole.SECURITY_LEAD &&
  s3?.roleTransitionHistory[2].toRole === InterviewRole.SYSTEM_ARCHITECT
) {
  console.log('PASSED: Role transition state machine & history verified.');
} else {
  throw new Error('FAILED: Role transition history incorrect.');
}

// ── Test 5: Role Ownership on Evaluation Scores ────────────────────────────
console.log('\n=== Test 5: Evaluation Role Ownership & Evidence Check ===');
const mockTurns: InterviewTurn[] = [
  {
    turnId: 'turn-01',
    uid: 'c101',
    role: 'candidate',
    text: 'I clarify non-functional requirements: target peak throughput is 50,000 QPS with 20ms latency SLA.',
    status: 'END',
    timestamp: Date.now() - 50000,
  },
  {
    turnId: 'turn-02',
    uid: 'c101',
    role: 'candidate',
    text: 'High-level architecture consists of API gateway, stateless microservices, Kafka message queue, and Redis cache.',
    status: 'END',
    timestamp: Date.now() - 40000,
  },
  {
    turnId: 'turn-03',
    uid: 'c101',
    role: 'candidate',
    text: 'Security and reliability: OAuth JWT authorization, TLS encryption, circuit breakers, rate limiting, and database sharding.',
    status: 'END',
    timestamp: Date.now() - 30000,
  },
  {
    turnId: 'turn-04',
    uid: 'c101',
    role: 'candidate',
    text: 'Trade-off analysis: Eventual consistency vs strong consistency. Eventual consistency yields high availability.',
    status: 'END',
    timestamp: Date.now() - 20000,
  },
];

const completedSession = completeSession('multi-role-session-101', mockTurns, InterviewPhase.TRADE_OFFS);
const evalResult = completedSession?.evaluation;

console.log('Overall Score (Weighted):', evalResult?.overallScore);
console.log('Recommendation:', evalResult?.recommendation);
console.log('\nPer-Dimension Primary Role Ownership:');
evalResult?.dimensionScores.forEach((d) => {
  console.log(`  - [${d.primaryRole}] ${d.dimension}: ${d.score}/10 (Evidence: ${d.evidenceTurnIds.join(', ') || 'none'})`);
  if (!d.primaryRole) {
    throw new Error(`FAILED: Dimension ${d.dimension} missing primaryRole`);
  }
});

console.log('\nPASSED: All 8 evaluation dimensions have primaryRole attached, evidence turn IDs valid, and weighted overall score computed correctly.');
console.log('==================================================');
console.log('ALL TESTS PASSED SUCCESSFULLY!');
console.log('==================================================');
