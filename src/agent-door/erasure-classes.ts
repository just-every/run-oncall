import type { Bindings } from '../auth.server'
import type { State } from '../family/response-operations/domain'
import { validateSchedule } from '../family/response-operations/schedules'
import type { ClassAndFacts } from '../modules/agent-door/index.ts'

/** Only native references and credential existence determine the effect classes.
 * No subject names, record text, secrets or caller claims enter retained facts. */
export async function erasureClasses(env: Bindings, state: State, kind: string, id: string): Promise<ClassAndFacts[]> {
  const classes: ClassAndFacts[] = [{ class: 'destructive', facts: { measure: 1 } }]
  const services = new Set<string>()
  const member = kind === 'member' ? state.members.find(row => row.id === id) : undefined
  const clients = (state.apiClients ?? []).filter(row => kind === 'client' ? row.id === id : member && row.owner === id)
  const endpoints = (state.apiEndpoints ?? []).filter(row => kind === 'endpoint' ? row.id === id : clients.some(client => client.id === row.client) || member && row.owner === id)
  const credentials = async (table: string, column: string, ids: string[]) => ids.length > 0 && !!await env.DB.prepare(`SELECT 1 FROM ${table} WHERE ${column} IN (SELECT value FROM json_each(?)) LIMIT 1`).bind(JSON.stringify(ids)).first()
  let security = false
  if (member?.active || clients.some(row => row.active)) classes.push({ class: 'access', facts: { measure: 1, direction: 'narrows' } })
  if (member?.active && ['admin', 'responder'].includes(member.role)) {
    for (const service of state.services) if (service.owner === id) services.add(service.id)
    for (const policy of state.policies) if (policy.action === 'route' && policy.owner === id) services.add(policy.service)
    for (const row of (await env.DB.prepare('SELECT data FROM paging_schedules').all<{ data: string }>()).results) {
      const schedule = validateSchedule(JSON.parse(row.data))
      if (schedule.primary.members.includes(id) || schedule.backup.members.includes(id)
        || schedule.layers?.some(layer => layer.rotation.members.includes(id)) || schedule.overrides.some(override => override.member === id)) services.add(schedule.service)
    }
  }
  const sourceIds = new Set<string>()
  if (kind === 'native') {
    const source = await env.DB.prepare('SELECT scopes FROM sources WHERE id=?').bind(id).first<{ scopes: string }>()
    if (source) { security = true; for (const service of JSON.parse(source.scopes)) services.add(service) }
    sourceIds.add(id)
    for (const source of state.intakeSources ?? []) if (source.id.startsWith('native:') && source.name === 'Native incomplete: ' + id) sourceIds.add('intake:' + source.id)
  }
  if (kind === 'intake' || kind === 'change' || kind === 'email') {
    const source = (kind === 'intake' ? state.intakeSources : kind === 'change' ? state.changeSources : state.emailAddresses)?.find(row => row.id === id)
    if (source?.active) {
      for (const service of kind === 'intake' ? state.intakeSources?.find(row => row.id === id)?.routing?.scope ?? [source.service] : [source.service]) services.add(service)
    }
    if (kind !== 'change') sourceIds.add((kind === 'email' ? 'email:' : 'intake:') + id)
    security = kind === 'email' && !!source || await credentials(kind === 'change' ? 'oc_change_credentials' : kind === 'email' ? 'oc_email_credentials' : 'oc_intake_credentials', kind === 'email' ? 'address' : 'source', [id])
    if (kind === 'intake') security ||= await credentials('sources', 'id', ['intake:' + id]) || await credentials('oc_incumbent_credentials', 'source', [id])
  }
  security ||= await credentials('oc_api_credentials', 'client', clients.map(row => row.id)) || await credentials('oc_endpoint_credentials', 'endpoint', endpoints.map(row => row.id))
  const alerts = new Set(state.alerts.filter(row => sourceIds.has(row.source)).map(row => row.id))
  const incidents = new Set(state.incidents.filter(row => kind === 'incident' ? row.id === id : row.alerts.some(alert => alerts.has(alert))).map(row => row.id))
  const agentOutbox = member ? new Set((await env.DB.prepare("SELECT outbox FROM oc_agent_outbox WHERE json_extract(principal,'$.person.id')=?").bind(id).all<{ outbox: string }>()).results.map(row => row.outbox)) : new Set<string>()
  for (const row of state.apiOutbox ?? []) if (!['sent', 'terminal'].includes(row.status)
    && (incidents.has(row.incident) || endpoints.some(endpoint => endpoint.id === row.endpoint) || clients.some(client => client.id === row.client) || member && (row.owner === id || agentOutbox.has(row.id)))) services.add(row.service)
  if (kind === 'incident') for (const row of (await env.DB.prepare("SELECT service FROM paging_jobs WHERE incident=? AND status='pending'").bind(id).all<{ service: string }>()).results) services.add(row.service)
  const agentDeadlines = member ? new Set((await env.DB.prepare("SELECT deadline FROM oc_agent_deadlines WHERE json_extract(principal,'$.person.id')=?").bind(id).all<{ deadline: string }>()).results.map(row => row.deadline)) : new Set<string>()
  for (const incident of state.incidents) if (incident.deadlines?.some(row => row.state === 'pending' && (kind === 'incident' && incident.id === id || member && (row.actor === id || agentDeadlines.has(row.id))))) services.add(incident.service)
  if (security) classes.push({ class: 'security', facts: { measure: 1, setting: 'erasure-credentials' } })
  if (services.size) classes.push({ class: 'live', facts: { measure: 1, service: [...services].sort().join(', ') } })
  return classes
}
