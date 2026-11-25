import type {Bindings} from '../auth.server';
import {hostedSignInMailSender, mailRecipients} from '../mail.server.mjs';

export type SignInMail =
 | {state: 'local' | 'off' | 'unconfigured' | 'awaiting-confirmation' | 'sender-unrecorded' | 'changed-since' | 'unavailable'}
 | {state: 'confirmed'; at: string; sender: string};

export async function observeSignInMail(env: Bindings): Promise<SignInMail> {
 if (env.AUTH_LOCAL === 'true' || env.RER_DEMO === '1') return {state: 'local'};
 if (env.MAIL_PROVIDER === 'none' || !mailRecipients(env)) return {state: 'off'};
 let current;
 try {current = await hostedSignInMailSender(env);}
 catch {return {state: 'unconfigured'};}
 if (!current) return {state: 'unconfigured'};
 try {
  // A native session issued from a magic link survives sign-out. Private owner
  // entry, password sign-in and invitations cannot supply this observation.
  const eligible = `FROM oa_tokens t INDEXED BY oa_readiness_mail_proof WHERE t.kind='magic' AND t.revoked_at IS NULL AND t.consumed_at IS NOT NULL
   AND EXISTS(SELECT 1 FROM oa_sessions s WHERE s.source_token_id=t.id AND s.kind='native')`;
  const proof = await env.DB.prepare(`WITH confirmation AS MATERIALIZED (
   SELECT (SELECT t.consumed_at ${eligible} AND t.mail_sender_digest=? ORDER BY t.consumed_at DESC LIMIT 1) AS at)
   SELECT at,CASE
    WHEN at IS NOT NULL THEN 'confirmed'
    WHEN EXISTS(SELECT 1 ${eligible} AND t.mail_sender_digest IS NOT NULL) THEN 'changed-since'
    WHEN EXISTS(SELECT 1 ${eligible}) THEN 'sender-unrecorded'
    ELSE 'awaiting-confirmation' END AS state FROM confirmation`)
   .bind(current.digest).first<{at:number;state:'confirmed'}|{at:null;state:'changed-since'|'sender-unrecorded'|'awaiting-confirmation'}>();
  if (!proof) return {state: 'awaiting-confirmation'};
  if (proof.state==='confirmed') return {state: 'confirmed', at: new Date(proof.at).toISOString(), sender: current.sender};
  return {state: proof.state};
 } catch {return {state: 'unavailable'};}
}
