import type { Service } from '../family/response-operations/domain';
import { newIdentity, type SourceRecord } from './catalog';

type Sender = { path: string; headers: Record<string, string>; body: unknown };
export function sender(source: SourceRecord, service: Service, secret: string, title: string, severity: string, intent: string, identity: string, startedAt = new Date().toISOString(), generation = identity): Sender {
  const id = source.id.slice(source.id.indexOf(':') + 1), headers: Record<string, string> = { 'content-type': 'application/json' };
  if (source.kind === 'events') return { path: '/api/ingress/' + encodeURIComponent(id), headers, body: { source: id, eventId: newIdentity('event'), service: service.id, environment: service.environment, key: identity, generation, title, severity, intent, observedAt: new Date().toISOString(), evidence: '' } };
  if (source.kind === 'pagerduty') return { path: '/v2/enqueue', headers, body: { routing_key: secret, event_action: intent === 'recover' ? 'resolve' : 'trigger', dedup_key: identity, payload: { summary: title, source: 'Oncall receiver check', severity } } };
  if (source.kind === 'opsgenie') {
    headers.Authorization = 'GenieKey ' + secret;
    return { path: intent === 'recover' ? '/v2/alerts/' + encodeURIComponent(identity) + '/close?identifierType=alias' : '/v2/alerts', headers, body: intent === 'recover' ? { source: 'Oncall receiver check' } : { alias: identity, message: title, priority: severity === 'critical' ? 'P1' : severity === 'info' ? 'P5' : 'P3' } };
  }
  if (source.kind === 'splunk') return { path: '/integrations/generic/20131114/alert/' + encodeURIComponent(secret) + '/oncall', headers, body: { entity_id: identity, entity_display_name: title, message_type: intent === 'recover' ? 'RECOVERY' : severity === 'critical' ? 'CRITICAL' : severity === 'info' ? 'INFO' : 'WARNING' } };
  if (source.kind === 'datadog') return { path: '/api/monitoring/' + encodeURIComponent(id), headers: { ...headers, authorization: 'Bearer ' + secret }, body: { id: newIdentity('event'), alert_id: identity, alert_cycle_key: identity, alert_scope: '', alert_transition: intent === 'recover' ? 'Recovered' : 'Triggered', date: Date.now(), alert_type: severity, tags: '', title, body: '' } };
  const now = new Date().toISOString();
  return { path: '/api/monitoring/' + encodeURIComponent(id), headers: { ...headers, authorization: 'Bearer ' + secret }, body: { version: source.kind === 'grafana' ? '1' : '4', receiver: 'Oncall', groupKey: identity, status: intent === 'recover' ? 'resolved' : 'firing', groupLabels: {}, commonLabels: {}, commonAnnotations: {}, alerts: [{ status: intent === 'recover' ? 'resolved' : 'firing', labels: { alertname: identity, severity }, annotations: { summary: title }, startsAt: startedAt, endsAt: intent === 'recover' ? now : '0001-01-01T00:00:00Z', fingerprint: identity, generatorURL: '' }] } };
}
const quote = (value: string) => "'" + value.replace(/'/g, "'\\''") + "'";
/** A ready-to-paste sender; the private key comes only from the environment. */
export function providerSample(source: SourceRecord, service: Service, origin = '') {
  const example = sender(source, service, 'ONCALL_PRIVATE_KEY', 'Service latency is above normal', 'warning', 'trigger', 'receiver-check');
  let setup = '', endpoint = quote(origin + example.path), auth = '';
  let body = quote(JSON.stringify(example.body, null, 2));
  if (source.kind === 'pagerduty') {
    // Intake keys are printable ASCII. Encode each byte as a JSON escape so quotes and backslashes stay data.
    setup = `key_json=$(printf '%s' "$ONCALL_SOURCE_KEY" | od -An -v -tx1 | awk 'BEGIN{printf "\\\""} {for(i=1;i<=NF;i++) printf "\\\\u00%s",$i} END{printf "\\\""}')\n`;
    const payload = { ...(example.body as Record<string, unknown>), routing_key: undefined };
    body = quote(JSON.stringify(payload).replace(/}$/, ',"routing_key":')) + '"$key_json"' + "'}'";
  } else if (source.kind === 'splunk') {
    setup = `key_path=$(printf '%s' "$ONCALL_SOURCE_KEY" | od -An -v -tx1 | awk '{for(i=1;i<=NF;i++) printf "%%%s", $i}')\n`;
    endpoint = quote(origin + '/integrations/generic/20131114/alert/') + '"$key_path"' + quote('/oncall');
  } else {
    auth = source.kind === 'opsgenie' ? 'Authorization: GenieKey' : 'Authorization: Bearer';
  }
  const lines = [
    `curl --fail-with-body ${endpoint}`,
    "  -H 'Content-Type: application/json'",
    ...(auth ? [`  -H "${auth} $ONCALL_SOURCE_KEY"`] : []),
    `  --data-binary ${body}`,
  ];
  return `: "\${ONCALL_SOURCE_KEY:?Set ONCALL_SOURCE_KEY privately first}"\n${setup}` + lines.join(' \\\n');
}
