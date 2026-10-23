import { fail, type Service, type State } from '../family/response-operations/domain.ts';
import type { ResponseDecision, ResponsePolicy } from './types.ts';

export function responseFields(value: unknown, keys: string[], optional: string[] = []): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || keys.some(k => !Object.hasOwn(value, k)) ||
    Object.keys(value).some(k => !keys.includes(k) && !optional.includes(k))) fail('Missing or unknown response policy fields');
  return value as Record<string, unknown>;
}
export function responseDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) && Number.isFinite(Date.parse(value));
}
export function validateResponsePolicy(value: unknown): ResponsePolicy {
  const p = responseFields(value, ['version', 'by', 'at', 'defaultMode', 'recoveredNotice', 'rules', 'reason']);
  if (!Number.isSafeInteger(p.version) || (p.version as number) < 1 || typeof p.by !== 'string' || !p.by.trim() || p.by.length > 100 ||
    !responseDate(p.at) || !['alert-only', 'incident'].includes(p.defaultMode as string) || !['silent', 'notified'].includes(p.recoveredNotice as string) ||
    typeof p.reason !== 'string' || !p.reason.trim() || p.reason.length > 500 || !Array.isArray(p.rules) || p.rules.length > 20) fail('Invalid response policy');
  const ids = new Set<string>();
  for (const row of p.rules) {
    const r = responseFields(row, ['id', 'urgency', 'severity', 'policy', 'mode']);
    if (typeof r.id !== 'string' || !r.id.trim() || r.id.length > 100 || ids.has(r.id) ||
      !['*', 'high', 'low'].includes(r.urgency as string) || !['*', 'critical', 'warning', 'info'].includes(r.severity as string) ||
      typeof r.policy !== 'string' || !r.policy.trim() || r.policy.length > 100 || !['alert-only', 'incident'].includes(r.mode as string)) fail('Invalid response rule');
    ids.add(r.id);
  }
  return structuredClone(value) as ResponsePolicy;
}
export const publishedResponsePolicy = (service: Service) => service.responsePolicies?.at(-1);
export const responsePolicyAuditText = (service: Service, policy: ResponsePolicy) =>
  `Service ${service.id} response policy ${policy.version}: ${policy.reason}`;

/** First matching rule wins; a generation retains this decision through recovery. */
export function decideResponse(policy: ResponsePolicy | undefined, urgency: string, severity: string, orchestration: string | null): ResponseDecision {
  const rule = policy?.rules.find(r => (r.urgency === '*' || r.urgency === urgency) &&
    (r.severity === '*' || r.severity === severity) && (r.policy === '*' || r.policy === orchestration));
  return {version: policy?.version ?? 0, mode: rule?.mode ?? policy?.defaultMode ?? 'alert-only',
    recoveredNotice: policy?.recoveredNotice ?? 'silent', rule: rule?.id ?? null};
}
export function historicalResponsePolicy(state: State, serviceId: string | null, at: string) {
  return state.services.find(s => s.id === serviceId)?.responsePolicies?.filter(p => Date.parse(p.at) <= Date.parse(at)).at(-1);
}
