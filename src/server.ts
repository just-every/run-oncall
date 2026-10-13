import start from '@tanstack/react-start/server-entry'
import { dispatch } from './base/dispatch'
import { staticAssetResponse } from './base/static-assets'
import { guideResponse } from './move-in-guide'
import { api } from './api'
import { authResponse, type Bindings } from './auth.server'
import {receivedRequest} from './request-body'
type Env=Bindings & {LOCAL_ONLY:string}
export default {
  async fetch(request,env,execution) {
    const guide=guideResponse(request);if(guide)return guide;
    const asset=await staticAssetResponse(request,env);if(asset)return asset;
    const received=await receivedRequest(request);if(received instanceof Response)return received;
    const auth=await authResponse(received,env as Bindings); if(auth) return auth;
    return dispatch(received,()=>api.fetch(received,env,execution),()=>start.fetch(received));
  },
} satisfies ExportedHandler<Env>
