import { fail } from './family/response-operations/domain'
export const pagingRefusal = 'Paging is off on this door: Oncall pages only by text message, from a rota\'s Paging switch. Sending here requires an independent standby and a passed drill with real phones. Keep your existing pager.'
export function deliver():never { return fail(pagingRefusal,409) }
