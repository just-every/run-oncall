export type SignalState = 'ok' | 'degraded' | 'failing' | 'unavailable';
export type Signal = {
 id: string; name: string; state: SignalState; observedAt: string;
 ageSeconds: number | null; values: Record<string, string | number | boolean | null>; reason: string;
};
export type MatrixState = 'working-here' | 'off' | 'not-built' | 'unproven-live';
export type MatrixRow = {
 id: string; area: string; state: MatrixState;
 evidence: {kind: 'maintained-journey' | 'dated-owner-evidence' | 'none'; reference: string | null};
 observation: {state: 'available' | 'unavailable'; configured: number | null; active: number | null; lastAcceptedAt: string | null} | null;
 limitation: string;
};
export type Readiness = {
 observedAt: string; complete: boolean;
 release: {package: string; version: string; deployment: {sourceSha: string | null; fingerprint: string | null; versionId: string | null}};
 matrix: MatrixRow[]; signals: Signal[];
 pagerCoverage: {state: 'unproven'; paging: 'off'; reason: string};
};
