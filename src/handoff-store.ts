import { workspaceQuery } from './workspace-store'
import { fail, type State } from './family/response-operations/domain';
import { boundHandoffArchive, validateHandoffArchive, holdHandoffsForRecovery, type HandoffArchive } from './family/response-operations/handoffs';

export type HandoffSnapshot = { revision: number; workspace: State; archive: HandoffArchive };
export type HandoffAuthority = { digest: string; member: string };

/** Physical bounds also apply to recovery plans before any transaction is assembled. */
export function boundHandoffs(archive: HandoffArchive) {
  boundHandoffArchive(archive);
}

/** Reusable by the root's single-batch checkpoint snapshot; no paging dependency. */
export async function decodeHandoffRow(row: any): Promise<{ revision: number; archive: HandoffArchive }> {
  if (!row || row.id !== 1 || !Number.isSafeInteger(row.revision) || row.revision < 0 ||
      typeof row.data !== 'string' || typeof row.write_token !== 'string' || !row.write_token)
    fail('Stored handoff metadata is missing or inconsistent', 503);
  try {
    const archive = await validateHandoffArchive(JSON.parse(row.data));
    boundHandoffs(archive);
    return { revision: row.revision, archive };
  } catch {
    return fail('Stored handoff archive is invalid or exceeds the local profile', 503);
  }
}
export const parseHandoffRow = decodeHandoffRow;

export async function handoffSnapshot(db: D1Database): Promise<HandoffSnapshot> {
  const rows = await db.batch([
    db.prepare(workspaceQuery),
    db.prepare('SELECT * FROM handoff_state WHERE id=1'),
  ]);
  const workspace: any = rows[0].results[0];
  if (!workspace) fail('Create the local workspace first', 409);
  let state: State;
  try { state = JSON.parse(workspace.data); }
  catch { return fail('Stored workspace is invalid', 503); }
  if (!Number.isSafeInteger(workspace.revision) || workspace.revision < 0 || state.revision !== workspace.revision)
    fail('Stored workspace revisions are inconsistent', 503);
  return { workspace: state, ...await decodeHandoffRow(rows[1].results[0]) };
}

/** The full record, immutable copy and attributed history change together under CAS. */
export async function commitHandoffs(db: D1Database, snapshot: HandoffSnapshot, archive: HandoffArchive,
  authority: HandoffAuthority): Promise<number> {
  boundHandoffs(archive);
  // Every restore appends a recovery hold to each active approval under these same
  // bounds, so a write that would leave an approval unholdable is refused now
  // (a longest-reason hold is simulated) rather than blocking every later restore.
  await holdHandoffsForRecovery(structuredClone(archive), Date.now(), crypto.randomUUID(), 'x'.repeat(1000));
  const token = crypto.randomUUID();
  const result = await db.batch([
    db.prepare('UPDATE handoff_state SET data=?,revision=revision+1,write_token=? WHERE id=1 AND revision=? AND EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND revision=?) AND EXISTS(SELECT 1 FROM oc_current_sessions WHERE token=? AND member=? AND expires>?)')
      .bind(JSON.stringify(archive), token, snapshot.revision, snapshot.workspace.revision,
        authority.digest, authority.member, Date.now()),
  ]);
  if (result[0].meta.changes !== 1) fail('Workspace, handoff state or authority changed; reload and retry', 409);
  return snapshot.revision + 1;
}

/** Root's workspace replacement guards this revision before assigning its unique token. */
export function prepareHandoffReplacement(db: D1Database, snapshot: { revision: number }, archive: HandoffArchive) {
  boundHandoffs(archive);
  const serialized = JSON.stringify(archive);
  return { revision: snapshot.revision, statements: (token: string): D1PreparedStatement[] => [
    db.prepare('UPDATE handoff_state SET data=?,revision=revision+1,write_token=? WHERE id=1 AND revision=? AND EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND write_token=?)')
      .bind(serialized, token, snapshot.revision, token),
  ] };
}
