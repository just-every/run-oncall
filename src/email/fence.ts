import { fail, type State } from '../family/response-operations/domain';
export async function emailErasureFence(db:D1Database,state:State) {
  const ids=JSON.stringify((state.emailSamples??[]).map(s=>s.id));
  if(await db.prepare('SELECT 1 FROM oc_email_erased_samples WHERE id IN (SELECT value FROM json_each(?)) LIMIT 1').bind(ids).first())fail('Email archive predates saved-mail erasure; use a current archive',409);
}
