import { coverage } from '../../family/response-operations/schedules'
import { pagingSnapshot } from '../../paging-store'
import { ApiError, notFound } from './errors'
import { inScope, type Caller } from './auth'
import { paginate, pageSize } from './page'
import { actionView, incidentView, serviceView, scoped } from './views'
import { incidentAnalytics } from './analytics'

const servicesParam = (caller: Caller, value: string | undefined) => {
  if (value === undefined) return caller.account.services
  // A service outside the token's scope answers exactly as one that does not exist.
  if (!inScope(caller, value) || !caller.state.services.some(service => service.id === value)) throw notFound('Service')
  return [value]
}
const clock = (value: string | undefined) => {
  const parsed = value === undefined ? Date.now() : Date.parse(value)
  if (!Number.isSafeInteger(parsed)) throw new ApiError(400, 'invalid_request', 'at must be an ISO-8601 timestamp')
  return parsed
}

export function installReads(route: (permission: 'read' | null, handler: (c: any, caller: Caller) => Promise<unknown> | unknown) => (c: any) => Promise<Response>, api: any) {
  api.get('/api/v1/me', route(null, (c, caller) => ({ id: caller.account.id, name: caller.account.name, permissions: caller.account.permissions, services: caller.account.services })))
  api.get('/api/v1/services', route('read', (c, caller) => {
    const { services } = scoped(caller.state, caller.account.services)
    return paginate(services.map(serviceView), item => item.id, 'asc', '', c.req.query('cursor'), pageSize(c.req.query('limit')))
  }))
  api.get('/api/v1/services/:id', route('read', (c, caller) => {
    const service = scoped(caller.state, caller.account.services).services.find(candidate => candidate.id === c.req.param('id'))
    if (!service) throw notFound('Service')
    return serviceView(service)
  }))
  api.get('/api/v1/schedules', route('read', async (c, caller) => {
    const services = servicesParam(caller, c.req.query('service')), snapshot = await pagingSnapshot(c.env.DB)
    return paginate(snapshot.archive.schedules.filter(schedule => services.includes(schedule.service)), item => item.id, 'asc', services.join(','), c.req.query('cursor'), pageSize(c.req.query('limit')))
  }))
  api.get('/api/v1/schedules/:id', route('read', async (c, caller) => {
    const schedule = (await pagingSnapshot(c.env.DB)).archive.schedules.find(candidate => candidate.id === c.req.param('id') && inScope(caller, candidate.service))
    if (!schedule) throw notFound('Schedule')
    return schedule
  }))
  api.get('/api/v1/schedules/:id/oncall', route('read', async (c, caller) => {
    const snapshot = await pagingSnapshot(c.env.DB), schedule = snapshot.archive.schedules.find(candidate => candidate.id === c.req.param('id') && inScope(caller, candidate.service))
    if (!schedule) throw notFound('Schedule')
    const at = clock(c.req.query('at')), now = coverage(schedule, snapshot.workspace.members, at)
    return { paging: 'OFF', now, next: Object.fromEntries(now.windows.map(window => [window.role, window.end ? coverage(schedule, snapshot.workspace.members, Date.parse(window.end)) : null])) }
  }))
  api.get('/api/v1/incidents', route('read', (c, caller) => {
    const services = servicesParam(caller, c.req.query('service')), state = c.req.query('state')
    if (state !== undefined && !['declared', 'acknowledged', 'mitigating', 'recovered', 'resolved'].includes(state)) throw new ApiError(400, 'invalid_request', 'Unknown incident state')
    const incidents = scoped(caller.state, services).incidents.filter(incident => state === undefined || incident.state === state)
    return paginate(incidents.map(incident => incidentView(incident)), item => item.createdAt + '|' + item.id, 'desc', `${services.join(',')}|${state ?? ''}`, c.req.query('cursor'), pageSize(c.req.query('limit')))
  }))
  api.get('/api/v1/incidents/:id', route('read', (c, caller) => {
    const incident = scoped(caller.state, caller.account.services).incidents.find(candidate => candidate.id === c.req.param('id'))
    if (!incident) throw notFound('Incident')
    c.header('ETag', `"${incident.revision}"`)
    return incidentView(incident, true)
  }))
  api.get('/api/v1/actions', route('read', (c, caller) => {
    const services = servicesParam(caller, c.req.query('service')), done = c.req.query('done'), owner = c.req.query('owner'), incidentId = c.req.query('incident')
    if (done !== undefined && !['true', 'false'].includes(done)) throw new ApiError(400, 'invalid_request', 'done must be true or false')
    const actions = scoped(caller.state, services).incidents.filter(incident => incidentId === undefined || incident.id === incidentId)
      .flatMap(incident => incident.actions.map(action => actionView(incident, action)))
      .filter(action => (done === undefined || action.done === (done === 'true')) && (owner === undefined || action.owner === owner))
    return paginate(actions, item => item.due + '|' + item.id, 'asc', `${services.join(',')}|${done ?? ''}|${owner ?? ''}|${incidentId ?? ''}`, c.req.query('cursor'), pageSize(c.req.query('limit')))
  }))
  api.get('/api/v1/analytics/incidents', route('read', (c, caller) => {
    const services = servicesParam(caller, c.req.query('service'))
    return incidentAnalytics(scoped(caller.state, services).incidents, { from: c.req.query('from'), to: c.req.query('to') })
  }))
  api.get('/api/v1/integrations', route('read', async (c, caller) => {
    const services = caller.account.services, state = caller.state
    const sources = (await c.env.DB.prepare('SELECT id,signing_secret IS NOT NULL AS pending,signing_custody IS NOT NULL AS signed,scopes FROM sources ORDER BY id').all()).results as { id: string; pending: number; signed: number; scopes: string }[]
    const counts = (await c.env.DB.prepare("SELECT state,COUNT(*) AS n FROM oc_outbox WHERE json_extract(data,'$.payload.service.id') IN (SELECT value FROM json_each(?)) GROUP BY state").bind(JSON.stringify(services)).all()).results as { state: string; n: number }[]
    const visible = (ids: string[]) => ids.filter(id => services.includes(id))
    return {
      alertSources: sources.map(source => ({ id: source.id, authentication: source.pending || source.signed ? 'signed' : 'bearer', services: visible(JSON.parse(source.scopes)) })).filter(source => source.services.length),
      changeSources: (state.changeSources ?? []).filter(source => services.includes(source.service)).map(source => ({ id: source.id, name: source.name, provider: source.provider, service: source.service, active: source.active, lastAccepted: source.lastAccepted?.at ?? null })),
      monitoringSources: (state.intakeSources ?? []).filter(source => services.includes(source.service)).map(source => ({ id: source.id, name: source.name, provider: source.provider, service: source.service, active: source.active })),
      webhookEndpoints: (state.webhookEndpoints ?? []).filter(endpoint => visible(endpoint.services).length).map(endpoint => ({ id: endpoint.id, name: endpoint.name, host: new URL(endpoint.url).host, events: endpoint.events, services: visible(endpoint.services), active: endpoint.active })),
      outbox: Object.fromEntries(counts.map(row => [row.state, row.n])),
      note: 'Credentials are never returned. Delivery of an event is not a human acknowledgment.',
    }
  }))
}
