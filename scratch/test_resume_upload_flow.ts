import { extractCandidateName, cleanResumeText } from '../lib/resume-parser';
import { buildPanelSystemPrompt } from '../lib/panel-orchestrator';
import { createSession, clearSessionStore } from '../lib/interview-session-store';
import { InterviewRole } from '../types/interview';

async function runResumeUploadTests() {
  console.log('==================================================');
  console.log('EchoSphere — Resume Upload & Context Grounding Tests');
  console.log('==================================================\n');

  // Test 1: Name extraction
  console.log('=== Test 1: Candidate Name Extraction ===');
  const sampleResume1 = `
    Jane Doe
    jane.doe@example.com | (555) 123-4567 | San Francisco, CA
    SUMMARY
    Senior Distributed Systems Engineer with 8 years experience building high-throughput event processing pipelines.
    EXPERIENCE
    Staff Software Engineer at Acme Corp (2020 - Present)
    - Architected real-time messaging system in Go and Kafka handling 500k QPS.
  `;
  const name1 = extractCandidateName(sampleResume1);
  console.log('Extracted name from sample 1:', name1);
  if (name1 !== 'Jane Doe') {
    throw new Error(`Expected "Jane Doe", got "${name1}"`);
  }

  const sampleResume2 = `
    Name: Vikramaditya Singh
    Email: vikram@example.com
    Profile: Cloud Architect specializing in AWS and Kubernetes.
  `;
  const name2 = extractCandidateName(sampleResume2);
  console.log('Extracted name from sample 2:', name2);
  if (name2 !== 'Vikramaditya Singh') {
    throw new Error(`Expected "Vikramaditya Singh", got "${name2}"`);
  }
  console.log('PASSED: Candidate name extraction verified.\n');

  // Test 2: Clean resume text
  console.log('=== Test 2: Clean Resume Text Sanitization ===');
  const cleaned = cleanResumeText(sampleResume1);
  if (cleaned.includes('jane.doe@example.com') || cleaned.includes('(555) 123-4567')) {
    throw new Error('cleanResumeText failed to strip email/phone numbers');
  }
  if (!cleaned.includes('Staff Software Engineer at Acme Corp')) {
    throw new Error('cleanResumeText lost technical content');
  }
  console.log('PASSED: Resume sanitization verified.\n');

  // Test 3: System Prompt Embedding
  console.log('=== Test 3: System Prompt Embedding Across All 3 Interviewers ===');
  const testName = 'Aarav Patel';
  const testRole = 'SYSTEM_ARCHITECT';
  const testJD = 'Lead Architect for Real-Time Streaming Analytics Engine';
  const testResume = '8+ years designing fault-tolerant Redis and Cassandra distributed storage layers.';

  for (const role of [InterviewRole.SYSTEM_ARCHITECT, InterviewRole.PRODUCT_MANAGER, InterviewRole.SECURITY_LEAD]) {
    const prompt = buildPanelSystemPrompt(role, {
      candidateName: testName,
      appliedRole: testRole,
      jobDescription: testJD,
      resumeText: testResume,
    });

    if (!prompt.includes(testName)) {
      throw new Error(`Prompt for role ${role} missing candidateName`);
    }
    if (!prompt.includes(testJD)) {
      throw new Error(`Prompt for role ${role} missing jobDescription`);
    }
    if (!prompt.includes(testResume)) {
      throw new Error(`Prompt for role ${role} missing resumeText`);
    }
    if (!prompt.includes('Candidate Resume Context')) {
      throw new Error(`Prompt for role ${role} missing Candidate Resume Context section`);
    }
  }
  console.log('PASSED: All 3 interviewers receive embedded candidate name, role, JD, and resume context.\n');

  // Test 4: Session store persistence of resumeText
  console.log('=== Test 4: Session Store Persistence of resumeText ===');
  clearSessionStore();
  const session = createSession({
    sessionId: 'session-resume-test-1',
    candidateName: testName,
    appliedRole: testRole,
    jobDescription: testJD,
    resumeText: testResume,
  });

  if (session.resumeText !== testResume) {
    throw new Error(`Expected session.resumeText to match, got "${session.resumeText}"`);
  }
  console.log('PASSED: Session store persists resumeText cleanly.\n');

  console.log('==================================================');
  console.log('ALL RESUME UPLOAD & CONTEXT GROUNDING TESTS PASSED!');
  console.log('==================================================');
}

runResumeUploadTests();
