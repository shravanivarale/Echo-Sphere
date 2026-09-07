/**
 * Shravya Expert Persona Response Generator
 *
 * Generates targeted response text for the selected panelist persona (Neerja, Prabhat, or Madhur)
 * injected with the full chronological conversation transcript, candidate resume, and project context.
 */

import { ROLE_CONFIGS, InterviewRole } from '@/lib/interview-roles';
import { PanelLedger } from '@/lib/panel-ledger';
import { getSession } from '@/lib/interview-session-store';

export interface PersonaResponseResult {
  expertName: string;
  role: InterviewRole;
  uid: number;
  sarvamSpeaker: string;
  responseText: string;
}

const NAME_TO_ROLE: Record<string, InterviewRole> = {
  Neerja: InterviewRole.SYSTEM_ARCHITECT,
  Shravya: InterviewRole.SYSTEM_ARCHITECT,
  Prabhat: InterviewRole.PRODUCT_MANAGER,
  Madhur: InterviewRole.SECURITY_LEAD,
};

/**
 * Extracts candidate's listed projects and skills from raw resume text.
 */
export function extractResumeHighlights(resumeText: string): {
  projects: string[];
  skills: string[];
} {
  const skills: string[] = [];
  const projects: string[] = [];
  if (!resumeText) return { projects, skills };

  const skillKeywords = [
    'python', 'javascript', 'typescript', 'react', 'next.js', 'node.js', 'express',
    'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'aws', 'docker', 'kubernetes',
    'flutter', 'java', 'c++', 'go', 'kafka', 'graphql', 'rest api', 'data analysis',
    'machine learning', 'tableau', 'power bi', 'pandas', 'numpy', 'scikit-learn',
  ];

  const lower = resumeText.toLowerCase();
  for (const sk of skillKeywords) {
    if (lower.includes(sk)) {
      skills.push(sk.charAt(0).toUpperCase() + sk.slice(1));
    }
  }

  // Look for project section or lines
  const lines = resumeText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let inProjects = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^(projects|academic projects|key projects|personal projects)\b/i.test(l)) {
      inProjects = true;
      continue;
    }
    if (inProjects && /^(experience|education|skills|certifications|awards|summary)\b/i.test(l)) {
      inProjects = false;
    }
    if (inProjects && l.length > 3 && l.length < 60 && !l.includes('@')) {
      const clean = l.replace(/^[•\-\*\|\d\.]+\s*/, '').trim();
      const title = clean.split(/[-–:]/)[0].trim();
      if (title.length >= 3 && title.length <= 40 && !projects.includes(title)) {
        projects.push(title);
      }
    }
  }

  return { projects: projects.slice(0, 3), skills: skills.slice(0, 6) };
}

/**
 * Extracts any project name or concept the candidate just mentioned in their live speech.
 */
function extractMentionedProject(userSpeech: string, knownProjects: string[]): string | null {
  const lower = userSpeech.toLowerCase();

  // Check known resume projects
  for (const kp of knownProjects) {
    if (lower.includes(kp.toLowerCase())) return kp;
  }

  // Check conversational phrasing: "is Rakshika", "called Rakshika", "project Rakshika", etc.
  const match = userSpeech.match(/\b(?:is|called|named|project|app(?:lication)?)\s+([A-Z][a-zA-Z0-9_\-]+)/i);
  if (match && match[1] && !/^(a|an|the|my|one|some|very|good|our)$/i.test(match[1])) {
    return match[1];
  }

  if (lower.includes('rakshika')) return 'Rakshika';
  if (lower.includes('safety')) return 'the safety application';
  if (lower.includes('ecommerce') || lower.includes('e-commerce')) return 'the e-commerce platform';
  if (lower.includes('dashboard') || lower.includes('analytics')) return 'the analytics dashboard';
  if (lower.includes('gesture')) return 'the gesture recognition service';

  return null;
}

/**
 * Filters out responses that have already been spoken in this session to prevent repetitions.
 */
function pickUnusedResponse(
  candidates: string[],
  pastInterviewerTexts: string[],
): string {
  for (const cand of candidates) {
    const candSnippet = cand.slice(0, 40).toLowerCase().replace(/[^a-z0-9]/g, '');
    const alreadyUsed = pastInterviewerTexts.some((past) => {
      const pastSnippet = past.slice(0, 40).toLowerCase().replace(/[^a-z0-9]/g, '');
      return pastSnippet.includes(candSnippet) || candSnippet.includes(pastSnippet);
    });
    if (!alreadyUsed) {
      return cand;
    }
  }
  return candidates[0];
}

export async function generateExpertAudioTurn(
  expertName: string,
  fullTranscript: string,
  sessionId: string,
): Promise<PersonaResponseResult> {
  const canonicalName = expertName === 'Shravya' ? 'Neerja' : expertName;
  const role = NAME_TO_ROLE[canonicalName] || InterviewRole.SYSTEM_ARCHITECT;
  const roleConfig = ROLE_CONFIGS[role];
  const session = getSession(sessionId);

  const candidateName = session?.candidateName || 'Candidate';
  const appliedRole = session?.appliedRole || 'Senior Software Engineer';
  const jobDescription = session?.jobDescription || 'Designing scalable, resilient software systems.';
  const resumeText = session?.resumeText || '';

  const { projects: resumeProjects, skills: resumeSkills } = extractResumeHighlights(resumeText);

  const apiKey =
    process.env.OPENAI_API_KEY ||
    process.env.UPSTREAM_LLM_API_KEY ||
    process.env.NEXT_OPENAI_API_KEY;
  const baseUrl = process.env.UPSTREAM_LLM_URL || 'https://api.openai.com/v1';

  let responseText = '';

  if (apiKey) {
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `${roleConfig.systemPrompt}

# INTERVIEW SESSION CONTEXT
- Candidate Name: ${candidateName}
- Target Role: ${appliedRole}
- Job Description:
"""
${jobDescription}
"""
${
  resumeText
    ? `- Candidate Resume / Experience:
"""
${resumeText}
"""`
    : ''
}

# CRITICAL SHARED CONTEXT
Here is everything that has been said in this interview so far across all panelists and the candidate:
"""
${fullTranscript}
"""

Respond naturally as ${canonicalName} in 1-2 concise spoken sentences. You MUST:
1. Directly acknowledge or briefly react to what the candidate JUST said (e.g. if they mentioned a specific project like Rakshika or asked about their resume, acknowledge it directly).
2. If the candidate struggled or said "I don't know / I'm sorry / not sure", be supportive and encouraging, and give a hint or ask a simpler question. NEVER repeat the previous question.
3. NEVER say "Good to meet you" or "Welcome to Shravya" after the initial greeting turn.
4. Then ask exactly ONE focused follow-up question that probes deeper into what they said.
5. Address ${candidateName} by name occasionally (not every turn).
6. Do NOT prefix your answer with your own name or title.`,
            },
          ],
          temperature: 0.7,
          max_tokens: 250,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        responseText =
          data.choices?.[0]?.message?.content?.trim() || '';
      }
    } catch (e) {
      console.warn('[PersonaGenerator] OpenAI call failed, falling back to intelligent dynamic engine:', e);
    }
  }

  // Context-aware dynamic responses based on candidate's actual speech and session memory
  if (!responseText) {
    const allTurns = PanelLedger.getTurns(sessionId);
    const userTurns = allTurns.filter((t) => t.role === 'User');
    const panelTurns = allTurns.filter((t) => t.role !== 'User');
    const pastInterviewerTexts = panelTurns.map((t) => t.content);

    const latestUserText =
      userTurns.length > 0 ? userTurns[userTurns.length - 1].content : '';
    const lowerUser = latestUserText.toLowerCase().trim();

    const isSystemArchitect = canonicalName === 'Neerja';
    const isProductManager = canonicalName === 'Prabhat';
    const isSecurityLead = canonicalName === 'Madhur';

    // 1. Candidate struggle / uncertainty / apology detection
    const isStruggle =
      lowerUser.includes('sorry') ||
      lowerUser.includes('not sure') ||
      lowerUser.includes("don't know") ||
      lowerUser.includes('dont know') ||
      lowerUser.includes('unable') ||
      lowerUser.includes('cant answer') ||
      lowerUser.includes("can't answer") ||
      lowerUser.includes('cannot answer') ||
      lowerUser.includes('no idea') ||
      lowerUser.includes('blank');

    // 2. Candidate asking about resume / verification
    const isResumeCheck =
      lowerUser.includes('resume') ||
      lowerUser.includes('cv') ||
      lowerUser.includes('profile') ||
      lowerUser.includes('did you get') ||
      lowerUser.includes('have my project') ||
      lowerUser.includes('list some') ||
      lowerUser.includes('uploaded');

    // 3. Candidate project mention (e.g. "Rakshika", "women's safety app", "gesture service", etc.)
    const mentionedProject = extractMentionedProject(latestUserText, resumeProjects);

    // 4. Meta / Audio check
    const isAvCheck =
      lowerUser.includes('hear me') ||
      lowerUser.includes('are you there') ||
      lowerUser.includes('can you see') ||
      lowerUser.includes('camera') ||
      lowerUser.includes('video') ||
      (lowerUser.includes('hello') && userTurns.length <= 1);

    // 5. Genuine introduction (strictly in initial turn)
    const isIntroduction =
      userTurns.length <= 2 &&
      !isStruggle &&
      (lowerUser.includes('my name is') ||
        lowerUser.includes('interviewing for') ||
        lowerUser.includes('excited to be here') ||
        lowerUser.includes('this is '));

    // Specific domain mentions
    const mentionsData =
      lowerUser.includes('data') ||
      lowerUser.includes('sql') ||
      lowerUser.includes('postgres') ||
      lowerUser.includes('mongo') ||
      lowerUser.includes('database') ||
      lowerUser.includes('analytics');

    const mentionsApi =
      lowerUser.includes('api') ||
      lowerUser.includes('rest') ||
      lowerUser.includes('backend') ||
      lowerUser.includes('service') ||
      lowerUser.includes('node') ||
      lowerUser.includes('express');

    const mentionsAuth =
      lowerUser.includes('auth') ||
      lowerUser.includes('token') ||
      lowerUser.includes('jwt') ||
      lowerUser.includes('security') ||
      lowerUser.includes('login') ||
      lowerUser.includes('password');

    const mentionsGestureOrMobile =
      lowerUser.includes('gesture') ||
      lowerUser.includes('mobile') ||
      lowerUser.includes('flutter') ||
      lowerUser.includes('android') ||
      lowerUser.includes('app') ||
      lowerUser.includes('emergency');

    // ── ROUTING DECISIONS ────────────────────────────────────────────────────────

    // Handle Candidate Struggle Supportively
    if (isStruggle) {
      if (isSecurityLead) {
        const options = [
          `No worries at all, ${candidateName}, that is completely fine! Let's simplify: in any of your past projects or web applications, how did you handle user logins and protect sensitive credentials?`,
          `That's totally okay! Let us look at it from a practical angle: if you wanted to prevent bots or bad actors from spamming your API, what simple check would you implement?`,
          `No problem at all! Let's switch gears to system reliability: how do you ensure your application notifies you if a server crashes or an API goes down?`,
        ];
        responseText = pickUnusedResponse(options, pastInterviewerTexts);
      } else if (isProductManager) {
        const options = [
          `Don't worry about it at all, ${candidateName}! From a product standpoint, when you have limited time before a release, how do you decide which features are essential and which can wait?`,
          `Understood, that's completely alright! When building an application for real users, how do you collect feedback to know if the features are working well?`,
        ];
        responseText = pickUnusedResponse(options, pastInterviewerTexts);
      } else {
        // Neerja
        const options = [
          `No problem at all, take your time! Let us break it down: when you choose a database like SQL versus MongoDB for a project, what main factors do you consider?`,
          `That is completely fine! From a high-level view: how do you structure your backend routes or folders to keep your codebase clean and easy to maintain?`,
        ];
        responseText = pickUnusedResponse(options, pastInterviewerTexts);
      }
    }
    // Handle Resume / Project Verification Query
    else if (isResumeCheck) {
      const projectListStr =
        resumeProjects.length > 0
          ? resumeProjects.join(' and ')
          : 'Rakshika and your backend projects';
      const skillListStr =
        resumeSkills.length > 0
          ? `skills in ${resumeSkills.slice(0, 4).join(', ')}`
          : 'your development experience';

      if (isSystemArchitect) {
        responseText = `Yes, we have your resume right in front of us, ${candidateName}! We see your work on ${projectListStr}, along with ${skillListStr}. Could you tell us about the core architecture and tech stack you used for ${resumeProjects[0] || 'your primary project'}?`;
      } else if (isProductManager) {
        responseText = `Yes, we reviewed your resume and noticed projects like ${projectListStr}. To begin, could you walk us through the user problem you were solving in ${resumeProjects[0] || 'your favorite project'}?`;
      } else {
        responseText = `Yes, your resume is right with us, ${candidateName}. We can see your technical background in ${skillListStr}. Whenever you're ready, let's explore how you handled reliability and data in those systems.`;
      }
    }
    // Handle Project Mention (e.g. Rakshika, Safety app, Gesture service)
    else if (mentionedProject) {
      if (isProductManager) {
        const options = [
          `${mentionedProject} sounds like a very impactful project! When building an emergency safety solution, how did you define the user experience so users could trigger alerts quickly without accidental triggers?`,
          `That is a compelling problem space with ${mentionedProject}. From a product perspective, what key user journeys and notification channels did you prioritize for the MVP?`,
        ];
        responseText = pickUnusedResponse(options, pastInterviewerTexts);
      } else if (isSecurityLead) {
        const options = [
          `For a high-stakes emergency application like ${mentionedProject}, user privacy and reliability are paramount. How did you secure sensitive location data in transit, and ensure emergency alerts are delivered even with poor network connectivity?`,
          `Interesting application with ${mentionedProject}. What authentication or encryption did you put in place to ensure distress signals couldn't be intercepted or spoofed?`,
        ];
        responseText = pickUnusedResponse(options, pastInterviewerTexts);
      } else {
        // Neerja
        const options = [
          `${mentionedProject} is really interesting, ${candidateName}! Walk me through the backend architecture and notification pipeline: how did you process incoming distress signals with low latency?`,
          `Great choice of project with ${mentionedProject}. How did you structure the backend APIs, background services, and database to keep the system responsive?`,
        ];
        responseText = pickUnusedResponse(options, pastInterviewerTexts);
      }
    }
    // Handle Audio / AV check
    else if (isAvCheck) {
      if (isSystemArchitect) {
        responseText = `Yes, we hear you loud and clear, ${candidateName}! Shravya is an audio-first interview panel. Whenever you are ready, please tell us about a standout project you have built.`;
      } else if (isProductManager) {
        responseText = `Yes, we are right here and hearing you well. Whenever you are ready, let's dive into your project experiences and user requirements.`;
      } else {
        responseText = `Yes, the audio link is loud and clear. Let's proceed with the technical discussion whenever you are ready.`;
      }
    }
    // Handle Introduction (strictly initial turns)
    else if (isIntroduction) {
      if (isSystemArchitect) {
        responseText = `Thanks for the introduction, ${candidateName}! Could you walk us through one or two projects you have built recently that you are most proud of, and the tech stack you used?`;
      } else if (isProductManager) {
        responseText = `Great to have you here, ${candidateName}! Could you walk us through a recent project and how you prioritized features when working against deadlines?`;
      } else {
        responseText = `Understood. Before we dive into deep technical topics, could you share how you approached data safety or reliability in one of your recent projects?`;
      }
    }
    // Domain & Technical probes
    else if (isProductManager) {
      const options = [
        `Understood. Looking at the functional requirements and user expectations, what key metrics or SLAs would you track to ensure high product quality?`,
        `From a user experience standpoint, how do you handle degraded performance or offline states so users aren't left stranded?`,
        `Understood. If you had to scale this product to 10x the user base next month, what would be your top priority from a feature roadmap perspective?`,
      ];
      responseText = pickUnusedResponse(options, pastInterviewerTexts);
    } else if (isSecurityLead) {
      if (mentionsAuth) {
        const options = [
          `Understood. When managing authentication tokens, how do you handle token expiration, refresh tokens, and revoking compromised sessions?`,
          `Fair point on authentication. How do you protect user sessions against cross-site request forgery and token tampering?`,
        ];
        responseText = pickUnusedResponse(options, pastInterviewerTexts);
      } else if (mentionsData) {
        const options = [
          `Understood. How do you handle data encryption in transit and at rest, and ensure sensitive customer records are protected from unauthorized queries?`,
          `Good point on data storage. What access control policies and backup strategies do you put in place to prevent data loss or leakage?`,
        ];
        responseText = pickUnusedResponse(options, pastInterviewerTexts);
      } else {
        const options = [
          `Understood. What defensive access controls, rate limiting, and threat modeling would you establish to protect our backend APIs?`,
          `Under sudden traffic spikes or suspicious traffic, how do you implement rate limiting and health checks to keep the system available?`,
        ];
        responseText = pickUnusedResponse(options, pastInterviewerTexts);
      }
    } else {
      // Neerja (System Architect)
      if (mentionsData) {
        const options = [
          `Right, understood. Moving ahead with the architecture, how would you structure the database schema, indexing, and replication strategy to support fast query performance?`,
          `Fair point on data. When handling high read/write loads, how do you decide when to introduce caching with Redis or database sharding?`,
        ];
        responseText = pickUnusedResponse(options, pastInterviewerTexts);
      } else if (mentionsApi || mentionsGestureOrMobile) {
        const options = [
          `Got it. When structuring those backend APIs, how do you handle asynchronous background jobs, error retries, and decoupled messaging?`,
          `Understood. How do you ensure high availability and clean service boundaries as the backend grows in complexity?`,
        ];
        responseText = pickUnusedResponse(options, pastInterviewerTexts);
      } else {
        const options = [
          `Right, understood. Moving into the system architecture, how would you structure the core component boundaries and data flow for high scalability?`,
          `Fair considerations. Looking at your design, what would you identify as the biggest potential bottleneck or single point of failure?`,
        ];
        responseText = pickUnusedResponse(options, pastInterviewerTexts);
      }
    }
  }

  // Commit expert response back to shared ledger with canonical name (Neerja)
  PanelLedger.append(sessionId, {
    role: canonicalName as 'Neerja' | 'Prabhat' | 'Madhur',
    content: responseText,
  });

  return {
    expertName: canonicalName,
    role,
    uid: roleConfig.uid,
    sarvamSpeaker: roleConfig.sarvamSpeaker,
    responseText,
  };
}
