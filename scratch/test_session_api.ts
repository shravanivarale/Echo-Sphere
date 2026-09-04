import {
  createSession,
  getSession,
  updateSessionTurns,
  completeSession,
  clearSessionStore,
} from '../lib/interview-session-store';
import { evaluateInterviewSession } from '../lib/evaluation';
import {
  InterviewPhase,
  InterviewSession,
  InterviewTurn,
} from '../types/interview';

clearSessionStore();

console.log('=== Test 1: Create Session ===');
const created = createSession({
  sessionId: 'test-session-999',
  channelName: 'test-session-999',
  candidateUid: '1001',
  agentId: 'agora-agent-01',
});
console.log('Created Session status:', created.status, 'startedAt:', created.startedAt);

console.log('\n=== Test 2: Get Session ===');
const retrieved = getSession('test-session-999');
console.log('Retrieved Session ID:', retrieved?.sessionId);

console.log('\n=== Test 3: Update Turns ===');
const mockTurns: InterviewTurn[] = [
  {
    turnId: 'turn-101',
    uid: '1001',
    role: 'candidate',
    text: 'I will start by clarifying functional requirements: peak QPS is 20,000, 99.9% availability SLA.',
    status: 'END',
    timestamp: Date.now() - 60000,
  },
  {
    turnId: 'turn-102',
    uid: '1001',
    role: 'candidate',
    text: 'For high-level architecture, we use an API gateway, microservices, and Redis cache with Kafka queue.',
    status: 'END',
    timestamp: Date.now() - 50000,
  },
  {
    turnId: 'turn-103',
    uid: '1001',
    role: 'candidate',
    text: 'For deep design, database sharding by user_id with B-tree index and read replicas.',
    status: 'END',
    timestamp: Date.now() - 40000,
  },
  {
    turnId: 'turn-104',
    uid: '1001',
    role: 'candidate',
    text: 'Scalability, reliability, and security: horizontal scaling, circuit breaker, failover, JWT auth rate limiting.',
    status: 'END',
    timestamp: Date.now() - 30000,
  },
  {
    turnId: 'turn-105',
    uid: '1001',
    role: 'candidate',
    text: 'Trade-off reasoning: eventual consistency versus strong consistency. We choose eventual consistency to optimize read latency.',
    status: 'END',
    timestamp: Date.now() - 20000,
  },
];

updateSessionTurns('test-session-999', mockTurns, InterviewPhase.TRADE_OFFS);
const updated = getSession('test-session-999');
console.log('Turns count:', updated?.turns.length, 'Phase:', updated?.currentPhase);

console.log('\n=== Test 4: Complete Session & Run Server Evaluation ===');
const completed = completeSession('test-session-999', mockTurns, InterviewPhase.TRADE_OFFS);
console.log('Completed Status:', completed?.status);
console.log('Overall Score (Weighted):', completed?.evaluation?.overallScore);
console.log('Recommendation:', completed?.evaluation?.recommendation);
console.log('Dimensions evaluated:', completed?.evaluation?.dimensionScores.length);
completed?.evaluation?.dimensionScores.forEach((d) => {
  console.log(`  - ${d.dimension}: ${d.score}/10 (Evidence: ${d.evidenceTurnIds.join(', ') || 'none'})`);
});

console.log('\n=== Test 5: Idempotency Check ===');
const reCompleted = completeSession('test-session-999', mockTurns, InterviewPhase.TRADE_OFFS);
const isIdempotent = JSON.stringify(completed) === JSON.stringify(reCompleted);
console.log('Idempotent Re-completion Match:', isIdempotent);

console.log('\n=== Test 6: Unknown Session 404 Check ===');
const unknown = getSession('non-existent-session-id');
console.log('Unknown session result:', unknown === undefined ? '404 (undefined)' : 'Found');
