import { fail } from './family/response-operations/domain'
export const pagingRefusal = 'Paging is OFF. Keep your existing pager. Sending requires an independent standby and a passed drill with real phones.'
export function deliver():never { return fail(pagingRefusal,409) }
