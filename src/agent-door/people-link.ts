import { runtimeBindings, type Bindings } from '../auth.server.ts'
import { admitted } from '../base/setup-state.ts'
import { rejectedResponse } from '../base/rejected-response.ts'
import { auditIdentity, auditKind } from '../audit-store.ts'
import { nativeMember } from '../native-member.ts'
import type { Member } from '../family/response-operations/domain.ts'
import { AuthError } from '../modules/operator-auth/index.mjs'
import { readInput } from '../modules/operator-auth/input.mjs'
import { pageStyle } from '../modules/agent-door/page-style.ts'
import type { SettingsDocument } from '../modules/business-settings/types.ts'
import { claimedOncallOwner, type ClaimedOncallOwner } from './people.ts'

type Settings = { rev: number; token: string; document: string | null; owner_id: string | null; stopped: number }
type TeamRow = { email: string; business_id: string; business_role: 'admin' | 'member'; operator_id: string | null; state: string; invite: number }
type NativeRow = { id: string; data: string }
type Proof = { sql: string; args: unknown[] }
const headers = { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff', 'x-robots-tag': 'noindex, nofollow' }
const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
class LinkRefusal extends Error {
  constructor(readonly code: string, readonly status = 403) { super(code) }
}

function ownerProof(owner: ClaimedOncallOwner, digest: string): Proof {
  return { sql: `EXISTS(SELECT 1 FROM oc_current_sessions s
    JOIN oa_sessions n ON n.id=s.operator_session JOIN oa_operators o ON o.id=n.operator_id
    JOIN oa_bootstrap b ON b.claim_id=o.id JOIN operator_members l ON l.operator_id=o.id
    JOIN oc_members m ON m.id=l.member_id
    WHERE s.token=? AND s.member=? AND s.expires>? AND n.id=? AND n.revoked_at IS NULL
    AND n.expires_at>? AND n.operator_version=o.version AND o.id=? AND o.version=?
    AND o.role='owner' AND o.status='active' AND b.singleton=1 AND l.member_id=? AND m.data=?
    AND json_extract(m.data,'$.active')=1 AND json_extract(m.data,'$.role')='admin')`,
  args: [digest, owner.id, Date.now(), digest.slice('native:'.length), Date.now(), owner.operatorId, owner.operatorVersion, owner.id, owner.data] }
}

const readSettings = (env: Bindings) => env.DB.prepare('SELECT rev,token,document,owner_id,stopped FROM bs_settings WHERE singleton=1').first<Settings>()
function settingsProof(settings: Settings): Proof {
  return { sql: 'EXISTS(SELECT 1 FROM bs_settings WHERE singleton=1 AND stopped=0 AND rev=? AND token=? AND document=? AND owner_id IS ?)',
    args: [settings.rev, settings.token, settings.document, settings.owner_id] }
}
async function allowed(env: Bindings, proof: Proof): Promise<boolean> {
  return !!await env.DB.prepare(`SELECT 1 AS allowed WHERE ${proof.sql}`).bind(...proof.args).first()
}

function signedRows(settings: Settings | null, rows: TeamRow[]): TeamRow[] {
  if (!settings?.document || settings.stopped) return []
  const document = JSON.parse(settings.document) as SettingsDocument
  if (document.v !== 1 || document.rev !== settings.rev) return []
  // team:null deliberately leaves the previously applied roster intact.
  return rows.filter(row => row.business_id && row.business_id !== settings.owner_id &&
    ['admin', 'member'].includes(row.business_role) && (document.team === null || document.team.some(member =>
      member.id === row.business_id && member.email === row.email && member.role === row.business_role)))
}

const localEligibility = `json_extract(m.data,'$.id')=m.id AND json_extract(m.data,'$.active')=1
  AND COALESCE(json_extract(m.data,'$.erased'),0)=0 AND COALESCE(json_extract(m.data,'$.machine'),0)=0
  AND json_extract(m.data,'$.role') IN ('admin','responder','viewer','stakeholder')
  AND EXISTS(SELECT 1 FROM credentials c WHERE c.member=m.id)
  AND NOT EXISTS(SELECT 1 FROM operator_members l WHERE l.member_id=m.id)
  AND NOT EXISTS(SELECT 1 FROM bs_team t WHERE t.operator_id=m.id)`
const compatible = (businessRole: string, nativeRole: string) => businessRole === 'admin'
  ? nativeRole === 'admin' : businessRole === 'member' && ['responder', 'viewer', 'stakeholder'].includes(nativeRole)

function page(settings: Settings | null, rows: TeamRow[], locals: NativeRow[], names: Map<string, string>): Response {
  const nonce = crypto.randomUUID().replaceAll('-', '')
  const accounts = locals.map(row => ({ ...row, member: JSON.parse(row.data) as Member }))
  const content = rows.map((row, index) => {
    const choices = accounts.filter(account => compatible(row.business_role, account.member.role))
    const status = row.operator_id
      ? `<p>Linked workspace account: <strong>${escape(names.get(row.operator_id) ?? row.operator_id)}</strong>. State: ${escape(row.state)}.</p>`
      : `<p>No workspace account is linked.</p>`
    let form = ''
    if (!row.operator_id && row.state === 'conflict') form = choices.length
      ? `<form action="/agents/people" method="post"><input type="hidden" name="revision" value="${escape(settings!.rev)}"><input type="hidden" name="businessId" value="${escape(row.business_id)}"><label for="member-${index}">Workspace account for ${escape(row.email)}</label><select id="member-${index}" name="memberId" required aria-describedby="account-help"><option value="">Choose an existing account</option>${choices.map(account => `<option value="${escape(account.id)}">${escape(account.member.name)} · ${escape(account.member.role)} · ${escape(account.id)}</option>`).join('')}</select><p><button type="submit">Link this teammate</button></p></form>`
      : '<p>No eligible workspace account is available for this Business role.</p>'
    return `<li><h2>${escape(row.email)}</h2><dl><dt>Business person ID</dt><dd><code>${escape(row.business_id)}</code></dd><dt>Business role</dt><dd>${escape(row.business_role)}</dd></dl>${status}${form}</li>`
  }).join('')
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Business people · Oncall</title><style nonce="${nonce}">${pageStyle}
    body{font-size:15px}form,select{min-width:0}button{border-radius:999px}.product-mark{gap:12px;color:var(--rer-text);font-weight:600;text-decoration:none}.product-mark img{width:32px;height:40px;flex:none}li,form{overflow-wrap:anywhere}
    </style><link rel="stylesheet" href="/rer-theme.css"></head><body><a class="skip" href="#main">Skip to content</a><header><a class="product-mark" href="/app"><img src="/brand/mark-paper.svg" alt="" width="32" height="40">Oncall</a><nav aria-label="Main"><a href="/agents">Back to Agents</a></nav></header><main id="main"><h1>Business people</h1><p>Link a Business teammate to the existing workspace account they use to sign in. The installation owner chooses each account explicitly.</p><p id="account-help">Business admins need a workspace admin account. Other teammates can use responder, viewer or stakeholder accounts. Each account keeps its current workspace role and login name.</p>${rows.length ? `<p>Applied Business revision: ${escape(settings!.rev)}.</p><section aria-label="Applied Business teammates"><ul class="stack">${content}</ul></section>` : '<section><h2>No applied teammate IDs</h2><p>Apply signed Business settings containing teammate person IDs before linking workspace accounts.</p></section>'}</main></body></html>`,
  { headers: { ...headers, 'content-type': 'text/html; charset=utf-8', 'content-security-policy': `default-src 'none'; style-src 'self' 'nonce-${nonce}'; font-src 'self'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'` } })
}

/** Explicit native-owner linking is the sole first-binding door for teammates. */
export async function businessPeopleResponse(original: Bindings, request: Request): Promise<Response | null> {
  const url = new URL(request.url), api = url.pathname === '/api/rer/people-link'
  if (!api && url.pathname !== '/agents/people') return null
  const env = runtimeBindings(original)
  try {
    if (!admitted(request, env.AUTH_ORIGIN)) throw new LinkRefusal('origin_refused')
    if (request.headers.has('authorization')) throw new LinkRefusal('person_session_required')
    if (api ? request.method !== 'POST' : !['GET', 'HEAD', 'POST'].includes(request.method)) throw new LinkRefusal('method_not_allowed', 405)
    if (request.method === 'POST' && (request.headers.get('origin') !== env.AUTH_ORIGIN || url.search)) throw new LinkRefusal('origin_refused')
    if (!await claimedOncallOwner(env)) throw new LinkRefusal('owner_required')
    const native = await nativeMember(env, request)
    if (!native) throw new LinkRefusal('unauthenticated', 401)
    const owner = await claimedOncallOwner(env)
    if (!owner || native.member.id !== owner.id || native.member.role !== 'admin' || !native.member.active) throw new LinkRefusal('owner_required')
    const proof = ownerProof(owner, native.digest)
    if (!await allowed(env, proof)) throw new LinkRefusal('unauthenticated', 401)
    auditIdentity(env.DB, { actor: { kind: 'member', id: owner.id }, source: { kind: 'door', id: 'business-people' } })
    auditKind(env.DB, 'member.business-link')
    const [settings, team] = await Promise.all([readSettings(env), env.DB.prepare(`SELECT email,business_id,business_role,operator_id,state,invite
      FROM bs_team WHERE business_id IS NOT NULL ORDER BY email`).all<TeamRow>()])
    if (settings?.stopped) throw new LinkRefusal('business_stopped', 409)
    const rows = signedRows(settings, team.results)
    if (request.method !== 'POST') {
      const [locals, allNames] = await Promise.all([
        env.DB.prepare(`SELECT m.id,m.data FROM oc_members m WHERE ${localEligibility} AND m.id<>? ORDER BY json_extract(m.data,'$.name'),m.id`).bind(owner.id).all<NativeRow>(),
        env.DB.prepare('SELECT id,json_extract(data,\'$.name\') AS name FROM oc_members').all<{ id: string; name: string }>(),
      ])
      if (!await allowed(env, proof)) throw new LinkRefusal('authority_changed', 401)
      if (settings && !await allowed(env, settingsProof(settings))) throw new LinkRefusal('revision_conflict', 409)
      const response = page(settings, rows, locals.results, new Map(allNames.results.map(row => [row.id, row.name])))
      return request.method === 'HEAD' ? new Response(null, { headers: response.headers }) : response
    }
    if (!settings?.document) throw new LinkRefusal('business_settings_required', 409)
    const media = request.headers.get('content-type')?.split(';')[0]
    if (media !== (api ? 'application/json' : 'application/x-www-form-urlencoded')) throw new LinkRefusal('unsupported_media_type', 415)
    const input = await readInput(request)
    if (Object.keys(input).length !== 3 || Object.keys(input).some(key => !['businessId', 'memberId', 'revision'].includes(key)) ||
      typeof input.businessId !== 'string' || !input.businessId.trim() || typeof input.memberId !== 'string' || !input.memberId.trim()) throw new LinkRefusal('invalid_input', 400)
    const revision = api ? input.revision : typeof input.revision === 'string' && /^(?:0|[1-9]\d*)$/.test(input.revision) ? Number(input.revision) : null
    if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 0) throw new LinkRefusal('invalid_input', 400)
    if (revision !== settings.rev) throw new LinkRefusal('revision_conflict', 409)
    const row = rows.find(value => value.business_id === input.businessId)
    if (!row) throw new LinkRefusal('business_person_unavailable', 409)
    if (row.operator_id !== null || row.state !== 'conflict') throw new LinkRefusal('mapping_conflict', 409)
    const target = await env.DB.prepare(`SELECT m.id,m.data FROM oc_members m WHERE m.id=? AND m.id<>? AND ${localEligibility}`)
      .bind(input.memberId, owner.id).first<NativeRow>()
    if (!target || !compatible(row.business_role, (JSON.parse(target.data) as Member).role)) throw new LinkRefusal('native_member_unavailable', 409)
    const currentSettings = settingsProof(settings)
    const guard: Proof = { sql: `(${proof.sql}) AND (${currentSettings.sql})
      AND EXISTS(SELECT 1 FROM bs_team WHERE email=? AND business_id=? AND business_role=?
        AND operator_id IS NULL AND state=? AND invite=?)
      AND EXISTS(SELECT 1 FROM oc_members m WHERE m.id=? AND m.data=? AND m.id<>? AND ${localEligibility})`,
    args: [...proof.args, ...currentSettings.args, row.email, row.business_id, row.business_role, row.state, row.invite, target.id, target.data, owner.id] }
    auditIdentity(env.DB, { subject: { kind: 'business-person', id: row.business_id }, namedMember: { kind: 'member', id: target.id } })
    try {
      await env.DB.batch([
        env.DB.prepare(`UPDATE bs_team SET operator_id=?,state='active' WHERE business_id=? AND ${guard.sql}`)
          .bind(target.id, row.business_id, ...guard.args),
        env.DB.prepare('INSERT INTO bs_assert(value) VALUES(CASE WHEN changes()=1 THEN 1 ELSE NULL END)'),
        env.DB.prepare("INSERT INTO bs_audit(actor,action,changed_at) VALUES(?,'person-linked',?)").bind(owner.id, new Date().toISOString()),
        env.DB.prepare('DELETE FROM bs_assert'),
      ])
    } catch (error) {
      if (!await allowed(env, proof)) throw new LinkRefusal('authority_changed', 401)
      if (!await allowed(env, currentSettings)) throw new LinkRefusal('revision_conflict', 409)
      if (!await allowed(env, guard)) throw new LinkRefusal('mapping_conflict', 409)
      throw error
    }
    return new Response(null, { status: 303, headers: { ...headers, location: '/agents/people' } })
  } catch (error) {
    const known = error instanceof LinkRefusal || error instanceof AuthError
    const code = known ? error.code : 'people_link_unavailable', status = known ? error.status : 503
    const response = await rejectedResponse(request, Response.json({ code }, { status, headers }))
    // The shared discard helper uses text for oversized/stalled transports.
    // This door keeps every refusal in its documented {code} envelope.
    return response.headers.get('content-type')?.startsWith('application/json') ? response
      : Response.json({ code: response.status === 413 ? 'input_too_large' : response.status === 408 ? 'request_timeout' : code }, { status: response.status, headers })
  }
}
