import { fail, type State } from './domain.ts';
import { createRecoveryCheckpoint, validateRecoveryCheckpoint, type RecoveryCheckpoint } from './recovery.ts';
import type { PagingArchive } from './paging-archive.ts';
import { validateHandoffArchive, type HandoffArchive } from './handoffs.ts';

export type RecoveryCheckpointV2 = Omit<RecoveryCheckpoint, 'schemaVersion'> & {
  schemaVersion: 2;
  handoffRevision: number;
  handoffs: HandoffArchive;
};
export type AnyRecoveryCheckpoint = RecoveryCheckpoint | RecoveryCheckpointV2;

/** Version 1 remains a strict two-dataset archive; only version 2 carries reviews. */
export async function validateAnyRecoveryCheckpoint(input: unknown): Promise<AnyRecoveryCheckpoint> {
  if (!input || typeof input !== 'object' || Array.isArray(input) || (input as any).schemaVersion !== 2)
    return validateRecoveryCheckpoint(input);
  const value = input as Record<string, unknown>;
  const keys = ['schemaVersion', 'kind', 'capturedAt', 'workspaceRevision', 'pagingRevision', 'coordination', 'paging', 'handoffRevision', 'handoffs'];
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key)))
    fail('Recovery checkpoint has missing or unknown fields');
  if (!Number.isSafeInteger(value.handoffRevision) || (value.handoffRevision as number) < 0)
    fail('Handoff revision must be a safe nonnegative integer');
  const { handoffRevision, handoffs, ...base } = value;
  const legacy = validateRecoveryCheckpoint({ ...base, schemaVersion: 1 });
  return { ...legacy, schemaVersion: 2, handoffRevision: handoffRevision as number,
    handoffs: await validateHandoffArchive(handoffs) };
}

/** All three inputs and revisions must come from one edition storage snapshot. */
export async function createRecoveryCheckpointV2(coordination: State, paging: PagingArchive, pagingRevision: number,
  handoffs: HandoffArchive, handoffRevision: number, at: number): Promise<RecoveryCheckpointV2> {
  const legacy = createRecoveryCheckpoint(coordination, paging, pagingRevision, at);
  return await validateAnyRecoveryCheckpoint({ ...legacy, schemaVersion: 2, handoffRevision, handoffs }) as RecoveryCheckpointV2;
}
