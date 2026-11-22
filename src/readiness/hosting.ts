import type {Bindings} from '../auth.server';
import type {HostingChecks,Signal} from './types';

export function hostingChecks(env: Bindings, signals: Signal[], ownerSignedIn: boolean): HostingChecks {
 if (env.AUTH_LOCAL==='true' || env.RER_DEMO==='1') {
  const local={state:'not-applicable',detail:'Applies to hosted installations.'} as const;
  return {identity:local,owner:local,removal:local};
 }

 // The authority signal reads the same workspace-control record as /health.
 const revision=signals.find(signal=>signal.id==='authority')?.values.workspaceRevision;
 const identity: HostingChecks['identity']=typeof revision!=='number'
  ? {state:'unavailable',detail:'Workspace storage could not be confirmed. Check /health for this installation.'}
  : !env.RER_DEPLOY_SOURCE
   ? {state:'unbound',detail:'Workspace storage responded. The deployment has no bound source SHA.'}
   : {state:'healthy',detail:'Workspace storage responded. See the release details above for the bound source SHA and available deployment metadata.'};
 return {
  identity,
  owner:ownerSignedIn
   ? {state:'signed-in',detail:'This session is signed in as the installation owner.'}
   : {state:'owner-session-required',detail:'Open Readiness from an installation owner session to confirm access.'},
  removal:{state:'not-done',detail:'Verify removal of the Worker and database in Cloudflare after running the documented removal command.'},
 };
}
