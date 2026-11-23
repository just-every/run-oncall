import {fail, type Member, type State} from '../family/response-operations/domain';
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
