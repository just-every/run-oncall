import {pagingLead, type SmsPaging} from '../sms-paging/words';

/** The paging lead line: what Oncall actually does, read from GET /api/paging/sms. Silent until that state is known. */
export function PagerNotice({sms, rota}: {sms: SmsPaging | null; rota?: string}) {
  return sms ? <p data-paging-lead>{pagingLead(sms, rota)}</p> : null;
}
