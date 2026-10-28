import {fail, type Member, type State} from '../family/response-operations/domain';
import {pagingSnapshot} from '../paging-store';
import type {PagingArchive} from '../family/response-operations/paging-archive';
import {onCall} from './read';

/** Keep the new read scoped if private teams become available on this installation. */
export function memberOnCall(workspace: State, archive: Pick<PagingArchive, 'schedules'>, actor: Member, at = Date.now()) {
  if (!['admin', 'responder', 'viewer'].includes(actor.role)) fail('Only workspace members can read on-call coverage.', 403);
  const services = workspace.services.filter(service => {
    const team = workspace.teams?.find(team => team.id === service.team);
    return !team || (team.visibility as string) !== 'private' || actor.role === 'admin' || team.members.includes(actor.id);
  });
  return onCall({...workspace, services}, archive, at);
}

export async function workspaceOnCall(db: D1Database, workspace: State, actor: Member, at = Date.now()) {
  const rows = await db.prepare('SELECT data FROM paging_schedules ORDER BY rowid').all<{data: string}>();
  return memberOnCall(workspace, {schedules: rows.results.map(row => JSON.parse(row.data))}, actor, at);
}

export function installOnCall(api: any) {
  api.get('/api/on-call', async (c: any) => {
    const snapshot = await pagingSnapshot(c.env.DB);
    const actor = snapshot.workspace.members.find(member => member.id === c.get('actor').id && member.active);
    if (!actor) fail('Sign in required', 401);
    const raw = c.req.query('at'), at = raw === undefined ? Date.now() : Date.parse(raw);
    if (!Number.isSafeInteger(at)) fail('Use an ISO timestamp');
    return c.json(memberOnCall(snapshot.workspace, snapshot.archive, actor, at));
  });
}
