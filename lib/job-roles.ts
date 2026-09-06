/**
 * EchoSphere Job Role Catalog
 *
 * Single authoritative source for all 25 interview role entries.
 * Consumed by: QuickstartPreCallCard (UI), panel-orchestrator (AI system prompt).
 *
 * Duplicate role names (e.g. two "Backend Developer" entries) receive:
 *   - stable unique `id`s (backend-developer-1 / backend-developer-2)
 *   - a `profileLabel` for UI disambiguation ("Backend Developer — Profile 1")
 *   - `displayName` stays as the exact role name from the document
 */

export interface JobRoleDefinition {
  /** Stable unique identifier (kebab-case, numeric suffix for duplicates) */
  id: string;
  /** Exact role name from the document */
  displayName: string;
  /**
   * UI-only label used in the dropdown when disambiguation is needed.
   * If absent, the dropdown shows `displayName` directly.
   */
  profileLabel?: string;
  /** Full job description text from the document */
  defaultJobDescription: string;
  /** Ordered list of required skills/technologies from the document */
  requirements: string[];
  /** Interview focus areas from the document (empty string if not specified) */
  interviewFocus: string;
}

export const JOB_ROLE_CATALOG: JobRoleDefinition[] = [
  // ── 1. Software Engineer ────────────────────────────────────────────────────
  {
    id: 'software-engineer',
    displayName: 'Software Engineer',
    defaultJobDescription:
      'We are looking for a Software Engineer to design, develop, test, and maintain scalable software applications. The candidate should have strong problem-solving skills and a solid understanding of data structures, algorithms, object-oriented programming, databases, APIs, and software development practices.',
    requirements: [
      'Python, Java, or C++',
      'Data structures and algorithms',
      'OOP/design principles',
      'SQL/databases',
      'REST APIs',
      'Git',
      'Debugging/testing',
    ],
    interviewFocus: 'DSA + coding + system reasoning + communication',
  },

  // ── 2. Data Scientist ────────────────────────────────────────────────────────
  {
    id: 'data-scientist',
    displayName: 'Data Scientist',
    defaultJobDescription:
      'Transform large datasets into actionable insights using statistical analysis and machine learning; build predictive models, evaluate performance, communicate findings to technical and non-technical stakeholders.',
    requirements: [
      'Python',
      'Pandas, NumPy, scikit-learn',
      'Statistics/probability',
      'Machine learning',
      'SQL',
      'Data visualization',
      'Model evaluation',
    ],
    interviewFocus: 'ML theory + SQL + Python + case study + communication',
  },

  // ── 3. Machine Learning Engineer ─────────────────────────────────────────────
  {
    id: 'machine-learning-engineer',
    displayName: 'Machine Learning Engineer',
    defaultJobDescription:
      'Develop, optimize, and deploy ML models; understand the full ML lifecycle from preprocessing/model development to deployment/monitoring.',
    requirements: [
      'Python',
      'Machine learning',
      'TensorFlow/PyTorch',
      'SQL',
      'APIs',
      'Model deployment',
      'Docker',
      'Basic cloud',
    ],
    interviewFocus: 'ML + coding + debugging + deployment/system design',
  },

  // ── 4. Generative AI Engineer (Profile 1) ────────────────────────────────────
  {
    id: 'generative-ai-engineer-1',
    displayName: 'Generative AI Engineer',
    profileLabel: 'Generative AI Engineer — Profile 1',
    defaultJobDescription:
      'Build applications using LLMs, RAG, AI agents, and conversational AI.',
    requirements: [
      'Python',
      'LLM APIs',
      'Prompt engineering',
      'RAG',
      'Embeddings/vector databases',
      'AI agents',
      'REST APIs',
      'Basic ML/NLP',
    ],
    interviewFocus: 'LLM reasoning + coding + architecture + practical AI problem',
  },

  // ── 5. Backend Developer (Profile 1) ─────────────────────────────────────────
  {
    id: 'backend-developer-1',
    displayName: 'Backend Developer',
    profileLabel: 'Backend Developer — Profile 1',
    defaultJobDescription:
      'Build reliable/scalable server-side applications and APIs; databases, authentication, APIs, business logic, distributed services.',
    requirements: [
      'Python/Java/Node.js',
      'REST APIs',
      'SQL',
      'Database design',
      'Authentication',
      'Git',
      'Docker',
      'Basic system design',
    ],
    interviewFocus: 'API design + SQL + coding + debugging + system design',
  },

  // ── 6. Full-Stack Developer (Profile 1) ──────────────────────────────────────
  {
    id: 'full-stack-developer-1',
    displayName: 'Full-Stack Developer',
    profileLabel: 'Full-Stack Developer — Profile 1',
    defaultJobDescription:
      'Build complete web apps across frontend/backend; UI, APIs, databases, service integrations.',
    requirements: [
      'HTML/CSS/JavaScript',
      'React',
      'Python/Node.js/Java',
      'REST APIs',
      'SQL',
      'Git',
      'Authentication',
    ],
    interviewFocus: 'Frontend + backend + coding + architecture',
  },

  // ── 7. DevOps Engineer (Profile 1) ───────────────────────────────────────────
  {
    id: 'devops-engineer-1',
    displayName: 'DevOps Engineer',
    profileLabel: 'DevOps Engineer — Profile 1',
    defaultJobDescription:
      'Automate software delivery and maintain reliable development/production environments.',
    requirements: [
      'Linux',
      'Git',
      'Docker',
      'Kubernetes',
      'CI/CD',
      'Cloud platforms',
      'Shell scripting',
      'Monitoring',
    ],
    interviewFocus: 'Troubleshooting + Linux + cloud + practical scenarios',
  },

  // ── 8. Cybersecurity Analyst (Profile 1) ─────────────────────────────────────
  {
    id: 'cybersecurity-analyst-1',
    displayName: 'Cybersecurity Analyst',
    profileLabel: 'Cybersecurity Analyst — Profile 1',
    defaultJobDescription:
      'Monitor systems, identify threats, investigate incidents, and protect applications/infrastructure.',
    requirements: [
      'Networking',
      'Linux',
      'Security fundamentals',
      'SIEM',
      'Vulnerability assessment',
      'Incident response',
      'Authentication/access control',
    ],
    interviewFocus: 'Scenario-based security questions + networking + problem solving',
  },

  // ── 9. Frontend Developer (Profile 1) ────────────────────────────────────────
  {
    id: 'frontend-developer-1',
    displayName: 'Frontend Developer',
    profileLabel: 'Frontend Developer — Profile 1',
    defaultJobDescription:
      'Create responsive, accessible, high-performance web apps.',
    requirements: [
      'HTML',
      'CSS',
      'JavaScript',
      'React',
      'REST APIs',
      'Git',
      'Responsive design',
      'Basic web performance',
    ],
    interviewFocus: 'Live coding + debugging + JavaScript reasoning',
  },

  // ── 10. Data Analyst ──────────────────────────────────────────────────────────
  {
    id: 'data-analyst',
    displayName: 'Data Analyst',
    defaultJobDescription:
      'Analyze business data, identify trends, create dashboards, and communicate actionable insights.',
    requirements: [
      'SQL',
      'Python',
      'Excel',
      'Statistics',
      'Pandas',
      'Data visualization',
      'Power BI/Tableau',
    ],
    interviewFocus: 'SQL + data interpretation + Python + business case',
  },

  // ── 11. Backend Developer (Profile 2) ────────────────────────────────────────
  {
    id: 'backend-developer-2',
    displayName: 'Backend Developer',
    profileLabel: 'Backend Developer — Profile 2',
    defaultJobDescription:
      'Build scalable server-side applications, APIs, and database systems that power modern web apps.',
    requirements: [
      'Python/Java/Node.js',
      'REST APIs',
      'SQL',
      'Database design',
      'Authentication',
      'Git',
      'Docker',
      'Basic system design',
    ],
    interviewFocus: 'API design + SQL + backend coding + debugging + system design',
  },

  // ── 12. Frontend Developer (Profile 2) ───────────────────────────────────────
  {
    id: 'frontend-developer-2',
    displayName: 'Frontend Developer',
    profileLabel: 'Frontend Developer — Profile 2',
    defaultJobDescription:
      'Create responsive, accessible, interactive web apps with focus on UX/performance.',
    requirements: [
      'HTML',
      'CSS',
      'JavaScript',
      'React',
      'REST APIs',
      'Git',
      'Responsive design',
      'Web performance',
    ],
    interviewFocus: 'JavaScript + React + frontend coding + debugging + UI problem solving',
  },

  // ── 13. Full-Stack Developer (Profile 2) ─────────────────────────────────────
  {
    id: 'full-stack-developer-2',
    displayName: 'Full-Stack Developer',
    profileLabel: 'Full-Stack Developer — Profile 2',
    defaultJobDescription:
      'Design and develop complete web applications across frontend, backend, APIs, and databases.',
    requirements: [
      'HTML/CSS/JavaScript',
      'React',
      'Python/Node.js/Java',
      'REST APIs',
      'SQL',
      'Git',
      'Authentication',
      'Basic cloud knowledge',
    ],
    interviewFocus: 'Full-stack coding + APIs + databases + debugging + architecture',
  },

  // ── 14. DevOps Engineer (Profile 2) ──────────────────────────────────────────
  {
    id: 'devops-engineer-2',
    displayName: 'DevOps Engineer',
    profileLabel: 'DevOps Engineer — Profile 2',
    defaultJobDescription:
      'Automate software development/testing/deployment/infrastructure while ensuring reliable production.',
    requirements: [
      'Linux',
      'Git',
      'Docker',
      'Kubernetes',
      'CI/CD',
      'AWS/Azure/GCP',
      'Shell scripting',
      'Monitoring',
    ],
    interviewFocus: 'Linux + troubleshooting + CI/CD + Docker + cloud scenarios',
  },

  // ── 15. Cloud Engineer ────────────────────────────────────────────────────────
  {
    id: 'cloud-engineer',
    displayName: 'Cloud Engineer',
    defaultJobDescription:
      'Design, deploy, and maintain scalable, secure cloud infrastructure/services.',
    requirements: [
      'AWS/Azure/GCP',
      'Linux',
      'Networking',
      'Docker',
      'Kubernetes',
      'Infrastructure as Code',
      'Security fundamentals',
      'Monitoring',
    ],
    interviewFocus: 'Cloud architecture + networking + troubleshooting + deployment scenarios',
  },

  // ── 16. Cybersecurity Analyst (Profile 2) ────────────────────────────────────
  {
    id: 'cybersecurity-analyst-2',
    displayName: 'Cybersecurity Analyst',
    profileLabel: 'Cybersecurity Analyst — Profile 2',
    defaultJobDescription:
      'Monitor systems, investigate incidents, identify vulnerabilities, and protect organizational infrastructure.',
    requirements: [
      'Networking',
      'Linux',
      'Cybersecurity fundamentals',
      'SIEM',
      'Threat detection',
      'Incident response',
      'Authentication',
      'Vulnerability assessment',
    ],
    interviewFocus: 'Security scenarios + networking + threat analysis + incident response',
  },

  // ── 17. Network Engineer ──────────────────────────────────────────────────────
  {
    id: 'network-engineer',
    displayName: 'Network Engineer',
    defaultJobDescription:
      'Design, configure, troubleshoot, and maintain reliable computer networks and communication infrastructure.',
    requirements: [
      'TCP/IP',
      'OSI model',
      'Routing',
      'Switching',
      'DNS/DHCP',
      'Firewalls',
      'VPN',
      'Network troubleshooting',
    ],
    interviewFocus: 'Networking concepts + troubleshooting + scenario-based questions',
  },

  // ── 18. Database Administrator ────────────────────────────────────────────────
  {
    id: 'database-administrator',
    displayName: 'Database Administrator',
    defaultJobDescription:
      'Manage, optimize, secure, and maintain databases, high availability, and reliable data access.',
    requirements: [
      'SQL',
      'MySQL/PostgreSQL/Oracle',
      'Database design',
      'Indexing',
      'Query optimization',
      'Backup/recovery',
      'Transactions',
      'Database security',
    ],
    interviewFocus: 'SQL + query optimization + database design + troubleshooting',
  },

  // ── 19. QA / Test Engineer ────────────────────────────────────────────────────
  {
    id: 'qa-test-engineer',
    displayName: 'QA / Test Engineer',
    defaultJobDescription:
      'Ensure software quality by designing test cases, identifying defects, and validating applications before deployment.',
    requirements: [
      'Manual testing',
      'Test case design',
      'Bug tracking',
      'API testing',
      'SQL',
      'Automation testing',
      'Selenium/Playwright',
      'SDLC/STLC',
    ],
    interviewFocus: 'Test-case design + debugging + API testing + automation + practical scenarios',
  },

  // ── 20. MLOps Engineer ────────────────────────────────────────────────────────
  {
    id: 'mlops-engineer',
    displayName: 'MLOps Engineer',
    defaultJobDescription:
      'Build infrastructure/workflows for deploying, monitoring, and maintaining ML models in production.',
    requirements: [
      'Python',
      'ML fundamentals',
      'Docker',
      'Kubernetes',
      'CI/CD',
      'Cloud platforms',
      'Model deployment',
      'Model monitoring',
    ],
    interviewFocus: 'ML deployment + Docker + CI/CD + monitoring + production troubleshooting',
  },

  // ── 21. NLP Engineer ──────────────────────────────────────────────────────────
  {
    id: 'nlp-engineer',
    displayName: 'NLP Engineer',
    defaultJobDescription:
      'Develop systems that understand, process, and generate human language using modern ML/deep learning.',
    requirements: [
      'Python',
      'NLP fundamentals',
      'Transformers',
      'LLMs',
      'Tokenization',
      'Embeddings',
      'PyTorch/TensorFlow',
      'Machine learning',
    ],
    interviewFocus: 'NLP theory + Python coding + transformers + practical NLP problems',
  },

  // ── 22. Computer Vision Engineer ─────────────────────────────────────────────
  {
    id: 'computer-vision-engineer',
    displayName: 'Computer Vision Engineer',
    defaultJobDescription:
      'Develop systems that analyze and interpret images/videos using ML/deep learning.',
    requirements: [
      'Python',
      'OpenCV',
      'CNNs',
      'PyTorch/TensorFlow',
      'Image preprocessing',
      'Object detection',
      'Image classification',
      'Deep learning',
    ],
    interviewFocus: 'Computer vision concepts + Python + model design + image-processing problem',
  },

  // ── 23. Generative AI Engineer (Profile 2) ───────────────────────────────────
  {
    id: 'generative-ai-engineer-2',
    displayName: 'Generative AI Engineer',
    profileLabel: 'Generative AI Engineer — Profile 2',
    defaultJobDescription:
      'Build applications using LLMs, RAG, AI agents, and conversational AI.',
    requirements: [
      'Python',
      'LLM APIs',
      'Prompt engineering',
      'RAG',
      'Embeddings',
      'Vector databases',
      'AI agents',
      'REST APIs',
    ],
    interviewFocus: 'LLM concepts + RAG + agent design + Python + practical AI architecture',
  },

  // ── 24. AI Engineer ───────────────────────────────────────────────────────────
  {
    id: 'ai-engineer',
    displayName: 'AI Engineer',
    defaultJobDescription:
      'Design and deploy intelligent applications using ML, deep learning, generative AI, and modern AI APIs.',
    requirements: [
      'Python',
      'ML',
      'Deep learning',
      'LLMs',
      'APIs',
      'PyTorch/TensorFlow',
      'Model evaluation',
      'AI system design',
    ],
    interviewFocus: 'AI/ML fundamentals + coding + model reasoning + AI system design',
  },

  // ── 25. Technical Support Engineer ───────────────────────────────────────────
  {
    id: 'technical-support-engineer',
    displayName: 'Technical Support Engineer',
    defaultJobDescription:
      'Diagnose technical issues, troubleshoot software/infrastructure problems, and provide effective solutions to customers/internal teams.',
    requirements: [
      'Linux/Windows',
      'Networking',
      'SQL basics',
      'Troubleshooting',
      'APIs',
      'Cloud basics',
      'Log analysis',
      'Communication skills',
    ],
    interviewFocus: '',
  },
];

/**
 * Returns all 25 configured job roles in document order.
 */
export function getAllJobRoles(): JobRoleDefinition[] {
  return JOB_ROLE_CATALOG;
}

/**
 * Retrieves a job role definition by its stable role ID.
 * Defaults to the first role if not found.
 */
export function getJobRoleById(roleId?: string): JobRoleDefinition {
  if (!roleId) return JOB_ROLE_CATALOG[0];
  const found = JOB_ROLE_CATALOG.find((r) => r.id === roleId);
  return found ?? JOB_ROLE_CATALOG[0];
}
