import { fail, text, type State } from './family/response-operations/domain';
import { changeHash, changeHmac, equalSignature, freshTimestamp, openCredential, sealCredential, sourceCustody } from './changes/credentials';
import { runtimeBindings } from './auth.server';

// OC-042: a native source holds a bearer key only as its digest, and an HMAC signing key only as
// installation-local AES-GCM ciphertext (sources.signing_custody). Neither is returned, archived or audited.
export type NativeSource = { digest: string; signing_secret: string | null; signing_custody: string | null; scopes: string };
type Guard = { sql: string; values: (string | number | null)[] };
type Dependencies = { body: (c: any) => Promise<any>; load: (db: D1Database) => Promise<State>; guard: (c: any) => Guard };

// Installations upgraded across migration 0127 may still hold plaintext signing keys. Each is sealed and
// cleared in one statement that matches the exact held row, so a concurrent rotation or revocation wins.
// The migration's triggers refuse any new plaintext, so once none remains this isolate stops looking.
let heldKeysSealed = false;
export async function sealHeldSourceKeys(db: D1Database, secret: string | undefined) {
  if (heldKeysSealed || !secret) return;
  const held = (await db.prepare('SELECT id,digest,signing_secret FROM sources WHERE signing_secret IS NOT NULL').all<{ id: string; digest: string; signing_secret: string }>()).results;
  if (held.length) await db.batch(await Promise.all(held.map(async row =>
    db.prepare('UPDATE sources SET signing_custody=?,signing_secret=NULL WHERE id=? AND digest=? AND signing_secret=?')
      .bind(await sealCredential(row.signing_secret, secret, sourceCustody), row.id, row.digest, row.signing_secret))));
  heldKeysSealed = true;
}

// Returns the verified key so admission can refuse to retain it.
export async function presentedSourceKey(c: any, source: NativeSource, raw: string) {
  if (source.signing_secret !== null) fail('Source key custody is incomplete; finish setup so this installation can hold the key', 503);
  if (source.signing_custody === null) {
    const bearer = c.req.header('authorization')?.replace(/^Bearer /, '') ?? '';
    if (!bearer || !equalSignature(await changeHash(bearer), source.digest)) fail('Invalid source credential', 401);
    return bearer;
  }
  const timestamp = c.req.header('x-oncall-timestamp') ?? '';
  freshTimestamp(timestamp);
  const key = await openCredential(source.signing_custody, runtimeBindings(c.env).SESSION_SECRET, sourceCustody);
  if (!equalSignature(c.req.header('x-oncall-signature') ?? '', await changeHmac(key, timestamp + '.' + raw))) fail('Invalid source signature', 401);
  return key;
}

// Native admission keeps the caller's text, so a key copied into an event would reach the workspace,
// exports and every reader. Refuse it before anything is stored.
export function refuseKeyEcho(values: unknown[], key: string) {
  const forms = [key, encodeURIComponent(key)].map(form => form.toLowerCase());
  if (values.some(value => typeof value === 'string' && forms.some(form => value.toLowerCase().includes(form))))
    fail('Keep the source key out of event content');
}

async function currentAdmin(c: any, deps: Dependencies) {
  if (c.get('actor').role !== 'admin') fail('Admin required', 403);
  const state = await deps.load(c.env.DB);
  if (!state.members.some(m => m.id === c.get('actor').id && m.active && m.role === 'admin')) fail('Current admin required', 403);
  return state;
}

export function installNativeSources(api: any, deps: Dependencies) {
  api.get('/api/sources', async (c: any) => {
    await currentAdmin(c, deps);
    const rows = (await c.env.DB.prepare('SELECT id,signing_secret IS NOT NULL AS pending,signing_custody IS NOT NULL AS signed,scopes FROM sources ORDER BY id').all()).results as { id: string; pending: number; signed: number; scopes: string }[];
    return c.json({ sources: rows.map(row => ({ id: row.id, authentication: row.pending || row.signed ? 'signed' : 'bearer',
      custody: row.pending ? 'awaiting the installation key' : row.signed ? 'encrypted in this installation' : 'digest only', scopes: JSON.parse(row.scopes) })) });
  });
  api.post('/api/sources', async (c: any) => {
    if (c.get('actor').role !== 'admin') fail('Admin required', 403);
    const input = await deps.body(c);
    const id = text(input.id, 'source', 100);
    if (id.startsWith('intake:')) fail('This source namespace is reserved for compatible integrations');
    const key = text(input.key, 'source key', 200);
    if (key.length < 32) fail('Source key needs at least 32 characters');
    const state = await currentAdmin(c, deps);
    if (!Array.isArray(input.scopes) || input.scopes.length === 0 || input.scopes.some((scope: string) => !state.services.some(s => s.id === scope)))
      fail('Choose explicit service scopes');
    refuseKeyEcho([id, ...input.scopes], key);
    const signed = input.mode === 'signed', authority = deps.guard(c);
    const custody = signed ? await sealCredential(key, runtimeBindings(c.env).SESSION_SECRET, sourceCustody) : null;
    // One statement rotates the key: the previous key stops admitting events as this commits.
    const saved = await c.env.DB.prepare(`INSERT INTO sources(id,digest,signing_custody,scopes) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM workspace_control WHERE revision=?) AND ${authority.sql} ON CONFLICT(id) DO UPDATE SET digest=excluded.digest,signing_custody=excluded.signing_custody,scopes=excluded.scopes`)
      .bind(id, await changeHash(key), custody, JSON.stringify(input.scopes), state.revision, ...authority.values).run();
    if (saved.meta.changes !== 1) fail('Authority changed; reload', 409);
    return c.json({ id, authentication: signed ? 'signed' : 'bearer',
      credential: signed ? 'encrypted in this installation; never returned' : 'stored as digest; never returned', effect: 'intake only; no read access' });
  });
  api.post('/api/sources/:source/revoke', async (c: any) => {
    const state = await currentAdmin(c, deps), id = c.req.param('source');
    await deps.body(c);
    if (!await c.env.DB.prepare('SELECT 1 FROM sources WHERE id=?').bind(id).first()) fail('Unknown source', 404);
    const authority = deps.guard(c);
    const removed = await c.env.DB.prepare(`DELETE FROM sources WHERE id=? AND EXISTS(SELECT 1 FROM workspace_control WHERE revision=?) AND ${authority.sql}`)
      .bind(id, state.revision, ...authority.values).run();
    if (removed.meta.changes !== 1) fail('Authority changed; reload', 409);
    return c.json({ id, revoked: true, effect: 'its key no longer admits events; accepted events stay in history' });
  });
}
