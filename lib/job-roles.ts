/**
 * EchoSphere Job Role Catalog (Step 7C)
 *
 * Centralized, extensible repository of job roles for candidate interviews.
 * Allows adding new job roles without modifying React components or landing page logic.
 */

export interface JobRoleDefinition {
  id: string;
  displayName: string;
  defaultJobDescription: string;
  roleContext?: string;
}

export const JOB_ROLE_CATALOG: JobRoleDefinition[] = [
  {
    id: 'SYSTEM_ARCHITECT',
    displayName: 'Staff System Architect',
    defaultJobDescription: `We are looking for a Staff System Architect to lead the design of our global real-time event streaming and data processing infrastructure handling over 100M daily active users.

Key Responsibilities:
- Design distributed microservices, event-driven architectures, and high-throughput data pipelines.
- Evaluate trade-offs between consistency, latency, and availability across multi-region deployments.
- Establish architectural standards for database sharding, caching, and message queues (Kafka/RabbitMQ).
- Drive reliability, horizontal scalability, and disaster recovery planning.`,
    roleContext: 'Focus on global distribution, distributed storage trade-offs, and microservices architecture.',
  },
  {
    id: 'BACKEND_LEAD',
    displayName: 'Lead Backend Engineer',
    defaultJobDescription: `We are seeking a Lead Backend Engineer to architect high-performance REST and gRPC microservices for our core transactional platform.

Key Responsibilities:
- Design scalable backend services handling high concurrent read/write traffic.
- Optimize relational and NoSQL database schemas, indexing, and query performance.
- Implement rate limiting, distributed caching (Redis), and asynchronous task queues.
- Ensure service security, API authentication, and robust error handling.`,
    roleContext: 'Focus on API design, database performance, caching strategy, and concurrency.',
  },
  {
    id: 'FRONTEND_ARCHITECT',
    displayName: 'Principal Frontend Architect',
    defaultJobDescription: `We are hiring a Principal Frontend Architect to oversee the architecture of our enterprise web applications built with Next.js, React, and TypeScript.

Key Responsibilities:
- Design state management, component architecture, and server-driven UI systems.
- Optimize Core Web Vitals, SSR/SSG performance, and client-side memory efficiency.
- Establish web security best practices (CORS, CSP, XSS/CSRF mitigation, OAuth flows).
- Lead real-time UI data synchronization over WebSockets and WebRTC.`,
    roleContext: 'Focus on web performance, client architecture, state management, and web security.',
  },
  {
    id: 'DEVOPS_SECURITY_ENGINEER',
    displayName: 'Senior DevOps & Security Lead',
    defaultJobDescription: `We are looking for a Senior DevOps & Security Lead to design resilient cloud infrastructure and zero-trust security postures.

Key Responsibilities:
- Architect Kubernetes clusters, terraform infrastructure, and automated CI/CD deployment pipelines.
- Implement zero-trust security, IAM policies, secret management (KMS), and network isolation.
- Ensure high availability, automated failover, chaos engineering, and incident response.
- Monitor metrics, distributed tracing, and SLA compliance across multi-cloud environments.`,
    roleContext: 'Focus on cloud security, container orchestration, disaster recovery, and zero-trust policies.',
  },
];

/**
 * Returns all configured job roles in the catalog.
 */
export function getAllJobRoles(): JobRoleDefinition[] {
  return JOB_ROLE_CATALOG;
}

/**
 * Retrieves a job role definition by its stable role ID.
 * Defaults to the first role (SYSTEM_ARCHITECT) if not found.
 */
export function getJobRoleById(roleId?: string): JobRoleDefinition {
  if (!roleId) return JOB_ROLE_CATALOG[0];
  const found = JOB_ROLE_CATALOG.find((r) => r.id === roleId);
  return found || JOB_ROLE_CATALOG[0];
}
