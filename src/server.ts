import { sweepMoveInConsent } from './move-in/pagerduty-oauth';
import {lobbyPaths} from './app/lobbyPaths';
import {isWorkspacePath, workspaceAddress} from './app/paths';
import {subscriptionResponse} from './schedule-coordination/feed';
import {sweepDeadlines} from './incident-deadlines/sweep';
import { dispatchOutbox } from './automation/dispatch'
import { auditedDatabase } from './audit-database'
import { receiveEmail } from './email/receive'
import { auditedRequest } from './audit-request'
import { withDemo } from './modules/demo/index.mjs'
import { seedDemo } from './demo'
import start from '@tanstack/react-start/server-entry'
import { dispatch } from './base/dispatch'
import { staticAssetResponse } from './base/static-assets'
import { guideResponse } from './move-in-guide'
import { api } from './api'
import { admitted, setupStateResponse } from './base/setup-state'
import { lobbyResponse } from './base/lobby'
import { identity } from './identity'
import { authResponse, runtimeBindings, operatorAuth, type Bindings } from './auth.server'
import {receivedRequest} from './request-body'
import { workspaceDocument } from './workspace-document'
import {readSessionCookie} from './session-cookie'
import {importDoorResponse} from './move-in/door'
import {agentDoorResponse,personChange} from './agent-door'
type Env=Bindings
export default withDemo({
  async scheduled(_event,env) {
    const moveIn=auditedDatabase(env.DB,{feature:'move-in',kind:'move-in.consent.cleanup',actor:{kind:'service',id:'move-in-consent'},source:{kind:'provider',id:'pagerduty'},commits:0,storageFailed:false});
    if((await sweepMoveInConsent({...env,DB:moveIn.db})).failed)await moveIn.record('failed');
    const deadlines=auditedDatabase(env.DB,{feature:'incident-deadlines',kind:'deadline.sweep',actor:{kind:'service',id:'incident-deadlines'},source:{kind:'door',id:'scheduled'},commits:0,storageFailed:false});
    await sweepDeadlines(deadlines.db,{...env,DB:deadlines.db});
    for(let n=0;n<10;n++) {
      const audit=auditedDatabase(env.DB,{feature:'automation',kind:'automation.dispatch',actor:{kind:'service',id:'outbox-dispatcher'},source:{kind:'door',id:'outbox-dispatcher'},commits:0,storageFailed:false});
      if(!(await dispatchOutbox({...env,DB:audit.db})).processed)break;
    }
  },
  async email(message,env) { await receiveEmail(message,runtimeBindings(env)); },
  async fetch(request,original,execution) {
   // Buffer bounded API uploads before auditPrincipal performs asynchronous authentication.
   // Keep refusals and read failures inside the audited boundary after transport is consumed.
   let received:Request|Response=request,bodyFailure:{error:unknown}|undefined;
   try {received=await receivedRequest(request)} catch(error){bodyFailure={error}}
   return auditedRequest(request,original,async env => {
    if(bodyFailure)throw bodyFailure.error;
    if(received instanceof Response)return received;
    if (new URL(request.url).pathname === '/favicon.ico' && ['GET', 'HEAD'].includes(request.method))
      return new Response(null, { status: 308, headers: { location: '/brand/mark.svg' } });
    const asset=await staticAssetResponse(request,env);if(asset)return asset;
    const bindings=runtimeBindings(env);
    const agents=await agentDoorResponse(received,bindings);if(agents)return agents;
    const subscription=await subscriptionResponse(request,bindings);if(subscription)return subscription;
    let workspace: any;
    const address=new URL(request.url), appDocument=isWorkspacePath(address.pathname);
    const route=workspaceAddress(address.pathname);
    let documentStatus=route.page==='not-found'?404:200;
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
      const sessionUrl=new URL('/api/workspace',request.url);
      const session=await api.fetch(new Request(sessionUrl,{headers:request.headers}),env,execution);
      if(!session.ok)return session;
      const current=await session.json() as {member:unknown;state?:{incidents:{id:string}[]}};
      if(current.member) {
        workspace=current;
        const id=route.incident||(address.pathname==='/'?address.searchParams.get('incident'):null);
        if(id&&!current.state?.incidents.some((incident:any)=>incident.id===id))documentStatus=404;
        if((current.member as any).role==='stakeholder')documentStatus=200;
      }
      if(!current.member) {
        // A restored owner with no workspace mapping still needs the protected mapping door.
        if(bindings.SESSION_SECRET && bindings.OWNER_EMAIL && await operatorAuth(bindings).getSession(request))
          return new Response(null,{status:303,headers:{location:await env.DB.prepare('SELECT 1 FROM credentials LIMIT 1').first()?'/signin/local':'/signin/local?restore=1','cache-control':'no-store'}});
        const response=await lobby();if(response)return response;
      }
    }
    const guide=guideResponse(request);if(guide)return guide;
    const imports=await importDoorResponse(received,bindings);if(imports)return imports;
    const auth=await authResponse(received,env as Bindings); if(auth) return auth;
    let eventInput:any;
    if(received.method==='POST'&&!received.headers.has('authorization')&&(address.pathname==='/api/command'||address.pathname.startsWith('/api/schedules/')))try{eventInput=await received.clone().json()}catch{}
    const response=await dispatch(received,()=>api.fetch(received,env,execution),()=>start.fetch(received));
    await personChange(request,response,bindings,eventInput);
    if(response.headers.get('content-type')?.startsWith('text/html')) {
      const headers=new Headers(response.headers);
      headers.set('cache-control','no-store, no-transform');
      const document=new Response(response.body,{status:appDocument?documentStatus:response.status,headers});
      return workspace ? workspaceDocument(document,workspace) : document;
    }
    return response;
   });
  },
} satisfies ExportedHandler<Env>, { seed: seedDemo })
