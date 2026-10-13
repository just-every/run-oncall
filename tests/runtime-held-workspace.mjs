// Hand-authored held installation data, deliberately ordered differently from
// entity IDs. The migration must preserve every array, nested snapshot and entry.
export function heldWorkspace() {
  const at = n => `2026-10-01T00:00:${String(n).padStart(2, '0')}.000Z`;
  const members = [
    { id: 'prior-admin', name: 'Prior Operator', role: 'admin', active: true },
    { id: 'z-responder', name: 'Held Responder', role: 'responder', active: true },
    { id: 'a-viewer', name: 'Held Viewer', role: 'viewer', active: false },
  ];
  const services = ['z', 'a', 'm'].map((key, index) => ({
    id: index === 0 ? 'prior-service' : `${key}-service`, name: `${key} held service`,
    environment: index === 1 ? 'staging' : 'production', owner: 'z-responder',
    runbook: [`${key} original instruction`, `${key} retain evidence`], pager: '',
  }));
  const policies = services.map((service, index) => ({
    id: ['z-policy', 'a-policy', 'm-policy'][index], version: index + 2,
    service: service.id, severity: '*', action: 'route', owner: 'z-responder', reason: 'Held routing instruction',
  }));
  const events = services.flatMap((service, index) => ['trigger', 'recover'].map((intent, n) => ({
    source: 'held-monitor', eventId: `${service.id}-${intent}`, service: service.id, environment: service.environment,
    key: 'held-key', generation: 'held-generation', intent, severity: 'warning', title: 'Held event title',
    observedAt: at(index * 2 + n), evidence: 'https://example.test/held-evidence',
    id: `${['z', 'a', 'm'][index]}-event-${n}`, acceptedAt: at(index * 2 + n),
    decision: { policy: policies[index].id, version: policies[index].version, action: 'route', owner: 'z-responder', reason: 'Held routing instruction' },
    routingSnapshot: { policies: structuredClone(policies), members: structuredClone(members), evaluatedAt: at(index * 2 + n) },
  })));
  const alerts = services.map((service, index) => ({
    id: `${['z', 'a', 'm'][index]}-alert`, source: 'held-monitor', service: service.id, environment: service.environment,
    key: 'held-key', generation: 'held-generation', state: 'recovered',
    events: events.filter(event => event.service === service.id).map(event => event.id), owner: 'z-responder', suppressed: false,
  }));
  const incidents = services.map((service, index) => ({
    id: `${['z', 'a', 'm'][index]}-incident`, title: 'Held incident', service: service.id, severity: 'warning', state: 'resolved',
    commander: 'z-responder', revision: 6, createdAt: at(0), alerts: [alerts[index].id],
    timeline: ['declared', 'transition', 'action', 'transition', 'transition', 'review'].map((kind, n) => ({
      id: `${service.id}-${['z', 'a', 'y', 'b', 'x', 'c'][n]}-history`, at: at(n), actor: n === 0 ? 'prior-admin' : 'z-responder', kind, text: `Held ${kind} entry ${n}`,
    })),
    runbook: [{ text: `${service.id} copied instruction`, done: true }, { text: 'Copied uncompleted instruction', done: false }],
    actions: [{ id: `${service.id}-z-action`, title: 'Retained open follow-up', owner: 'z-responder', due: '2026-10-20', done: false, evidence: '' },
      { id: `${service.id}-a-action`, title: 'Retained completed follow-up', owner: 'prior-admin', due: '2026-10-02', done: true, evidence: 'https://example.test/follow-up' }],
    recovery: 'https://example.test/recovery', review: 'Held review remains editable',
  }));
  const audit = ['z', 'a', 'm'].map((key, index) => ({ id: `${key}-audit`, at: at(index), actor: 'prior-admin', kind: 'service', text: `Held ${key} service change` }));
  return { schemaVersion: 1, revision: 3, members, services, policies, events, alerts, incidents, audit };
}
