import assert from 'node:assert/strict'
import { localWorker } from './worker.mjs'
import { managedSeed } from './managed.mjs'

const worker = await localWorker({ RER_DEMO: '1' })
let readiness
const ok = (result, status = 200) => {
  assert.equal(result.status, status, JSON.stringify(result.value))
  return result.value
}
try {
  const owner = await worker.request('/auth/bootstrap', { token: worker.vars.SETUP_TOKEN, displayName: 'Alex Morgan' }, undefined, { 'CF-Connecting-IP': '127.0.0.1' })
  ok(owner, 303)
  const req = (path, input) => worker.request(path, input, owner.cookie, { 'CF-Connecting-IP': '127.0.0.1' })
  readiness = ok(await req('/api/readiness'))
  const state = ok(await req('/api/state'))
  assert.ok(state.members.length >= 4 && state.members.length <= 6)
  assert.equal(state.incidents.filter(item => item.state === 'resolved').length, 2)
  const incident = state.incidents.find(item => item.state !== 'resolved')
  assert.ok(incident.timeline.some(event => event.text.includes('Page sent')))
  const paging = ok(await req('/api/paging/state'))
  assert.ok(paging.schedules.some(schedule => schedule.primary.periodDays === 7 && schedule.overrides.length))
  ok(await req('/api/command', { type: 'transition', incident: incident.id, revision: incident.revision,
    state: 'acknowledged', summary: 'Investigating the certificate rotation' }))
  const page = ok(await req('/api/paging/jobs', { incident: incident.id }))
  assert.equal(page.status, 'sent')
  assert.deepEqual(new Set(page.sends.map(send => send.channel)), new Set(['sms', 'voice', 'push', 'email']))
  assert.ok(page.sends.every(send => send.status === 'sent'))
  for (const channel of ['sms', 'voice', 'push', 'email'])
    assert.equal(ok(await req('/api/delivery', { incident: incident.id, channel })).sends[0].status, 'sent')
  const changed = ok(await req('/api/state')).incidents.find(item => item.id === incident.id)
  assert.equal(changed.state, 'acknowledged')
  assert.equal(changed.timeline.filter(event => event.text.includes('Page sent')).length, 6)
  ok(await req('/auth/magic-link', { email: worker.vars.OWNER_EMAIL }), 202)
  ok(await req('/api/paging/jobs', { incident: 'missing' }), 404)
  ok(await worker.request('/api/paging/jobs', { incident: incident.id }), 401)
  console.log('Demo HTTP flow passed: seeded rotations, acknowledgment, page/SMS/voice/push/email sent, timeline and suppressed mail; auth and invalid incident checks remain real.')
} finally {
  await worker.close()
}

const dev = await managedSeed()
try {
  await dev.command(['setup', '--non-interactive', '--port', String(dev.port), '--owner-email', worker.vars.OWNER_EMAIL])
  await dev.startHttp()
  const cookie = await dev.owner()
  ok(await dev.request('/api/session', undefined, cookie))
  const report = ok(await dev.request('/api/readiness', undefined, cookie))
  assert.deepEqual(report.release, readiness.release, 'the development Worker serves the same release identity as the emitted Worker')
  assert.deepEqual(report.matrix.map(row => [row.id, row.state]), readiness.matrix.map(row => [row.id, row.state]))
  assert.deepEqual(report.signals.map(row => row.id), readiness.signals.map(row => row.id))
  assert.deepEqual(report.pagerCoverage, readiness.pagerCoverage)
  console.log('Development HTTP door passed: configured owner reads release readiness from the Vite Worker')
} finally {
  await dev.close()
}
