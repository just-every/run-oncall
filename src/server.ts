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
type Env=Bindings & {LOCAL_ONLY:string}
export default {
  async fetch(request,env,execution) {
    const asset=await staticAssetResponse(request,env);if(asset)return asset;
    const bindings=runtimeBindings(env);
    const state=await setupStateResponse(request,bindings);if(state)return state;
    if(new URL(request.url).pathname==='/') {
      if(!admitted(request,bindings.AUTH_ORIGIN))return new Response('Not found',{status:404});
      if(!['GET','HEAD'].includes(request.method))return (await lobbyResponse(request,bindings,identity))!;
      // No workspace authority is possible without a credential. Keep the public
      // Lobby on its claim-state read instead of the local-only workspace API.
      // Native local cookies carry a port, including dev/sign-in-as sessions.
      const hasCredential=(request.headers.get('cookie')??'').split(';').some(cookie=>
        /^(?:oncall_session|__Host-operator_session|operator_session_local(?:_\d+)?)=/.test(cookie.trim()));
      if(!hasCredential)return (await lobbyResponse(request,bindings,identity))!;
      // The same current-member authority protects both native and held password sessions.
      const sessionUrl=new URL('/api/session',request.url);
      const session=await api.fetch(new Request(sessionUrl,{headers:request.headers}),env,execution);
      if(!session.ok)return session;
      if(!(await session.json() as {member:unknown}).member) {
        // A restored owner with no workspace mapping still needs the protected mapping door.
        if(bindings.SESSION_SECRET && bindings.OWNER_EMAIL && await operatorAuth(bindings).getSession(request))
          return new Response(null,{status:303,headers:{location:'/signin/local','cache-control':'no-store'}});
        const lobby=await lobbyResponse(request,bindings,identity);if(lobby)return lobby;
      }
    }
    const guide=guideResponse(request);if(guide)return guide;
    const received=await receivedRequest(request);if(received instanceof Response)return received;
    const auth=await authResponse(received,env as Bindings); if(auth) return auth;
    const response=await dispatch(received,()=>api.fetch(received,env,execution),()=>start.fetch(received));
    if(response.headers.get('content-type')?.startsWith('text/html')) {
      const headers=new Headers(response.headers);
      headers.set('cache-control','no-store, no-transform');
      return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
    }
    return response;
  },
} satisfies ExportedHandler<Env>
