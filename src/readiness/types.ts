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
export type InstallationDependency = {
 id: string; name: string; clauses: string[]; state: MatrixState;
 completion: 'not-done' | 'guidance-only';
 matrix: {id: string; state: MatrixState}[];
 fieldProof: {id: string; state: 'passed' | 'not run'; date: string | null}[];
 requirement: string;
};
export type InstallationChecklist = {
 country: 'US'; reviewedOn: string; items: InstallationDependency[];
};
export type Readiness = {
 observedAt: string; complete: boolean;
 release: {package: string; version: string; deployment: {sourceSha: string | null; fingerprint: string | null; versionId: string | null}};
 matrix: MatrixRow[]; signals: Signal[]; installation: InstallationChecklist;
 pagerCoverage: {state: 'unproven'; paging: 'off'; reason: string};
};
