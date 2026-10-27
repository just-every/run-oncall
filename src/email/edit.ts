import { fail, text, type State } from '../family/response-operations/domain';
import type { EmailAddress } from './types';

/** Field-only edits preserve rule versions, credentials and already admitted mail. */
export function editEmailField(state: State, address: EmailAddress, input: any) {
  if (!['name', 'service'].includes(input.field)) fail('Choose the address name or service');
  const field = input.field as 'name' | 'service';
  if (address[field] !== input.from) fail('This address value changed. Read it again before replacing it.', 409);
  const value = text(input.to, field === 'name' ? 'Address name' : 'Service', 100);
  if (address[field] === value) return false;
  if (field === 'service') {
    const service = state.services.find(s => s.id === value);
    if (!service) fail('Choose a current service');
    address.service = service.id; address.environment = service.environment;
  } else address.name = value;
  address.revision++;
  return true;
}
