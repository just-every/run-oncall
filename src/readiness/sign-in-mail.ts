import type {Bindings} from '../auth.server';
import {hostedSignInMailSender} from '../mail.server.mjs';

export type SignInMail =
 | {state: 'local' | 'off' | 'unconfigured' | 'awaiting-confirmation' | 'sender-unrecorded' | 'changed-since' | 'unavailable'}
 | {state: 'confirmed'; at: string; sender: string};

export async function observeSignInMail(env: Bindings): Promise<SignInMail> {
 if (env.AUTH_LOCAL === 'true' || env.RER_DEMO === '1') return {state: 'local'};
 if (env.MAIL_PROVIDER === 'none') return {state: 'off'};
 let current;
 try {current = await hostedSignInMailSender(env);}
 catch {return {state: 'unconfigured'};}
 if (!current) return {state: 'unconfigured'};
 try {
  // A native session issued from a magic link survives sign-out. Private owner
  // entry, password sign-in and invitations cannot supply this observation.
  const proof = await env.DB.prepare(`SELECT
   MAX(CASE WHEN t.mail_sender_digest=? THEN t.consumed_at END) AS current_at,
   MAX(CASE WHEN t.mail_sender_digest IS NOT NULL THEN t.consumed_at END) AS known_at,
   MAX(t.consumed_at) AS any_at
   FROM oa_tokens t JOIN oa_sessions s ON s.source_token_id=t.id
   WHERE t.kind='magic' AND s.kind='native' AND t.revoked_at IS NULL`)
   .bind(current.digest).first<{current_at:number|null; known_at:number|null; any_at:number|null}>();
  if (proof?.current_at != null) return {state: 'confirmed', at: new Date(proof.current_at).toISOString(), sender: current.sender};
  if (proof?.known_at != null) return {state: 'changed-since'};
  if (proof?.any_at != null) return {state: 'sender-unrecorded'};
  return {state: 'awaiting-confirmation'};
 } catch {return {state: 'unavailable'};}
}
