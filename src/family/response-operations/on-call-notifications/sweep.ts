import {pagingSnapshot} from '../../../paging-store';
import {workspaceWrite} from '../../../workspace-store';
import {advanceOnCall} from './model';

/** The existing minute cron records due on-call notifications and step 2. Records only: nothing is sent. */
export async function sweepOnCall(db: D1Database) {
  const snapshot = await pagingSnapshot(db), state = snapshot.workspace, revision = state.revision;
  if (!state.alerts.some(alert => alert.onCall?.state === 'running')) return {changed: false};
  const before = JSON.stringify(state.alerts);
  advanceOnCall(state, snapshot.archive.schedules, Date.now());
  if (before === JSON.stringify(state.alerts)) return {changed: false};
  const results = await db.batch(workspaceWrite(db, state, revision, {sql: 'EXISTS(SELECT 1 FROM paging_control WHERE id=1 AND revision=?)', values: [snapshot.revision]}));
  return {changed: results[0].meta.changes === 1};
}
