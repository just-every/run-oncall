import type { D1Database, D1Sql, D1TargetAdapter } from '../d1/types.ts';
import type { D1ReversalPolicy } from '../d1/undo-types.ts';
import type { ImportMapping, ImportPlan, Json, ParsedRecord, ProvenanceRow, ReaderLimits, TargetRow } from '../types.ts';
import type { DoorGrant } from './protocol.ts';
import type { ImportDoorIntake } from './intake/types.ts';
export type { ImportDoorIntake, IntakeFormat } from './intake/types.ts';

/** Verified upload custody passed to the seed's archive or binary reader. */
export interface ImportDoorRawUpload {
  readonly bytes: Uint8Array;
  readonly name: string;
  readonly sha256: string;
  readonly size: number;
}
/** One decoded source; existing adapters may keep the mount's format. */
export interface ImportDoorSource {
  mapping: ImportMapping;
  parse(value: Json, index: number): ParsedRecord | ParsedRecord[];
  ownerPrincipalId?: string;
  format?: 'json' | 'ndjson';
  /** Project declared fields before the first persistent byte. Shared by both mounts. */
  intake?: ImportDoorIntake;
}
export interface ImportDoorRawSource extends Omit<ImportDoorSource, 'format' | 'parse' | 'intake'> {
  format: 'raw';
  /** Bound archive expansion while reading; return inert source records. */
  readRaw(upload: ImportDoorRawUpload, limits: Readonly<Required<ReaderLimits>>): ParsedRecord[] | Promise<ParsedRecord[]>;
  parse?: undefined;
  intake?: undefined;
}
export type ImportDoorResolvedSource = ImportDoorSource | ImportDoorRawSource;
export interface ImportDoorRuntimeOptions extends ImportDoorSource {
  database: D1Database;
  targets: D1TargetAdapter;
  /** The seed's actual owner principal, so its ordinary import history/undo works. */
  ownerPrincipalId: string;
  destination: string;
  format: 'json' | 'ndjson';
  limits?: ReaderLimits;
  /** Override the undo policy for new jobs. By default an adapter declaring
   * `preparePreservedUndo` selects 'preserve-conflicts'; other adapters select
   * 'strict'. Existing jobs always keep the policy they were created with. */
  reversalPolicy?: D1ReversalPolicy;
  /** Explain an independently confirmed native edit during readback only. */
  explainNativeEdit?(row: TargetRow, provenance: ProvenanceRow): string | undefined;
  /** Persist product check state under the admitted authority after a matching readback. */
  onReconciled?(request: DoorRequest, planId: string): Promise<void>;
}
export type ImportDoorRawRuntimeOptions = Omit<ImportDoorRuntimeOptions, 'format' | 'parse' | 'intake'> & ImportDoorRawSource;
export type ImportDoorRuntime = ImportDoorRuntimeOptions | ImportDoorRawRuntimeOptions;
/** Structurally identical to owner-claim's server-owned trust configuration. */
export interface ImportDoorClaimConfig {
  issuer: string;
  installationId: string;
  appOrigin: string;
  expectedEmail: string;
  publicKeys: Record<string, JsonWebKey>;
}
interface ImportDoorMountOptions extends Omit<ImportDoorRuntimeOptions, 'parse' | 'mapping' | 'format'> {
  format: 'json' | 'ndjson' | 'raw';
  claim: ImportDoorClaimConfig;
  /** Permanent door key for settings, lineage and history. Defaults to
   * `claim.installationId`. Set it to the operator mount's `installationId`
   * when RER assigns a different claim installation id later. */
  installationId?: string;
}
/** A grant mount takes one source's `parse`/`mapping`, or a `source` resolver
 * for a seed with several sources. */
export type ImportDoorOptions = ImportDoorMountOptions & (
  | (ImportDoorResolvedSource & { source?: undefined })
  | {
    /** The seed's server-owned allow-list, shared with its owner-session mount.
     * Called with the verified grant's namespace before any grant row is written;
     * null refuses the grant with 403 `unknown_import_source`. */
    source(namespace: string): ImportDoorResolvedSource | null | Promise<ImportDoorResolvedSource | null>;
    parse?: undefined; mapping?: undefined; readRaw?: undefined;
  });
export type DoorAccess = Pick<DoorGrant, 'action' | 'installationId' | 'email' | 'namespace'
  | 'maxBytes' | 'maxChunks' | 'maxRecords' | 'fingerprint' | 'approvalRecordId' | 'approvedAt' | 'catchup'>;
interface OperatorOptions {
  installationId: string;
  appOrigin: string;
  ownerEmail: string;
  namespace: string;
  /** Authenticate the owner and return a CURRENT same-database session predicate.
   * Check the seed's normal CSRF policy here as well. Null denies access. */
  authorize(request: Request, action: DoorAccess['action']): Promise<D1Sql | null>;
  /** Product details from the reviewed plan, for the owner screen. */
  reconciliationDetails?(plan: ImportPlan): Json;
}
export type ImportOperatorOptions = ImportDoorRuntimeOptions & OperatorOptions;
export type ImportRawOperatorOptions = ImportDoorRawRuntimeOptions & OperatorOptions;
export interface DoorHistoryEntry {
  planId: string; jobId: string; namespace: string; fingerprint: string; state: string;
  owner: string; approvedAt: string; approvalRecordId: string; reviewer: string; caption: string;
  /** The job's allowlisted failure reason and the durable apply-failure fact, when an apply failed. */
  error: string | null; failureCode: string | null;
}
export interface DoorTarget { kind: string; id: string; ownerPlanId: string; sourceIdentity: string }
export interface DoorRecord {
  kind: string; sourceId: string; sourceHash: string; targets: DoorTarget[];
  explanation?: string;
}
export interface DoorDifferences {
  additions: string[]; replacements: string[]; unchanged: string[];
  gone: string[]; conflicts: string[];
}
export interface DoorSnapshot {
  id: string; namespace: string; bundleSha256: string; kitNamespace: string;
  previous: string | null; records: DoorRecord[]; sourceCount: number;
  plan: ImportPlan; differences: DoorDifferences;
  standingApproval: { id: string; at: string } | null;
}
export interface DoorPlanRow {
  id: string; installation_id: string; namespace: string; bundle_sha256: string;
  fingerprint: string; previous_id: string | null; job_id: string | null;
  complete: number; snapshot_hash: string;
}
export interface DoorRequest {
  options: ImportDoorRuntime; access: Readonly<DoorAccess>;
  via: 'grant' | 'operator';
  authority: D1Sql;
  reconciliationDetails?: OperatorOptions['reconciliationDetails'];
  /** The destination's erasure journal rows when the request was admitted. */
  epoch: number;
  /** A grant request's accepted single-use nonce; owner-session requests have none. */
  nonce?: { jti: string; kid: string };
}
