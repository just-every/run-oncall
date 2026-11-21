import type { Member } from '../family/response-operations/domain.ts';
import type { BusinessService } from './types.ts';

export function canManageBusinessStatus(actor: Member, service: Pick<BusinessService, 'communicationsOwner'>) {
  return actor.active && (actor.role === 'admin' || (actor.role === 'responder' && actor.id === service.communicationsOwner));
}
