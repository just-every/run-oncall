import type {Bindings} from '../auth.server';
import {operatorMail} from '../mail.server.mjs';

export type SignInMail =
 | {state: 'local' | 'off' | 'unconfigured' | 'awaiting-confirmation' | 'unavailable'}
 | {state: 'confirmed'; at: string};

export async function observeSignInMail(env: Bindings): Promise<SignInMail> {
 if (env.AUTH_LOCAL === 'true' || env.RER_DEMO === '1') return {state: 'local'};
 if (env.MAIL_PROVIDER === 'none') return {state: 'off'};
 try {if (!env.MAIL_FROM?.trim() || !operatorMail(env)) return {state: 'unconfigured'};}
 catch {return {state: 'unconfigured'};}
 try {
  // A native session issued from a magic link survives sign-out. Private owner
  // entry, password sign-in and invitations cannot supply this observation.
  const at = await env.DB.prepare(`SELECT MAX(t.consumed_at) AS confirmed_at
   FROM oa_tokens t JOIN oa_sessions s ON s.source_token_id=t.id
   WHERE t.kind='magic' AND s.kind='native' AND t.revoked_at IS NULL`).first<number>('confirmed_at');
  return at === null ? {state: 'awaiting-confirmation'} : {state: 'confirmed', at: new Date(at).toISOString()};
 } catch {return {state: 'unavailable'};}
}
