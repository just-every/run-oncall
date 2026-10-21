import assert from 'node:assert/strict'
import {localWorker} from './worker.mjs'

// Archive restore into a fresh installation: records and delivery history survive; tokens, signing secrets, approvals and automatic sends do not.
export async function restore({w, edge, owner, ok, sleep}) {
 edge.mode('fail500')
 const queued = ok(await owner('/api/command', {type: 'declare', service: 'alpha', severity: 'warning', title: 'Queued at export', summary: 'x', alerts: []}))
 for (let n = 0; n < 40 && !(ok(await owner('/api/outbox')).operations.some(op => op.payload.incident.id === queued.id && op.state === 'queued' && op.attempts === 1)); n++) await sleep(250)
 const archive = ok(await owner('/api/archive')), checkpoint = ok(await owner('/api/recovery/checkpoint'))
 assert.ok(archive.outbox.length > 10 && checkpoint.coordination.outbox.length === archive.outbox.length, 'the archive and checkpoint carry delivery history')
 assert.ok(archive.outbox.some(op => op.state === 'queued'))
 const secrets = JSON.stringify([archive, checkpoint]); assert.ok(!/ocsa_|whsec_/.test(secrets), 'no token or signing secret travels')
 const fresh = await localWorker()
 try {
  let cookie = (await fresh.request('/api/setup', {name: 'Receiving owner', password: 'synthetic-receiving-password'})).cookie
  const target = (path, data) => fresh.request(path, data, cookie), admin = archive.members.find(m => m.role === 'admin')
  ok(await target('/api/restore', {mode: 'replace', archive: {...archive, outbox: [{...archive.outbox[0], endpoint: 'missing'}]}, adminMapping: admin.id}), 400)
  const restoredSession = await target('/api/restore', {mode: 'replace', archive, adminMapping: admin.id}); ok(restoredSession); cookie = restoredSession.cookie
  const state = ok(await target('/api/state'))
  assert.deepEqual(state.serviceAccounts.map(a => a.id).sort(), archive.serviceAccounts.map(a => a.id).sort(), 'service-account records survive')
  assert.ok(state.serviceAccounts.every(a => !a.active) && state.webhookEndpoints.every(e => !e.active), 'but restored definitions are inactive')
  for (const table of ['oc_api_credentials', 'oc_webhook_credentials', 'oc_api_idempotency']) assert.equal(fresh.sql(`SELECT COUNT(*) AS n FROM ${table}`)[0].n, 0)
  const restored = ok(await target('/api/outbox?limit=100')).operations
  assert.deepEqual(restored.map(op => op.id).reverse(), archive.outbox.map(op => op.id), 'exact delivery history')
  for (const op of restored) { const was = archive.outbox.find(candidate => candidate.id === op.id); assert.equal(JSON.stringify(op.payload), JSON.stringify(was.payload)); assert.equal(op.state, ['queued', 'sending', 'uncertain', 'interrupted', 'held'].includes(was.state) ? 'held' : was.state) }
  assert.ok(restored.some(op => op.state === 'held'))
  const seen = edge.seen.length; edge.mode('ok')
  assert.deepEqual(Object.values(ok(await target('/api/outbox/dispatch', {}))).reduce((a, b) => a + b, 0), 0, 'no automatic send resumes')
  const held = restored.find(op => op.state === 'held')
  ok(await target(`/api/outbox/${held.id}/replay`, {reason: 'before approval'})); ok(await target('/api/outbox/dispatch', {}))
  assert.equal((ok(await target('/api/outbox')).operations.find(op => op.id === held.id)).reason, 'endpoint-inactive'); assert.equal(edge.seen.length, seen)
  const endpoint = state.webhookEndpoints[0], approved = ok(await target(`/api/webhooks/${endpoint.id}/rotate`, {revision: endpoint.revision})); edge.secret('/hook', approved.signingSecret)
  ok(await target(`/api/outbox/${held.id}/replay`, {reason: 'after approval'})); ok(await target('/api/outbox/dispatch', {}))
  assert.equal((ok(await target('/api/outbox')).operations.find(op => op.id === held.id)).state, 'sent'); assert.ok(edge.seen.at(-1).verified)
  assert.equal(edge.seen.at(-1).payload.operationId, held.id, 'the restored operation keeps its identity')
  console.log('PASS OC-053 restore: records and delivery history survive; tokens, secrets, approvals and automatic sends do not')
 } finally { await fresh.close() }
}
