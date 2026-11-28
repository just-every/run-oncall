/// <reference types="vite/client" />
import { installationDocument } from './brand/installation';
import {lobbyPaths} from './app/lobbyPaths';
import {isWorkspacePath, workspaceAddress} from './app/paths';
import {subscriptionResponse} from './schedule-coordination/feed';
import { auditedRequest } from './audit-request'
import { withDemo } from './modules/demo/index.mjs'
import { dispatch } from './base/dispatch'
import { staticAssetResponse } from './base/static-assets'
import { guideResponse } from './move-in-guide'
import { admitted, setupStateResponse } from './base/setup-state'
import { lobbyResponse } from './base/lobby'
import { identity } from './identity'
import { authResponse, runtimeBindings, operatorAuth, type Bindings } from './auth.server'
import {receivedRequest} from './request-body'
import {workspaceCoverageHeader, workspaceRefreshHeader, workspaceStateHeader, type WorkspaceSnapshot} from './workspace-refresh'
import {readSessionCookie} from './session-cookie'
import { businessSettings } from './agent-door/business'
import { isAgentPath } from './agent-door/paths'
import { nativeIngress } from './native-ingress'
import { workspaceShell } from './app/shell/document'
type Env = Bindings;
const render = async (request: Request) => (await import('@tanstack/react-start/server-entry')).default.fetch(request);
const seed = async (env: Env, context: { ownerEmail: string; now: Date }) =>
  (await import('./demo')).seedDemo(env, context);
export default withDemo({
  async scheduled(_event: unknown, env: Env) {
    await (await import('./scheduled')).scheduled(env);
  },
  async fetch(request: Request, original: Env) {
   const path = new URL(request.url).pathname;
   // Buffer bounded API uploads before auditPrincipal performs asynchronous authentication.
   // Keep refusals and read failures inside the audited boundary after transport is consumed.
   let received:Request|Response=request,bodyFailure:{error:unknown}|undefined;
   try {received=await receivedRequest(request)} catch(error){bodyFailure={error}}
   let documentWorkspace: WorkspaceSnapshot | undefined;
   const result = await auditedRequest(request,original,async env => {
    if(bodyFailure)throw bodyFailure.error;
    if(received instanceof Response)return received;
    if (path === '/favicon.ico' && ['GET', 'HEAD'].includes(request.method))
      return new Response(null, { status: 308, headers: { location: '/brand/mark.svg' } });
    const asset=await staticAssetResponse(request,env);if(asset)return asset;
    if (request.method === 'POST' && /^\/api\/ingress\/[^/]+$/.test(path)) {
      return nativeIngress.fetch(received, env);
    }
    if (request.method === 'GET' && (path === '/api/workspace' || path === '/api/on-call')) {
      const { workspaceReadApi } = await import('./workspace-read-api');
      return workspaceReadApi.fetch(received, env);
    }
    if ((request.method === 'GET' && (path === '/api/triage' || path === '/api/triage/views' || path === '/api/readiness')) ||
        (request.method === 'POST' && path === '/api/command') ||
        (path === '/api/sources' && (request.method === 'GET' || request.method === 'POST'))) {
      const { coordinationApi } = await import('./coordination-api');
      return coordinationApi.fetch(received, env);
    }
    const bindings=runtimeBindings(env);
    if (path === '/api/rer/business-settings' || path === '/rer-business-logo' || path === '/rer-business.css') {
      const settings = await businessSettings(bindings).handle(received);
      if (settings) return settings;
    }
    if (path === '/api/rer/people-link' || path === '/agents/people') {
      const { businessPeopleResponse } = await import('./agent-door/people-link');
      const linking = await businessPeopleResponse(bindings, received);
      if (linking) return linking;
    }
    if (isAgentPath(path)) {
      const { agentResponse } = await import('./agent-door/response');
      const agents = await agentResponse(received, bindings, path);
      if (agents) return agents;
    }
    const subscription=await subscriptionResponse(request,bindings);if(subscription)return subscription;
    const address=new URL(request.url), appDocument=isWorkspacePath(address.pathname);
    const route=workspaceAddress(address.pathname);
    let documentStatus=route.page==='not-found'?404:200;
    let workspace: WorkspaceSnapshot | undefined;
    const apiFetch = async (target: Request) => (await import('./api')).api.fetch(target, env);
    const lobby=async()=>{
      const root=new Request(new URL('/',request.url),{method:request.method,headers:request.headers});
      const response=await lobbyResponse(root,bindings,identity);
      return response ? lobbyPaths(response, documentStatus) : response;
    };
    const state=await setupStateResponse(request,bindings);if(state)return state;
    if(appDocument) {
      if(!admitted(request,bindings.AUTH_ORIGIN))return new Response('Not found',{status:404});
      if(!['GET','HEAD'].includes(request.method))return (await lobby())!;
      // No workspace authority is possible without a credential. Keep the public
      // Lobby on its claim-state read instead of the private workspace API.
      // Native local cookies carry a port, including dev/sign-in-as sessions.
      const hasCredential=!!readSessionCookie(request)||(request.headers.get('cookie')??'').split(';').some(cookie=>
        /^(?:__Host-operator_session|operator_session_local(?:_\d+)?)=/.test(cookie.trim()));
      if(!hasCredential)return (await lobby())!;
      // The same current-member authority protects both native and held password sessions.
      const headers = new Headers(request.headers);
      headers.set(workspaceRefreshHeader, route.page === 'on-call' || route.page === 'alerts' ? 'coverage' : 'state');
      headers.delete(workspaceStateHeader);
      headers.delete(workspaceCoverageHeader);
      const { readWorkspace } = await import('./workspace-read');
      const current = await readWorkspace(env, new Request(request.url, {headers})).catch(async error => {
        const { Fault } = await import('./family/response-operations/domain');
        if (!(error instanceof Fault)) throw error;
        return Response.json({error: error.message}, {status: error.status, headers: {
          'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
        }});
      });
      if (current instanceof Response) return current;
      if ('unchanged' in current) throw new Error('A document requires the current workspace');
      if(current.member) {
        workspace=current;
        const id=route.incident||(address.pathname==='/'?address.searchParams.get('incident'):null);
        if(id&&!current.state?.incidents.some(incident=>incident.id===id))documentStatus=404;
        if(current.member.role==='stakeholder')documentStatus=200;
      }
      if(!current.member) {
        // A restored owner with no workspace mapping still needs the protected mapping door.
        if(bindings.SESSION_SECRET && bindings.OWNER_EMAIL && await operatorAuth(bindings).getSession(request))
          return new Response(null,{status:303,headers:{location:await env.DB.prepare('SELECT 1 FROM credentials LIMIT 1').first()?'/signin/local':'/signin/local?restore=1','cache-control':'no-store'}});
        const response=await lobby();if(response)return response;
      }
    }
    const guide=guideResponse(request);if(guide)return guide;
    if (path.startsWith('/api/rer/import/')) {
      const { importDoorResponse } = await import('./move-in/door');
      const imports = await importDoorResponse(received, bindings);
      if (imports) return imports;
    }
    const auth=await authResponse(received,env as Bindings); if(auth) return auth;
    const response = await dispatch(received, () => apiFetch(received), () =>
      workspace && !import.meta.env.DEV ? workspaceShell(received, env) : render(received));
    if(response.headers.get('content-type')?.startsWith('text/html')) {
      documentWorkspace = workspace;
      const headers=new Headers(response.headers);
      headers.set('cache-control','no-store, no-transform');
      return new Response(response.body,{status:appDocument?documentStatus:response.status,headers});
    }
    return response;
   });
   return installationDocument(result, runtimeBindings(original), path, documentWorkspace);
  },
}, { seed })
