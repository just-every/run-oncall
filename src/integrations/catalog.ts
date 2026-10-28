import type { State } from '../family/response-operations/domain';
import type { IntakeRun } from '../intake/CompatibleTest';

export type IntegrationProps = { state: State; admin: boolean; busy: boolean; run: IntakeRun };
export const integrationKinds = {
  email: 'Email', pagerduty: 'PagerDuty-compatible', opsgenie: 'Opsgenie-compatible',
  splunk: 'Splunk-compatible', alertmanager: 'Alertmanager', grafana: 'Grafana',
  datadog: 'Datadog', events: 'Events API', changes: 'Change events',
} as const;
export type IntegrationKind = keyof typeof integrationKinds;
export type NativeDefinition = { id: string; authentication: 'signed' | 'bearer'; scopes: string[] };
export type SourceRecord = { id: string; name: string; kind: IntegrationKind; service: string; active: boolean; statusKnown?: boolean; native?: NativeDefinition };
export const privateKey = (bytes = 32) => Array.from(crypto.getRandomValues(new Uint8Array(bytes)), b => b.toString(16).padStart(2, '0')).join('');
export const newIdentity = (prefix: string) => prefix + '-' + privateKey(6);
export const sourcePath = (id: string) => '/settings/integrations/' + encodeURIComponent(id);
export const addPath = (kind: string) => '/settings/integrations/new/' + kind;
export const shortTime = (value: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
export const nativeName = (id: string) => /-[a-f0-9]{12}$/.test(id) ? id.slice(0, -13) : /^[a-f0-9-]{32,}$/i.test(id) ? 'Events source' : id.replaceAll('-', ' ');
export function sourcesFrom(state: State, native: NativeDefinition[], canReadNative = true): SourceRecord[] {
  const configured=new Set(native.map(s=>s.id));
  const history=[...new Map(state.events.filter(e=>!e.source.startsWith('intake:')&&!e.source.startsWith('email:')&&!configured.has(e.source)).map(e=>[e.source,e])).values()];
  return [
    ...(state.emailAddresses ?? []).map(s => ({ id: 'email:' + s.id, name: s.name, kind: 'email' as const, service: s.service, active: s.active })),
    ...(state.intakeSources ?? []).filter(s => !s.routing && !s.id.startsWith('native:')).map(s => ({ id: 'intake:' + s.id, name: s.name, kind: s.provider as IntegrationKind, service: s.service, active: s.active })),
    ...(state.changeSources ?? []).map(s => ({ id: 'change:' + s.id, name: s.name, kind: 'changes' as const, service: s.service, active: s.active })),
    ...history.map(e=>({id:'native:'+e.source,name:nativeName(e.source),kind:'events' as const,service:e.service,active:false,statusKnown:canReadNative})),
    ...native.filter(s => !s.id.startsWith('intake:') && !s.id.startsWith('email:')).map(s => ({ id: 'native:' + s.id, name: nativeName(s.id), kind: 'events' as const, service: s.scopes[0], active: true, native: s })),
  ];
}
