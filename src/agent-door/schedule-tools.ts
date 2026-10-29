import type { Bindings } from '../auth.server'
import type { Entry, State } from '../family/response-operations/domain'
import { fail } from '../family/response-operations/domain'
import { coverage, preview, validateSchedule, type Schedule } from '../family/response-operations/schedules'
import { bound, canonical, pagingSnapshot, putSchedule, type PagingSnapshot } from '../paging-store'
import { reviewSchedule, type ScheduleReview } from '../schedule-coverage/review'
import { scheduleChanges } from '../schedule-coordination/model'
import { requireTeamCoverage } from '../teams/model'
import { ToolRefusal, type ClassAndFacts, type JsonSchema, type JsonSchemaObject, type ToolContext, type ToolDefinition } from '../modules/agent-door/index.ts'
import { nativeAccess, nativeActor, nativeAudit, nativeCall, persistNative, type NativeAccess } from './native'
import { completedScheduleChange, scheduleReceipt } from './schedule-receipts'

const id: JsonSchema = { type: 'string', minLength: 1, maxLength: 100 }
const instant: JsonSchema = { type: 'string', format: 'date-time', description: 'Exact UTC ISO timestamp, in 2000–2100.' }
const nullableInstant: JsonSchema = { anyOf: [instant, { type: 'null' }] }
const member: JsonSchema = { anyOf: [id, { type: 'null' }] }
const revision: JsonSchema = { type: 'integer', minimum: 0 }
const clock: JsonSchema = { type: 'integer', description: 'Unix milliseconds in the supported years 2000–2100.' }
const object = (properties: Record<string, JsonSchema>, required = Object.keys(properties)): JsonSchemaObject => ({ type: 'object', properties, required, additionalProperties: false })
const list = (items: JsonSchema, maxItems: number): JsonSchema => ({ type: 'array', items, maxItems })
const rotation = object({ anchorLocal: { type: 'string', minLength: 16, maxLength: 16, description: 'Local YYYY-MM-DDTHH:mm.' }, periodDays: { type: 'integer', minimum: 1, maximum: 366 }, members: list(id, 100), ambiguity: { enum: ['earlier', 'later', 'reject'] } })
const override = object({ id, role: { enum: ['primary', 'backup'] }, start: instant, end: instant, member })
const layer = object({
  id, name: { type: 'string', minLength: 1, maxLength: 200 }, role: { enum: ['primary', 'backup'] }, timezone: id,
  kind: { enum: ['daily', 'weekly', 'custom', 'business'] }, rotation, start: instant, end: nullableInstant,
  weekdays: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 6 }, maxItems: 7, uniqueItems: true },
  startHour: { type: 'integer', minimum: 0, maximum: 23 }, endHour: { type: 'integer', minimum: 1, maximum: 24 },
  holidayCalendars: { type: 'array', items: { enum: ['us-federal', 'company'] }, maxItems: 2, uniqueItems: true },
  holidayAction: { enum: ['gap', 'next'] }, ptoAction: { enum: ['gap', 'next'] },
})
const scheduleSchema = object({
  id, name: { type: 'string', minLength: 1, maxLength: 200 }, service: id, revision, timezone: id,
  validFrom: instant, validUntil: nullableInstant, primary: rotation, backup: rotation, overrides: list(override, 1000),
  layers: list(layer, 24),
  companyDates: list(object({ id, name: { type: 'string', minLength: 1, maxLength: 200 }, date: { type: 'string', format: 'date' }, timezone: id, revision: { type: 'integer', minimum: 1 } }), 366),
  pto: list(object({ id, member, start: instant, end: instant, reason: { type: 'string', maxLength: 500 } }), 1000),
}, ['id', 'name', 'service', 'revision', 'timezone', 'validFrom', 'validUntil', 'primary', 'backup', 'overrides'])
const reviewFields = { id, revision, schedule: scheduleSchema, from: clock, to: clock }
const coverageUri = (schedule: Schedule) => `oncall://schedules/${encodeURIComponent(schedule.id)}/coverage`
type ScheduleAccess = { access: NativeAccess; snapshot: PagingSnapshot; schedule: Schedule }
type Proposal = ScheduleAccess & { next: Schedule; review?: ScheduleReview }
type NewSchedule = { access: NativeAccess; snapshot: PagingSnapshot; next: Schedule; schedule?: undefined; review?: undefined }
type ScheduleChange = Proposal | NewSchedule

function references(schedule: Schedule): string[] {
  return [...new Set([
    ...schedule.primary.members, ...schedule.backup.members, ...schedule.overrides.flatMap(row => row.member === null ? [] : [row.member]),
    ...(schedule.layers ?? []).flatMap(row => row.rotation.members), ...(schedule.pto ?? []).flatMap(row => row.member === null ? [] : [row.member]),
  ])]
}

function people(state: State, schedules: Schedule[]) {
  const ids = new Set(schedules.flatMap(references))
  return state.members.filter(row => ids.has(row.id)).map(({ id, name }) => ({ id, name }))
}

function readFacts(state: State, schedules: Schedule[], items = schedules.length): ClassAndFacts[] {
  const records = people(state, schedules).length
  return [{ class: 'standard', facts: { measure: items } }, ...(records ? [{ class: 'sensitive' as const, facts: { measure: records, kind: 'on-call participant details' } }] : [])]
}

/** Both datasets come from one native read transaction; nativeAccess supplies current sponsorship and commit guards. */
async function snapshotAccess(env: Bindings, ctx: ToolContext, permission: string, service?: unknown) {
  const access = await nativeAccess(env, ctx, permission, service)
  const snapshot = await pagingSnapshot(env.DB)
  if (snapshot.workspace.revision !== access.state.revision) throw new ToolRefusal('revision_conflict')
  access.state = snapshot.workspace
  return { access, snapshot }
}

async function savedSchedule(env: Bindings, ctx: ToolContext, args: Record<string, unknown>, write = false): Promise<ScheduleAccess> {
  const { access, snapshot } = await snapshotAccess(env, ctx, write ? 'schedules:write' : 'schedules:read')
  const schedule = snapshot.archive.schedules.find(row => row.id === args.id && access.services.includes(row.service))
  if (!schedule) throw new ToolRefusal('not_found')
  // Local clients retain the native schedules:write capability and service scope.
  // A Business agent needs the sponsor's real, current owning-team coverage authority.
  if (write && !access.client) requireTeamCoverage(access.state, access.member, schedule.service)
  return { access, snapshot, schedule }
}

async function readSchedules(env: Bindings, ctx: ToolContext, args: Record<string, unknown>) {
  const { access, snapshot } = await snapshotAccess(env, ctx, 'schedules:read', args.service)
  const schedules = snapshot.archive.schedules.filter(row => access.services.includes(row.service) && (args.service === undefined || row.service === args.service) && (args.id === undefined || row.id === args.id))
  if (args.id !== undefined && !schedules.length) throw new ToolRefusal('not_found')
  return { access, schedules }
}

function matchingRevision(schedule: Schedule, value: unknown) {
  if (!Number.isSafeInteger(value) || value !== schedule.revision) throw new ToolRefusal('revision_conflict', 'Schedule changed; reload and review again')
}

async function reviewed(env: Bindings, ctx: ToolContext, args: Record<string, unknown>, apply: boolean): Promise<Proposal> {
  const saved = await savedSchedule(env, ctx, args, true)
  matchingRevision(saved.schedule, args.revision)
  const supplied = validateSchedule(args.schedule, saved.access.state)
  matchingRevision(saved.schedule, supplied.revision)
  if (saved.access.member.role !== 'admin') {
    if (canonical(supplied.companyDates ?? []) !== canonical(saved.schedule.companyDates ?? [])) fail('Only an administrator can author company dates', 403)
    if (supplied.pto?.some(row => !saved.schedule.pto?.some(old => old.id === row.id) && row.member !== saved.access.member.id)) fail('Only an administrator can record another member’s PTO', 403)
  }
  const review = await reviewSchedule(saved.schedule, supplied, saved.access.state, args.from as number, args.to as number)
  if (apply && (typeof args.digest !== 'string' || args.digest !== review.digest)) throw new ToolRefusal('revision_conflict', 'Review changed; obtain a fresh native schedule review digest')
  return { ...saved, next: review.schedule, review }
}

async function overridden(env: Bindings, ctx: ToolContext, args: Record<string, unknown>): Promise<Proposal> {
  const saved = await savedSchedule(env, ctx, args, true)
  matchingRevision(saved.schedule, args.revision)
  const next = validateSchedule({ ...saved.schedule, revision: saved.schedule.revision + 1, overrides: [...saved.schedule.overrides, args.override] }, saved.access.state)
  return { ...saved, next }
}

async function created(env: Bindings, ctx: ToolContext, args: Record<string, unknown>, requireUnused = true): Promise<NewSchedule> {
  const supplied = validateSchedule(args.schedule)
  const { access, snapshot } = await snapshotAccess(env, ctx, 'schedules:write', supplied.service)
  if (!access.client) requireTeamCoverage(access.state, access.member, supplied.service)
  const old = snapshot.archive.schedules.find(row => row.id === supplied.id)
  if (old && old.service !== supplied.service) throw new ToolRefusal('not_found')
  if (supplied.revision !== 0 || requireUnused && old) throw new ToolRefusal('revision_conflict', 'A new schedule requires an unused identity and native revision 0')
  if (access.member.role !== 'admin') {
    if (supplied.companyDates?.length) fail('Only an administrator can author company dates', 403)
    if (supplied.pto?.some(row => row.member !== access.member.id)) fail('Only an administrator can record another member’s PTO', 403)
  }
  return { access, snapshot, next: validateSchedule({ ...supplied, revision: 1 }, access.state) }
}

function changeFacts(proposal: ScheduleChange, ctx: ToolContext): ClassAndFacts[] {
  const at = ctx.now(), members = proposal.access.state.members
  const current = (schedule: Schedule) => {
    const { scheduleRevision: _revision, ...value } = coverage(schedule, members, at)
    return value
  }
  const next = current(proposal.next)
  const live = proposal.schedule ? canonical(current(proposal.schedule)) !== canonical(next) : next.primary !== null || next.backup !== null
  return [...readFacts(proposal.access.state, [...(proposal.schedule ? [proposal.schedule] : []), proposal.next], 1), ...(live ? [{ class: 'live' as const, facts: { measure: 1, service: proposal.next.service } }] : [])]
}

function changedPeople(proposal: Proposal) {
  const { schedule: old, next, review } = proposal, ids = new Set<string>()
  const add = (values: (string | null | undefined)[]) => values.forEach(value => { if (value) ids.add(value) })
  for (const interval of review?.intervals ?? []) if (interval.before !== interval.after) add([interval.before, interval.after])
  for (const role of ['primary', 'backup'] as const) if (canonical(old[role]) !== canonical(next[role])) add([...old[role].members, ...next[role].members])
  for (const key of ['overrides', 'pto'] as const) for (const row of [...(old[key] ?? []), ...(next[key] ?? [])]) {
    if (canonical(old[key]?.find(prior => prior.id === row.id) ?? null) !== canonical(next[key]?.find(after => after.id === row.id) ?? null)) {
      add([row.member])
      if (key === 'overrides') {
        const role = (row as Schedule['overrides'][number]).role
        add([coverage(old, proposal.access.state.members, Date.parse(row.start))[role], coverage(next, proposal.access.state.members, Date.parse(row.start))[role]])
      }
    }
  }
  for (const row of [...(old.layers ?? []), ...(next.layers ?? [])]) if (canonical(old.layers?.find(prior => prior.id === row.id) ?? null) !== canonical(next.layers?.find(after => after.id === row.id) ?? null)) add(row.rotation.members)
  if (old.timezone !== next.timezone || old.validFrom !== next.validFrom || old.validUntil !== next.validUntil || canonical(old.companyDates ?? []) !== canonical(next.companyDates ?? [])) add([...references(old), ...references(next)])
  return proposal.access.state.members.filter(row => ids.has(row.id)).map(row => `${row.name} (${row.id})`)
}

function changeSummary(proposal: Proposal) {
  const service = proposal.access.state.services.find(row => row.id === proposal.schedule.service)!
  const participants = changedPeople(proposal)
  return {
    target: { id: proposal.schedule.id, name: proposal.schedule.name }, recipients: participants,
    items: [`Coordination schedule for ${service.name} (${service.id}); paging remains OFF`, `Native revision ${proposal.schedule.revision} → ${proposal.next.revision}`,
      ...(participants.length ? [`Changed coverage participants: ${participants.join(', ')}`] : ['No named participant assignment changes in the evaluated proposal']),
      ...(proposal.review ? [`Review SHA-256 ${proposal.review.digest}; range ${new Date(proposal.review.from).toISOString()} to ${new Date(proposal.review.to).toISOString()}`] : proposal.next.overrides.slice(proposal.schedule.overrides.length).map(row => `${row.role} override ${row.start} to ${row.end}; ${row.member === null ? 'explicit coverage gap' : proposal.access.state.members.find(person => person.id === row.member)?.name ?? row.member}`)),
    ],
  }
}

function createSummary(proposal: NewSchedule, ctx: ToolContext) {
  const { access, next } = proposal
  const service = access.state.services.find(row => row.id === next.service)!
  const participants = people(access.state, [next]).map(row => `${row.name} (${row.id})`)
  const now = coverage(next, access.state.members, ctx.now())
  const holder = (id: string | null) => id === null ? 'coverage gap' : access.state.members.find(row => row.id === id)!.name
  return {
    target: { id: next.id, name: next.name }, recipients: participants,
    items: [`Create coordination schedule for ${service.name} (${service.id}); native revision 0 → 1; paging remains OFF`,
      `Current primary: ${holder(now.primary)}; current backup: ${holder(now.backup)}`,
      ...(participants.length ? [`Schedule participants: ${participants.join(', ')}`] : ['No named participant assignments']),
    ],
  }
}

async function save(env: Bindings, ctx: ToolContext, proposal: ScheduleChange, operation: 'create' | 'update' | 'override', args: Record<string, unknown>) {
  const { access, snapshot, schedule, next, review } = proposal
  const receipt = schedule ? await scheduleReceipt(env, ctx, `oncall.schedules.${operation}`, args, schedule, next, access.state.revision) : null
  bound({ ...snapshot.archive, schedules: schedule ? snapshot.archive.schedules.map(row => row.id === schedule.id ? next : row) : [...snapshot.archive.schedules, next] })
  // Match native reviewed-apply recipients, including layer slots and PTO, without changing saved slots.
  const recipients = (row: Schedule): Schedule => ({ ...row, primary: { ...row.primary, members: [...row.primary.members, ...(row.layers ?? []).flatMap(layer => layer.rotation.members), ...(row.pto ?? []).flatMap(entry => entry.member === null ? [] : [entry.member])] } })
  const priorNotices = new Set((access.state.scheduleRecords ?? []).map(row => row.id))
  scheduleChanges(access.state, schedule ? [recipients(schedule)] : [], [recipients(next)], access.client?.id ?? access.member.id)
  const notices = (access.state.scheduleRecords ?? []).filter(row => row.kind === 'notice' && !priorNotices.has(row.id))
  const actor = nativeActor(access, ctx), at = new Date(ctx.now()).toISOString()
  const append = (kind: string, text: string) => access.state.audit.push({ id: crypto.randomUUID(), at, actor: actor.id, kind, text, metadata: { agent: actor.agent } } satisfies Entry)
  append('schedule-change', `Saved ${next.name} revision ${next.revision} (${operation}). ${review ? `Native review SHA-256 ${review.digest}, ${new Date(review.from).toISOString()} to ${new Date(review.to).toISOString()}. ` : ''}Paging remains OFF.`)
  // Schedule notices are undelivered native obligations. Their associated audit entries retain the machine, sponsor and actual policy approvers.
  for (const notice of notices) append('schedule-change-notice', `Recorded schedule-change notice ${notice.id}, ${next.name} revision ${next.revision}; no sender, paging OFF.`)
  access.guard = { sql: `${access.guard.sql} AND EXISTS(SELECT 1 FROM paging_control WHERE id=1 AND revision=?)`, values: [...access.guard.values, snapshot.revision] }
  nativeAudit(env, ctx, 'agent-schedule-' + operation, next.id)
  await persistNative(env, access, token => [
    env.DB.prepare('UPDATE paging_control SET revision=revision+1,write_token=? WHERE id=1 AND revision=? AND EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND write_token=?)').bind(token, snapshot.revision, token),
    putSchedule(env.DB, next, token),
    ...(receipt ? [receipt(token)] : []),
  ])
  const uri = coverageUri(next)
  ctx.emit('schedule.changed', uri, { schedule: next.id, service: next.service, revision: next.revision, paging: 'OFF', ...(review ? { reviewDigest: review.digest, from: review.from, to: review.to } : {}) })
  return { result: { schedule: next, ...(review ? { digest: review.digest, from: review.from, to: review.to, coverage: review.coverage } : { coverage: coverage(next, access.state.members, ctx.now()) }), people: people(access.state, [next]), notices: notices.map(row => row.id), paging: 'OFF' }, resources: [{ uri, name: `${next.name} coordination coverage` }] }
}

/** Existing native schedule creation, read, reviewed apply and override capabilities only. */
export function scheduleTools(env: Bindings): ToolDefinition[] {
  const mutations = (['update', 'override'] as const).map(operation => {
    const prepare = (args: Record<string, unknown>, ctx: ToolContext) => operation === 'update' ? reviewed(env, ctx, args, true) : overridden(env, ctx, args)
    return {
      name: `oncall.schedules.${operation}`, title: operation === 'update' ? 'Apply a reviewed coordination schedule' : 'Add a coordination coverage override',
      description: operation === 'update' ? 'Update an existing schedule using the exact digest returned by oncall.schedules.review for the complete proposal, current workspace and range. A digest is change-review evidence, never person approval. Paging stays OFF.' : 'Append a native primary or backup override to an existing schedule at its exact native revision. Explicit empty coverage uses member:null. This changes coordination only; paging stays OFF.',
      scope: 'schedules:write', readOnly: false, untrusted: true, classes: ['standard', 'sensitive', 'live'], clauses: ['OC-003', 'OC-011', 'OC-012', 'OC-024', 'OC-053'],
      inputSchema: operation === 'update' ? object({ ...reviewFields, digest: { type: 'string', pattern: '^[a-f0-9]{64}$' } }) : object({ id, revision, override }), outputSchema: { type: 'object' }, revisionType: 'integer',
      target: (args, ctx) => nativeCall(async () => ({ kind: 'schedule', id: (await savedSchedule(env, ctx, args, true)).schedule.id })),
      revision: (args, ctx) => nativeCall(async () => (await savedSchedule(env, ctx, args, true)).schedule.revision),
      classify: (args, ctx) => nativeCall(async () => {
        const current = await savedSchedule(env, ctx, args, true)
        const completed = await completedScheduleChange(env, ctx, `oncall.schedules.${operation}`, args, current.schedule, current.access.state.revision)
        return changeFacts(completed ? { ...current, ...completed } : await prepare(args, ctx), ctx)
      }),
      summary: (args, ctx) => nativeCall(async () => changeSummary(await prepare(args, ctx))),
      run: (args, ctx) => nativeCall(async () => save(env, ctx, await prepare(args, ctx), operation, args)),
    } satisfies ToolDefinition
  })
  return [
    {
      name: 'oncall.schedules.create', title: 'Create a coordination schedule', description: 'Create a native schedule with an unused identity and initial revision 0, within the granted service and owning-team authority. This preserves the existing native machine schedule capability. Paging stays OFF; subsequent updates require a native review digest.',
      scope: 'schedules:write', readOnly: false, untrusted: true, classes: ['standard', 'sensitive', 'live'], clauses: ['OC-003', 'OC-011', 'OC-012', 'OC-024', 'OC-053'],
      inputSchema: object({ schedule: { ...scheduleSchema, properties: { ...scheduleSchema.properties, revision: { type: 'integer', const: 0 } } } }), outputSchema: { type: 'object' }, revisionType: 'integer',
      revision: (args, ctx) => nativeCall(async () => { await created(env, ctx, args); return 0 }),
      // Replays still classify the proposed coverage under current native authority.
      // Unused-identity admission stays in revision, summary and execution;
      // a successful cached call has already created its schedule.
      classify: (args, ctx) => nativeCall(async () => changeFacts(await created(env, ctx, args, false), ctx)),
      summary: (args, ctx) => nativeCall(async () => createSummary(await created(env, ctx, args), ctx)),
      run: (args, ctx) => nativeCall(async () => save(env, ctx, await created(env, ctx, args), 'create', args)),
    },
    {
      name: 'oncall.schedules.read', title: 'Read coordination schedules', description: 'Read existing native schedules within the granted service scope, with only their referenced participant names. Paging stays OFF.',
      scope: 'schedules:read', readOnly: true, untrusted: true, classes: ['standard', 'sensitive'], clauses: ['OC-003', 'OC-011', 'OC-014', 'OC-053'],
      inputSchema: object({ id, service: id }, []), outputSchema: { type: 'object' },
      classify: (args, ctx) => nativeCall(async () => { const { access, schedules } = await readSchedules(env, ctx, args); return readFacts(access.state, schedules) }),
      run: (args, ctx) => nativeCall(async () => { const { access, schedules } = await readSchedules(env, ctx, args); return { result: { schedules, people: people(access.state, schedules), paging: 'OFF' } } }),
    },
    {
      name: 'oncall.schedules.coverage', title: 'Preview coordination coverage', description: 'Read side-effect-free native coverage and gaps over [from,to), at most 366 elapsed days. Uses current members and calendar-day/DST rules; this is not paging or delivery evidence.',
      scope: 'schedules:read', readOnly: true, untrusted: true, classes: ['standard', 'sensitive'], clauses: ['OC-003', 'OC-011', 'OC-012', 'OC-014', 'OC-024'],
      inputSchema: object({ id, from: clock, to: clock }), outputSchema: { type: 'object' },
      classify: (args, ctx) => nativeCall(async () => { const saved = await savedSchedule(env, ctx, args); preview(saved.schedule, saved.access.state.members, args.from as number, args.to as number); return readFacts(saved.access.state, [saved.schedule]) }),
      run: (args, ctx) => nativeCall(async () => { const saved = await savedSchedule(env, ctx, args); return { result: { id: saved.schedule.id, revision: saved.schedule.revision, from: args.from, to: args.to, coverage: preview(saved.schedule, saved.access.state.members, args.from as number, args.to as number), people: people(saved.access.state, [saved.schedule]), paging: 'OFF' } } }),
    },
    {
      name: 'oncall.schedules.review', title: 'Review an existing coordination schedule change', description: 'Compute the native coverage diff and SHA-256 digest without writing. Submit the same native revision, proposal and range to oncall.schedules.update. The digest binds all current members and the workspace revision; it grants no person approval.',
      scope: 'schedules:write', readOnly: true, untrusted: true, classes: ['standard', 'sensitive'], clauses: ['OC-003', 'OC-011', 'OC-014', 'OC-024'],
      inputSchema: object(reviewFields), outputSchema: { type: 'object' },
      classify: (args, ctx) => nativeCall(async () => { const value = await reviewed(env, ctx, args, false); return readFacts(value.access.state, [value.schedule, value.next], 1) }),
      run: (args, ctx) => nativeCall(async () => { const value = await reviewed(env, ctx, args, false); return { result: { ...value.review!, members: people(value.access.state, [value.schedule, value.next]), paging: 'OFF' } } }),
    },
    ...mutations,
  ]
}
