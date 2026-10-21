import assert from 'node:assert/strict'

// Outbound events: signed, durable, authorized at dispatch, deduplicable by operation ID, replayable without touching the incident.
export async function events({w, edge, owner, admin, responder, A, bearer, declare, ok, sleep, cookie}) {
 const ops = async (query = '') => ok(await owner('/api/outbox?limit=100' + query)).operations
 const byId = async id => (await ops()).find(op => op.id === id)
 const settle = async () => { for (let n = 0; n < 60; n++) { const all = await ops(); if (!all.some(op => op.state === 'sending' || (op.state === 'queued' && op.dueAt <= Date.now()))) return all; await sleep(250) } throw Error('delivery did not settle') }
 const due = id => w.sql(`UPDATE oc_outbox SET due_at=1 WHERE id='${id}'`)
 const dispatch = async () => ok(await owner('/api/outbox/dispatch', {}))
 const incidentOf = async id => ok(await owner('/api/state')).incidents.find(i => i.id === id)
 const newest = async type => (await ops()).find(op => op.type === type)

 // Hostile endpoint definitions are refused before anything is stored.
 const base = {name: 'Hostile', events: ['incident.triggered'], services: ['alpha'], revision: 0}
 for (const url of ['https://127.0.0.1/hook', 'https://localhost/hook', 'https://169.254.169.254/latest', 'https://10.0.0.5/hook', 'https://[::1]/hook', 'http://example.com/hook', 'https://user:pass@example.com/hook', 'https://example.com/hook?token=abc', 'https://example.com:8443/hook', 'https://metadata.internal/hook', 'ftp://example.com/hook', 'not a url', 'https://2130706433/hook'])
  ok(await owner('/api/webhooks', {...base, url}), 400)
 assert.equal(ok(await owner('/api/webhooks')).endpoints.length, 0)
 const created = ok(await owner('/api/webhooks', {name: 'Receiver', url: edge.url('/hook'), events: ['incident.triggered', 'incident.acknowledged', 'incident.reassigned', 'incident.resolved', 'incident.role_assigned', 'incident.followup_created', 'incident.followup_completed'], services: ['alpha'], revision: 0}), 201)
 const endpoint = created.endpoint; edge.secret('/hook', created.signingSecret)
 assert.ok(!JSON.stringify([ok(await owner('/api/webhooks')), ok(await owner('/api/archive')), ok(await owner('/api/state'))]).includes(created.signingSecret), 'the signing secret is shown once')
 assert.ok(!JSON.stringify(w.sql('SELECT * FROM oc_webhook_credentials')).includes(created.signingSecret), 'and stored only encrypted')

 // Every event type reaches the receiver, signed, with a stable operation ID and minimal content.
 const t = ok(await declare(A.token, 'alpha', 'Events checkout', 'events-declare'), 201)
 let incident = ok(await bearer(A.token, `/api/v1/incidents/${t.id}/acknowledge`, {revision: t.revision, responsible: responder.id, summary: 'ack'}))
 incident = ok(await bearer(A.token, `/api/v1/incidents/${t.id}/reassign`, {revision: incident.revision, member: admin.id, reason: 'swap'}))
 incident = ok(await bearer(A.token, `/api/v1/incidents/${t.id}/roles`, {revision: incident.revision, role: 'scribe', member: responder.id, reason: 'notes'}))
 const follow = ok(await bearer(A.token, `/api/v1/incidents/${t.id}/actions`, {revision: incident.revision, title: 'Follow up', owner: responder.id, due: '2026-12-01', completionPolicy: 'evidence', priority: 'P2'}), 201)
 incident = ok(await bearer(A.token, '/api/v1/incidents/' + t.id))
 ok(await bearer(A.token, `/api/v1/incidents/${t.id}/actions/${follow.id}/complete`, {revision: incident.revision, evidence: 'https://example.test/done'}))
 incident = ok(await bearer(A.token, '/api/v1/incidents/' + t.id))
 ok(await bearer(A.token, `/api/v1/incidents/${t.id}/resolve`, {revision: incident.revision, evidence: 'https://example.test/rec', summary: 'secret-summary-text'}))
 let all = await settle()
 const mine = all.filter(op => op.payload.incident.id === t.id)
 assert.deepEqual(new Set(mine.map(op => op.type)), new Set(endpoint.events), 'trigger, acknowledgment, reassignment, role, follow-up and resolution events')
 assert.ok(mine.every(op => op.state === 'sent' && op.owner === admin.id && op.maxAttempts === 5 && op.origin.id === A.account.id))
 const received = edge.seen.filter(s => s.payload.incident.id === t.id)
 assert.equal(received.length, mine.length)
 for (const s of received) {
  assert.ok(s.verified, 'valid HMAC over timestamp.body'); assert.equal(s.headers['x-oncall-operation-id'], s.payload.operationId); assert.equal(s.headers['idempotency-key'], s.payload.operationId)
  assert.equal(s.headers['x-oncall-event-type'], s.payload.type); assert.match(s.payload.notice, /not a human acknowledgment/)
  assert.ok(!/secret-summary-text|Follow up|runbook|timeline/i.test(s.body.replace(/"title":"Follow up"/g, '')), 'payloads are minimized')
 }
 assert.equal(new Set(received.map(s => s.payload.operationId)).size, received.length)
 assert.equal((await incidentOf(t.id)).state, 'resolved', 'delivery never changes the incident')
 // A human change through the ordinary UI door raises the same event.
 const human = ok(await owner('/api/command', {type: 'declare', service: 'alpha', severity: 'warning', title: 'Human declared', summary: 'ui', alerts: []}))
 await settle(); assert.equal((await ops()).find(op => op.payload.incident.id === human.id).origin.kind, 'member')
 // Events for a service outside an endpoint's scope are never queued.
 const beta = ok(await owner('/api/command', {type: 'declare', service: 'beta', severity: 'warning', title: 'Beta only', summary: 'x', alerts: []})); await sleep(500)
 assert.ok(!(await ops()).some(op => op.payload.incident.id === beta.id))

 // A failing receiver: the operation stays queued, due later, and survives a restart with the same identity.
 edge.mode('fail500')
 const retryIncident = ok(await declare(A.token, 'alpha', 'Retry me', 'events-retry'), 201); await settle()
 let retry = (await ops()).find(op => op.payload.incident.id === retryIncident.id)
 assert.equal(retry.state, 'queued'); assert.equal(retry.attempts, 1); assert.ok(retry.dueAt > Date.now() + 20000)
 await w.stop(); await w.start()
 assert.equal((await byId(retry.id)).state, 'queued', 'queued work survives a restart')
 edge.mode('ok'); assert.equal((await dispatch()).sent, 0, 'not yet due: a retry is never sent early')
 due(retry.id); assert.equal((await dispatch()).sent, 1)
 retry = await byId(retry.id); assert.equal(retry.state, 'sent'); assert.equal(retry.attempts, 2)
 const tries = edge.seen.filter(s => s.payload.operationId === retry.id)
 assert.deepEqual(tries.map(s => [s.headers['x-oncall-attempt'], s.duplicate]), [['1', false], ['2', true]], 'the receiver can deduplicate on the operation ID')
 assert.equal(JSON.stringify(tries[0].payload), JSON.stringify(tries[1].payload), 'the frozen payload is identical on every attempt')

 // A rejecting receiver is terminal; replay is protected, keeps identity and never touches the incident.
 edge.mode('reject400')
 const rejected = ok(await declare(A.token, 'alpha', 'Reject me', 'events-reject'), 201); await settle()
 let failed = (await ops()).find(op => op.payload.incident.id === rejected.id); assert.equal(failed.state, 'failed'); assert.equal(failed.reason, 'rejected-by-receiver')
 const priorIncident = await incidentOf(rejected.id), priorCount = ok(await owner('/api/state')).incidents.length
 ok(await bearer(A.token, `/api/outbox/${failed.id}/replay`, {reason: 'x'}), 401)
 const viewer = ok(await owner('/api/members', {name: 'Api viewer', role: 'viewer', password: 'synthetic-api-viewer-password'}), 201)
 const viewerSession = (await w.request('/api/login', {name: 'Api viewer', password: 'synthetic-api-viewer-password'})).cookie
 ok(await w.request(`/api/outbox/${failed.id}/replay`, {reason: 'x'}, viewerSession), 403); ok(await w.request('/api/outbox', undefined, viewerSession), 403)
 ok(await owner(`/api/outbox/${failed.id}/replay`, {}), 400)
 edge.mode('ok'); const replayed = ok(await owner(`/api/outbox/${failed.id}/replay`, {reason: 'Receiver fixed'})); assert.equal(replayed.id, failed.id); assert.equal(replayed.replays, 1)
 await settle(); failed = await byId(failed.id); assert.equal(failed.state, 'sent')
 assert.deepEqual(await incidentOf(rejected.id), priorIncident, 'replay does not repeat the incident mutation'); assert.equal(ok(await owner('/api/state')).incidents.length, priorCount)
 assert.equal(edge.seen.filter(s => s.payload.operationId === failed.id).length, 2); assert.ok(edge.seen.filter(s => s.payload.operationId === failed.id).at(-1).headers['x-oncall-replay'] === '1')

 // Redirects are never followed.
 edge.mode('redirect'); const redirected = ok(await declare(A.token, 'alpha', 'Redirect me', 'events-redirect'), 201); await settle()
 assert.equal((await ops()).find(op => op.payload.incident.id === redirected.id).reason, 'redirect-refused')

 // Dispatch rechecks the endpoint address: a definition that is no longer permitted is refused without a request.
 edge.mode('ok'); const stored = w.sql(`SELECT data FROM oc_webhook_endpoints WHERE id='${endpoint.id}'`)[0].data
 w.sql(`UPDATE oc_webhook_endpoints SET data=replace(data,'${edge.url('/hook')}','https://169.254.169.254/hook') WHERE id='${endpoint.id}'`)
 const before = edge.seen.length, unsafe = ok(await declare(A.token, 'alpha', 'Unsafe target', 'events-unsafe'), 201); await settle()
 assert.equal((await ops()).find(op => op.payload.incident.id === unsafe.id).reason, 'unsafe-endpoint'); assert.equal(edge.seen.length, before)
 w.sql(`UPDATE oc_webhook_endpoints SET data='${stored.replaceAll("'", "''")}' WHERE id='${endpoint.id}'`)

 // An ambiguous outcome: the process dies while the receiver holds the request. The lease expires into uncertain, never sent.
 edge.mode('hang'); const held = ok(await declare(A.token, 'alpha', 'Hold me', 'events-hang'), 201)
 for (let n = 0; n < 80 && !edge.seen.some(s => s.payload.incident.id === held.id); n++) await sleep(250)
 await w.stop(); edge.release(); await w.start(); edge.mode('ok')
 let hung = (await ops()).find(op => op.payload.incident.id === held.id); assert.equal(hung.state, 'sending'); assert.equal(hung.started, true)
 await sleep(46000); await dispatch()
 hung = await byId(hung.id); assert.equal(hung.state, 'uncertain'); assert.ok(hung.history.at(-1).reason.includes('lease-expired'))
 due(hung.id); await dispatch(); assert.equal((await byId(hung.id)).state, 'sent', 'an uncertain operation is retried with the same operation ID')
 const hungSeen = edge.seen.filter(s => s.payload.operationId === hung.id); assert.deepEqual(hungSeen.map(s => s.duplicate), [false, true])
 const audit = ok(await owner('/api/audit/export')).rows
 for (const outcome of ['uncertain']) assert.ok(audit.some(row => row.feature === 'outbox' && row.outcome === outcome), 'the lease expiry is durable audit evidence')
 assert.ok(audit.some(row => row.kind === 'outbox.sent' && row.outcome === 'accepted') && audit.some(row => row.kind === 'outbox.refused' && row.outcome === 'refused') && audit.some(row => row.kind === 'outbox.replay' && row.outcome === 'accepted'))

 // Revocation applies at dispatch: a revoked token, then a revoked endpoint, refuse queued work.
 const X = ok(await owner('/api/service-accounts', {name: 'Short lived', services: ['alpha'], permissions: ['read', 'incidents:write'], revision: 0}), 201)
 edge.mode('fail500'); const queued = ok(await declare(X.token, 'alpha', 'Token revoked while queued', 'events-token'), 201); await settle()
 const tokenOp = (await ops()).find(op => op.payload.incident.id === queued.id); assert.equal(tokenOp.state, 'queued')
 ok(await owner(`/api/service-accounts/${X.account.id}/revoke`, {revision: 1})); assert.equal((await bearer(X.token, '/api/v1/me')).status, 401)
 edge.mode('ok'); due(tokenOp.id); const seenBefore = edge.seen.length; assert.equal((await dispatch()).refused, 1)
 assert.equal((await byId(tokenOp.id)).reason, 'token-revoked'); assert.equal(edge.seen.length, seenBefore)
 edge.mode('fail500'); ok(await owner(`/api/command`, {type: 'transition', incident: human.id, revision: human.revision, state: 'acknowledged', summary: 'ack'})); await settle()
 const endpointOp = await newest('incident.acknowledged'); assert.equal(endpointOp.state, 'queued')
 ok(await owner(`/api/webhooks/${endpoint.id}/revoke`, {revision: endpoint.revision})); edge.mode('ok'); due(endpointOp.id)
 const afterRevoke = edge.seen.length; await dispatch(); assert.equal((await byId(endpointOp.id)).reason, 'endpoint-revoked'); assert.equal(edge.seen.length, afterRevoke)
 // Approving again is a fresh deliberate act, and then replay delivers the very same operation.
 ok(await owner(`/api/outbox/${endpointOp.id}/replay`, {reason: 'before approval'})); await settle(); assert.equal((await byId(endpointOp.id)).reason, 'endpoint-revoked')
 const current = ok(await owner('/api/webhooks')).endpoints[0], approved = ok(await owner(`/api/webhooks/${endpoint.id}/rotate`, {revision: current.revision})); edge.secret('/hook', approved.signingSecret)
 ok(await owner(`/api/outbox/${endpointOp.id}/replay`, {reason: 'after approval'})); await settle(); assert.equal((await byId(endpointOp.id)).state, 'sent')
 assert.ok(edge.seen.at(-1).verified, 'the rotated secret signs the delivery')

 // Atomicity: when the outbox or the permanent audit cannot be written, nothing is accepted.
 const target = ok(await declare(A.token, 'alpha', 'Atomic target', 'events-atomic'), 201); await settle()
 const acknowledged = w.sql("SELECT COUNT(*) AS n FROM oc_admin_audit WHERE kind='service-api.incident.acknowledge' AND outcome='accepted'")[0].n
 const snapshot = async () => JSON.stringify([await incidentOf(target.id), w.sql('SELECT COUNT(*) AS n FROM oc_outbox'), w.sql('SELECT COUNT(*) AS n FROM oc_api_idempotency')])
 for (const trigger of ['CREATE TRIGGER block_outbox BEFORE INSERT ON oc_outbox BEGIN SELECT RAISE(ABORT,\'forced outbox failure\'); END', 'CREATE TRIGGER block_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.kind=\'service-api.incident.acknowledge\' BEGIN SELECT RAISE(ABORT,\'forced audit failure\'); END']) {
  const name = trigger.split(' ')[2]; w.sql(trigger)
  const prior = await snapshot()
  assert.equal((await bearer(A.token, `/api/v1/incidents/${target.id}/acknowledge`, {revision: target.revision, responsible: responder.id, summary: 'atomic'}, 'atomic-key')).status, 503)
  assert.equal(await snapshot(), prior, name + ': no accepted state without its audit entry and outbox events')
  assert.equal(w.sql("SELECT COUNT(*) AS n FROM oc_admin_audit WHERE kind='service-api.incident.acknowledge' AND outcome='accepted'")[0].n,acknowledged,'a rolled-back change has no accepted audit fact')
  w.sql('DROP TRIGGER ' + name)
 }
 ok(await bearer(A.token, `/api/v1/incidents/${target.id}/acknowledge`, {revision: target.revision, responsible: responder.id, summary: 'atomic'}, 'atomic-key'))
 await settle(); assert.equal((await ops()).filter(op => op.payload.incident.id === target.id && op.type === 'incident.acknowledged').length, 1)

 // Erasure of an identified subject keeps unlinkable labels and removes every reference.
 ok(await owner(`/api/service-accounts/${A.account.id}/erase`, {revision: 1, confirmation: 'erase ' + A.account.id}), 409)
 ok(await owner(`/api/service-accounts/${A.account.id}/revoke`, {revision: 1}))
 ok(await owner(`/api/service-accounts/${A.account.id}/erase`, {revision: 2, confirmation: 'erase ' + A.account.id}))
 const everything = JSON.stringify([ok(await owner('/api/state')), ok(await owner('/api/archive')), ok(await owner('/api/audit/export')), await ops(), w.sql('SELECT * FROM oc_audit_identities'), w.sql('SELECT * FROM oc_api_idempotency')])
 assert.ok(!everything.includes(A.account.id), 'no export or table names the erased account')
 assert.ok(ok(await owner('/api/audit/export')).rows.some(row => row.kind.startsWith('service-api.') && /^anon-/.test(row.actor)), 'permanent labels and operation facts survive')
 assert.equal((await incidentOf(t.id)).timeline[0].actor, 'erased-service-account')
 console.log('PASS OC-053 signed durable outbox: delivery, retry, restart, uncertainty, replay, dispatch-time revocation, atomic rollback and erasure')
}
