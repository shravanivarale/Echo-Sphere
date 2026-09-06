export const DEFAULT_AGENT_UID = 123456;

export const ROLE_AGENT_UIDS = {
  SYSTEM_ARCHITECT: 1001,
  PRODUCT_MANAGER: 1002,
  SECURITY_LEAD: 1003,
} as const;

export function getAgentUidForRole(role: string): number {
  if (role === 'PRODUCT_MANAGER') return ROLE_AGENT_UIDS.PRODUCT_MANAGER;
  if (role === 'SECURITY_LEAD') return ROLE_AGENT_UIDS.SECURITY_LEAD;
  return ROLE_AGENT_UIDS.SYSTEM_ARCHITECT;
}
