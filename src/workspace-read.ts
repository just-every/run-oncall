import {auditIdentity} from './audit-store';
import {runtimeBindings, type Bindings} from './auth.server';
import {installationNameRead, type InstallationDocumentRead} from './brand/installation';
import {changeHash} from './changes/credentials';
import {fail, type Member} from './family/response-operations/domain';
import type {Schedule} from './family/response-operations/schedules';
import {pagerdutyConnect} from './move-in/pagerduty-oauth';
import {nativeMember, type NativeLinkRead} from './native-member';
import {memberOnCall} from './on-call/api';
import type {OnCall} from './on-call/read';
import {readSessionCookie} from './session-cookie';
import {memberWorkspace} from './workspace-visibility';
import {workspaceCoverageHeader, workspaceRefreshHeader, workspaceStateHeader, type WorkspaceRefresh} from './workspace-refresh';
import {decodeWorkspace, erasureFenceRead, workspaceRecords, workspaceRevisionColumns, type WorkspaceReadRevisions} from './workspace-store';
import {readTracked, type TrackedRead} from './read-cache';

type MemberSessionRow = {data: string; operator_session: string | null};
type Access = {member: Member; digest: string; owner: boolean; revisions: WorkspaceReadRevisions};

function memberSession(db: D1Database, digest: string, columns = '') {
  return db.prepare(`SELECT m.data,s.operator_session${columns}
    FROM oc_current_sessions s JOIN oc_members m ON m.id=s.member
    WHERE s.token=? AND s.expires>? AND json_extract(m.data,'$.active')=1`).bind(digest, Date.now());
}

export async function readCurrentMember(env: Bindings, request: Request, coverage?: boolean, readNativeLink?: NativeLinkRead): Promise<Access | null> {
  const token = readSessionCookie(request);
  const scope = coverage === undefined ? undefined : {coverage};
  if (!token) return nativeMember(env, request, scope && {...scope, readLink: readNativeLink});

  const digest = await changeHash(token);
  const columns = scope ? ', ' + workspaceRevisionColumns(scope.coverage) : '';
  const row = await memberSession(env.DB, digest, columns).first<MemberSessionRow & WorkspaceReadRevisions>();
  if (!row) return null;
  const member: Member = JSON.parse(row.data);
  if (row.operator_session) {
    const native = await nativeMember(env, request, scope);
    if (!native || native.digest !== `native:${row.operator_session}` || native.member.id !== member.id) return null;
    return {...native, digest};
  }
  auditIdentity(env.DB, {actor: {kind: 'member', id: member.id}});
  return {member, digest, owner: false, revisions: row};
}

function snapshotReads(db: D1Database, digest: string, full: boolean, branded: boolean) {
  return [
    memberSession(db, digest),
    ...(full ? [db.prepare(erasureFenceRead)] : []),
    ...(branded ? [installationNameRead(db)] : []),
  ];
}

async function snapshot(db: D1Database, session: Access, full: boolean, coverage: boolean, document?: InstallationDocumentRead, prefetched?: TrackedRead) {
  const read = prefetched ?? await readTracked(db, snapshotReads(db, session.digest, full, !!document));
  const [authority, fences, branding] = read.extras;
  const current: Member | null = authority.results[0] ? JSON.parse(authority.results[0].data) : null;
  if (!current || current.id !== session.member.id) fail('Access revoked', 401);
  if (document) document.branding = branding.results[0];
  const schedules = coverage ? read.rows('paging_schedules').map(row => JSON.parse(row.data) as Schedule) : undefined;
  const pagingRevision: number | undefined = coverage ? read.rows('paging_control')[0]?.revision : undefined;
  if (coverage && (!Number.isSafeInteger(pagingRevision) || pagingRevision! < 0)) fail('Critical scheduling storage missing', 503);
  const workspace = decodeWorkspace(workspaceRecords(read, fences, full ? undefined : ['members', 'services', 'teams']), false);
  return {current, workspace, schedules, pagingRevision};
}

const minute = 60_000;
function coverageToken(stateVersion: string, pagingRevision: number, coverage: OnCall, at: number) {
  // Current holders change on an exact boundary. The rolling chart can keep its
  // previous window until the next displayed minute.
  let until = coverage.rotas.length ? (Math.floor(at / minute) + 1) * minute : 0;
  for (const rota of coverage.rotas) {
    const boundary = rota.now.until ? Date.parse(rota.now.until) : Infinity;
    const starts = Date.parse(rota.validFrom);
    until = Math.min(until, boundary, starts > at ? starts : Infinity);
  }
  return `${stateVersion}.${pagingRevision}.${until}`;
}

function currentCoverage(token: string | null, stateVersion: string, pagingRevision: number | null, at: number) {
  const prefix = `${stateVersion}.${pagingRevision}.`;
  if (pagingRevision === null || !token?.startsWith(prefix)) return false;
  const validity = token.slice(prefix.length);
  return /^\d+$/.test(validity) && (validity === '0' || Number(validity) > at);
}

function settings(env: Bindings, member: Member, owner: boolean) {
  if (member.role === 'stakeholder') return {demo: false};
  const demo = env.RER_DEMO === '1';
  const localSignInSettings = owner && env.AUTH_LOCAL === 'true' && !!env.RER_DEV_KEY && env.RER_DEV_IDENTITY !== 'off' && !demo;
  return {demo, ...(localSignInSettings ? {localSignInSettings} : {}), moveIn: {pagerdutyConnect: pagerdutyConnect(runtimeBindings(env))}};
}

function stateToken(member: Member, revision: number | null, flags: ReturnType<typeof settings>) {
  return changeHash(JSON.stringify([member.id, member.role, member.name, revision, flags]));
}

function coverageProjection(value: Awaited<ReturnType<typeof snapshot>>, at: number, stateVersion: string | undefined) {
  if (!value.schedules || value.current.role === 'stakeholder') return {};
  const onCall = memberOnCall(value.workspace, {schedules: value.schedules}, value.current, at);
  return {onCall, ...(stateVersion ? {coverageVersion: coverageToken(stateVersion, value.pagingRevision!, onCall, at), pagingRevision: value.pagingRevision} : {})};
}

export async function readWorkspace(env: Bindings, request: Request, document?: InstallationDocumentRead): Promise<WorkspaceRefresh> {
  const mode = request.headers.get(workspaceRefreshHeader);
  const versioned = mode === 'state' || mode === 'coverage';
  const coverage = mode !== 'state';
  let prefetched: TrackedRead | undefined;
  const readNativeLink: NativeLinkRead | undefined = document && (async (statement, digest) => {
    const read = await readTracked(env.DB, [...snapshotReads(env.DB, digest, true, true), statement]);
    const [authority, , , mapping] = read.extras;
    // A newly linked session must pass the snapshot fence after its insert.
    prefetched = authority.results[0] ? read : undefined;
    return mapping.results[0] ?? null;
  });
  const session = await readCurrentMember(env, request, coverage, readNativeLink);
  if (!session) {
    const hasMembers = await env.DB.prepare('SELECT 1 FROM oc_members LIMIT 1').first();
    return {setup: !hasMembers, member: null, demo: env.RER_DEMO === '1', state: null};
  }

  const {member, owner, revisions} = session;
  const flags = settings(env, member, owner);
  const version = versioned ? await stateToken(member, revisions.workspaceRevision, flags) : undefined;
  const previous = request.headers.get(workspaceStateHeader);
  const at = Date.now();
  if (version && version === previous) {
    if (!coverage || member.role === 'stakeholder' || currentCoverage(request.headers.get(workspaceCoverageHeader), version, revisions.pagingRevision, at)) return {unchanged: true};
    const value = await snapshot(env.DB, session, false, true);
    const currentVersion = await stateToken(value.current, value.workspace.revision, settings(env, value.current, owner));
    if (currentVersion === version) return {unchanged: true, ...coverageProjection(value, at, version)};
  }

  if (member.role === 'stakeholder') return {setup: false, member, state: null, ...flags, ...(version ? {stateVersion: version} : {})};
  const value = await snapshot(env.DB, session, true, coverage, document, prefetched);
  const currentFlags = settings(env, value.current, owner);
  const currentVersion = versioned ? await stateToken(value.current, value.workspace.revision, currentFlags) : undefined;
  return {
    setup: false, member: value.current, ...currentFlags, ...(currentVersion ? {stateVersion: currentVersion} : {}),
    state: value.current.role === 'stakeholder' ? null : memberWorkspace(value.workspace, value.current),
    ...coverageProjection(value, at, currentVersion),
  };
}

export async function readOnCall(env: Bindings, request: Request, rawAt: string | undefined) {
  const session = await readCurrentMember(env, request, false);
  if (!session) fail('Sign in required', 401);
  if (session.member.role === 'stakeholder') fail('Stakeholders may only access internal status and approved updates', 403);
  const at = rawAt === undefined ? Date.now() : Date.parse(rawAt);
  if (!Number.isSafeInteger(at)) fail('Use an ISO timestamp');
  const value = await snapshot(env.DB, session, false, true);
  return memberOnCall(value.workspace, {schedules: value.schedules!}, value.current, at);
}
