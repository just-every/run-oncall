import type { Bindings } from './auth.server'
import { admit, command, empty, type Incident, type Member, type State } from './family/response-operations/domain'
import { validatePolicy } from './family/response-operations/escalation'
import { coverage, validateSchedule, type Override, type Schedule } from './family/response-operations/schedules'
import { commitPaging, pagingSnapshot, putPolicy, putSchedule } from './paging-store'
import { workspaceRows } from './workspace-store'

const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR
const iso = (at: number) => new Date(at).toISOString()
const evidence = (path: string) => `https://dashboards.example.com/${path}`

/** The most recent Monday at `hour` local time in `zone`, `weeksBack` weeks earlier, as a rotation anchor. */
function anchor(now: number, zone: string, hour: number, weeksBack: number) {
  const part: Record<string, number> = {}
  for (const p of new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(now))
    if (p.type !== 'literal') part[p.type] = Number(p.value)
  const wall = Date.UTC(part.year, part.month - 1, part.day, part.hour, part.minute)
  let monday = Date.UTC(part.year, part.month - 1, part.day - ((new Date(wall).getUTCDay() + 6) % 7), hour)
  if (monday > wall) monday -= 7 * DAY
  return new Date(monday - weeksBack * 7 * DAY).toISOString().slice(0, 16)
}

/** A cover who is not already on the rota (primary or backup) at that moment. */
function standIn(schedule: Schedule, members: Member[], at: number) {
  const duty = coverage(schedule, members, at)
  return members.find(m => m.role === 'responder' && m.id !== duty.primary && m.id !== duty.backup)!.id
}

/**
 * A believable on-call setup, built through the same domain functions the
 * routes use: a team, two services with routing and escalation policies, weekly
 * rotations with overrides, and incidents from the last ten days (one open).
 * Effects are completed by Base's demo guard; no provider is contacted.
 */
export async function seedDemo(env: Bindings, { now: seededAt }: { ownerEmail: string; now: Date }) {
  const started = performance.now()
  if (await env.DB.prepare('SELECT 1 FROM workspace_control WHERE id=1').first()) return
  const owner = await env.DB.prepare("SELECT id,display_name FROM oa_operators WHERE role='owner' AND status='active' ORDER BY created_at LIMIT 1").first<{ id: string; display_name: string }>()
  if (!owner) throw Error('Demo needs the owner before its workspace')
  const now = seededAt.getTime()
  const person = (name: string, role: Member['role']): Member => ({ id: crypto.randomUUID(), name, role, active: true })
  const admin: Member = { id: owner.id, name: 'Alex Morgan', role: 'admin', active: true }
  const [priya, marcus, elena, sam] = [person('Priya Raman', 'responder'), person('Marcus Webb', 'responder'), person('Elena Rossi', 'responder'), person('Sam Okafor', 'responder')]
  const state: State = empty()
  state.members = [admin, priya, marcus, elena, sam, person('Jo Park', 'viewer')]
  const at = (offset: number) => iso(now - offset)
  const run = (actor: Member, input: object, offset: number) => command(state, actor, input, at(offset))

  // Services and routing policies.
  run(admin, { type: 'service', id: 'checkout-api', name: 'Checkout API', environment: 'production', owner: priya.id, pager: evidence('pager/checkout'), runbook: ['Check the deploy log for a release in the last hour', 'Compare the 5xx rate by region', 'Roll back the latest release if errors began with it', 'Post status in the incident timeline'] }, 11 * DAY)
  run(admin, { type: 'service', id: 'payments-worker', name: 'Payments worker', environment: 'production', owner: elena.id, pager: evidence('pager/payments'), runbook: ['Check queue depth and oldest message age', 'Scale consumers to the configured maximum', 'Confirm the card processor status page', 'Drain the dead-letter queue once the backlog clears'] }, 11 * DAY)
  for (const rule of [
    { service: 'checkout-api', severity: 'critical', action: 'route', owner: priya.id, reason: 'Checkout outages go to the service owner' },
    { service: 'checkout-api', severity: 'warning', action: 'route', owner: marcus.id, reason: 'Latency warnings go to the checkout rota' },
    { service: 'payments-worker', severity: 'critical', action: 'route', owner: elena.id, reason: 'Payment failures go to the payments owner' },
    { service: 'payments-worker', severity: 'info', action: 'suppress', owner: '', reason: 'Informational payment events are recorded, not routed' },
  ]) run(admin, { type: 'policy', ...rule }, 11 * DAY)

  // Alert history, newest last. Each signal is routed by the policies above.
  const signal = (service: string, severity: 'critical' | 'warning' | 'info', key: string, generation: string, title: string, intent: 'trigger' | 'recover', offset: number, page: string) =>
    admit(state, { source: 'demo-monitoring', eventId: `${key}:${generation}:${intent}`, service, environment: 'production', key, generation, intent, severity, title, observedAt: at(offset), evidence: evidence(page) }, at(offset))
  const finish = (inc: Incident, actor: Member, offset: number, recoveredAfter: number, resolvedAfter: number, review: string, follow: { title: string; owner: Member; due: string }) => {
    const step = (input: object, after: number) => run(actor, { incident: inc.id, revision: inc.revision, ...input }, offset - after)
    step({ type: 'transition', state: 'acknowledged', summary: 'Acknowledged and investigating' }, 4 * MIN)
    step({ type: 'runbook', index: 0, done: true }, 9 * MIN)
    step({ type: 'transition', state: 'mitigating', summary: 'Mitigation applied; watching the graphs' }, 25 * MIN)
    step({ type: 'transition', state: 'recovered', summary: 'Metrics are back within their normal range', evidence: evidence(`recovery/${inc.service}`) }, recoveredAfter)
    step({ type: 'transition', state: 'resolved', summary: 'No further impact after an hour of watching' }, resolvedAfter)
    step({ type: 'action', title: follow.title, owner: follow.owner.id, due: follow.due }, resolvedAfter + 10 * MIN)
    step({ type: 'complete', action: inc.actions[0].id, evidence: evidence('followups/done') }, resolvedAfter + 3 * HOUR)
    step({ type: 'review', text: review }, resolvedAfter + 4 * HOUR)
  }
  const day = (offset: number) => new Date(now - offset).toISOString().slice(0, 10)

  // A latency warning that recovered by itself, with no incident.
  signal('checkout-api', 'warning', 'checkout-latency', 'g1', 'Checkout p95 latency above 800 ms', 'trigger', 9 * DAY + 2 * HOUR, 'checkout/latency')
  signal('checkout-api', 'warning', 'checkout-latency', 'g1', 'Checkout p95 latency back under 800 ms', 'recover', 9 * DAY + 80 * MIN, 'checkout/latency')
  // A resolved payments backlog.
  const backlog = signal('payments-worker', 'critical', 'payments-queue', 'g1', 'Payment queue depth above 5,000', 'trigger', 6 * DAY + 3 * HOUR, 'payments/queue')
  signal('payments-worker', 'info', 'payments-retry', 'g1', 'Processor retries elevated', 'trigger', 6 * DAY + 2 * HOUR, 'payments/retries')
  const first = run(elena, { type: 'declare', service: 'payments-worker', severity: 'critical', title: 'Payments are queueing', summary: 'Card captures are delayed; the queue is draining slowly.', alerts: [backlog.alert] }, 6 * DAY + 3 * HOUR - 3 * MIN) as Incident
  finish(first, elena, 6 * DAY + 3 * HOUR - 3 * MIN, 95 * MIN, 150 * MIN, 'The processor throttled us after a retry storm. Consumers were scaled up and retries now back off. Detection was fast; the queue-depth alert fired late.', { title: 'Alert at 2,000 queued messages, not 5,000', owner: elena, due: day(5 * DAY) })
  signal('payments-worker', 'critical', 'payments-queue', 'g1', 'Payment queue depth back under 500', 'recover', 6 * DAY + 90 * MIN, 'payments/queue')
  // A resolved checkout error spike.
  const spike = signal('checkout-api', 'critical', 'checkout-5xx', 'g1', 'Checkout 5xx rate above 5%', 'trigger', 3 * DAY + 5 * HOUR, 'checkout/errors')
  const second = run(priya, { type: 'declare', service: 'checkout-api', severity: 'critical', title: 'Checkout returning errors', summary: 'About one in twenty checkouts fail with a 500 since the latest release.', alerts: [spike.alert] }, 3 * DAY + 5 * HOUR - 2 * MIN) as Incident
  finish(second, priya, 3 * DAY + 5 * HOUR - 2 * MIN, 70 * MIN, 140 * MIN, 'A migration locked the orders table during the release. The release was rolled back and the migration reworked to run online.', { title: 'Run migrations against a production-size copy before release', owner: marcus, due: day(2 * DAY) })
  signal('checkout-api', 'critical', 'checkout-5xx', 'g1', 'Checkout 5xx rate back under 0.5%', 'recover', 3 * DAY + 3 * HOUR, 'checkout/errors')
  // The incident open right now.
  const live = signal('checkout-api', 'critical', 'checkout-5xx', 'g2', 'Checkout 5xx rate above 5% in eu-west', 'trigger', 38 * MIN, 'checkout/errors')
  const current = run(priya, { type: 'declare', service: 'checkout-api', severity: 'critical', title: 'Checkout errors in eu-west', summary: 'Customers in eu-west see failed payments at checkout.', alerts: [live.alert] }, 35 * MIN) as Incident
  const act = (actor: Member, input: object, offset: number) => run(actor, { incident: current.id, revision: current.revision, ...input }, offset)
  act(admin, { type: 'note', text: `Page sent to ${priya.name} via SMS, voice, push and email.` }, 34 * MIN)
  act(priya, { type: 'runbook', index: 0, done: true }, 28 * MIN)
  act(priya, { type: 'runbook', index: 1, done: true }, 24 * MIN)
  act(marcus, { type: 'note', text: 'Errors only in eu-west. A certificate rotation there finished just before the alert.' }, 20 * MIN)
  act(priya, { type: 'note', text: 'Preparing to shift eu-west traffic to us-east while the certificate is reissued.' }, 14 * MIN)
  act(priya, { type: 'action', title: 'Add certificate expiry to the pre-release checklist', owner: marcus.id, due: day(-3 * DAY) }, 6 * MIN)
  state.revision = 1

  // Schedules: weekly hand-offs on Monday morning, with a past swap and a coming cover.
  const members = state.members
  const rota = (id: string, name: string, service: string, zone: string, hour: number, primary: string[], backup: string[], overrides: (schedule: Schedule) => Override[]): Schedule => {
    const base = { id, name, service, revision: 1, timezone: zone, validFrom: iso(now - 8 * 7 * DAY), validUntil: null, overrides: [] as Override[],
      primary: { anchorLocal: anchor(now, zone, hour, 5), periodDays: 7, members: primary, ambiguity: 'earlier' as const },
      backup: { anchorLocal: anchor(now, zone, hour, 5), periodDays: 7, members: backup, ambiguity: 'earlier' as const } }
    return validateSchedule({ ...base, overrides: overrides(validateSchedule(base, state)) }, state)
  }
  const checkout = rota('checkout-weekly', 'Checkout API weekly rota', 'checkout-api', 'America/New_York', 9, [priya.id, marcus.id, elena.id, sam.id], [elena.id, sam.id, priya.id, marcus.id], schedule => [
    { id: 'swap-last-week', role: 'primary', start: iso(now - 12 * DAY), end: iso(now - 11 * DAY), member: standIn(schedule, members, now - 12 * DAY + 12 * HOUR) },
    { id: 'cover-next-week', role: 'backup', start: iso(now + 2 * DAY), end: iso(now + 4 * DAY), member: standIn(schedule, members, now + 3 * DAY) },
  ])
  const payments = rota('payments-weekly', 'Payments worker weekly rota', 'payments-worker', 'Europe/London', 10, [elena.id, admin.id, sam.id], [sam.id, elena.id, admin.id], schedule => [
    { id: 'conference-cover', role: 'primary', start: iso(now + 5 * DAY), end: iso(now + 7 * DAY), member: standIn(schedule, members, now + 6 * DAY) },
  ])

  const token = crypto.randomUUID()
  const workspaceWrites = await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO workspace_control(id,revision,write_token) VALUES(1,?,?)').bind(state.revision, token),
    ...workspaceRows(env.DB, state, token),
    env.DB.prepare('INSERT OR IGNORE INTO oa_first_run(singleton,completed_by,completed_at) VALUES(1,?,?)').bind(owner.id, now),
    env.DB.prepare('INSERT OR IGNORE INTO operator_members SELECT ?,? WHERE EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)').bind(owner.id, admin.id, token),
  ])
  const snapshot = await pagingSnapshot(env.DB)
  const policies = [checkout, payments].map(schedule => validatePolicy({ service: schedule.service, scheduleId: schedule.id, revision: 1, primaryWaitSeconds: 300, backupWaitSeconds: 300, retrySeconds: 60, maxAttempts: 3 }, schedule))
  const pagingWrites = await commitPaging(env.DB, snapshot, { ...snapshot.archive, schedules: [checkout, payments], policies }, write => [...[checkout, payments].map(s => putSchedule(env.DB, s, write)), ...policies.map(p => putPolicy(env.DB, p, write))])
  console.info(JSON.stringify({ event: 'oncall_demo_seed', rowsWritten: [...workspaceWrites, ...pagingWrites].reduce((sum, result) => sum + (result.meta.rows_written ?? 0), 0), elapsedMs: Math.round(performance.now() - started) }))
}
