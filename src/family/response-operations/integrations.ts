import { fail, type Incident, type Service } from './domain.ts'
/** Provider-neutral drafts. No transport, publication or authority grant occurs here. */
export function handoff(incident: Incident, service: Service) {
  if (incident.service !== service.id) fail('Handoff service mapping does not match incident')
  const id = `oncall:${incident.id}:${incident.revision}`
  return {
    version: 1,
    id,
    source: 'oncall',
    service: service.id,
    environment: service.environment,
    visibility: 'internal',
    intent: 'reviewed-handoff-required',
    title: incident.title,
    state: incident.state,
    evidence: incident.recovery,
    pagerAuthority: 'existing-provider',
    pager: { link: service.pager, submission: 'not-submitted', delivery: 'unknown' },
    lamp: {
      publication: 'not-published',
      draft: incident.timeline[0].text,
      intake: { deduplicationKey: `oncall:${incident.id}`, title: incident.title, state: incident.state === 'resolved' ? 'recovered' : 'firing', handoffId: id },
      mapping: { deduplicationPath: 'deduplicationKey', titlePath: 'title', statePath: 'state', recoveredValue: 'recovered' },
      boundary: 'Lamp intake creates a draft or records recovery; it does not publish or resolve a public incident',
    },
    chat: { delivery: 'not-sent', message: { id, visibility: 'internal', title: incident.title, summary: incident.timeline[0].text, incidentId: incident.id } },
    providerActions: [],
  }
}
