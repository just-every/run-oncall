import { demoEffect } from './modules/demo/index.mjs'
import { deliver } from './delivery'
import { command, fail } from './family/response-operations/domain'
import { coverage } from './family/response-operations/schedules'
import { pagingSnapshot } from './paging-store'
import { workspaceWrite } from './workspace-store'

const channels = ['sms', 'voice', 'push', 'email'] as const

/** Called only inside Base's demo effect guard; ordinary delivery stays OFF. */
export async function sendDemoPage(c: any, body: (c: any) => Promise<any>) {
  const input = await body(c)
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(key => !['incident', 'channel'].includes(key))) fail('Invalid page request')
  const selected = input.channel ?? 'all'
  if (selected !== 'all' && !channels.includes(selected)) fail('Unknown delivery channel')
  const { workspace, archive } = await pagingSnapshot(c.env.DB)
  const actor = workspace.members.find(member => member.id === c.get('actor').id && member.active)
  if (!actor || actor.role === 'viewer') fail('Responder required', 403)
  const incident = workspace.incidents.find(item => item.id === input.incident)
  if (!incident) fail('Unknown incident', 404)
  if (incident.state === 'resolved') fail('Incident is resolved', 409)
  const policy = archive.policies.find(item => item.service === incident.service)
  const schedule = archive.schedules.find(item => item.id === policy?.scheduleId)
  if (!schedule) fail('Set up an escalation policy first', 409)
  const now = Date.now()
  const duty = coverage(schedule, workspace.members, now)
  const target = workspace.members.find(member => member.id === duty.primary)
  if (!target) fail('No primary responder on duty', 409)
  const sends = await Promise.all((selected === 'all' ? channels : [selected]).map(channel =>
    demoEffect(deliver, () => ({ id: crypto.randomUUID(), channel, status: 'sent' as const }))))
  command(workspace, actor, { type: 'note', incident: incident.id, revision: incident.revision,
    text: `Page sent to ${target.name} via ${sends.map(send => send.channel === 'sms' ? 'SMS' : send.channel).join(', ')}.` }, new Date(now).toISOString())
  const result = await c.env.DB.batch(workspaceWrite(c.env.DB, workspace, workspace.revision, {
    sql: 'EXISTS(SELECT 1 FROM oc_current_sessions WHERE token=? AND member=? AND expires>?)',
    values: [c.get('sessionDigest'), actor.id, now],
  }))
  if (result[0].meta.changes !== 1) fail('Workspace changed; reload and retry', 409)
  return { status: 'sent', incident: incident.id, recipient: target.name, sends }
}
