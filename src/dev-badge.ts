import { api } from './api'
import type { Bindings } from './auth.server'
import { readSessionCookie } from './session-cookie'

// The shared development badge knows email identity. Oncall also accepts a
// workspace password, so show its validated workspace principal when present.
export async function workspaceBadge(response:Response,request:Request,env:Bindings,execution:ExecutionContext) {
 if(!response.headers.get('content-type')?.startsWith('text/html') || !readSessionCookie(request))return response
 const session=await api.fetch(new Request(new URL('/api/session',request.url),{headers:request.headers}),env,execution)
 if(!session.ok)return response
 const {member}=await session.json() as {member:{name:string;role:string}|null}
 if(!member)return response
 return new HTMLRewriter()
  .on('#rer-dev-badge summary',{element(element){element.setInnerContent(`Dev: ${member.name} (${member.role}, workspace identity)`)}})
  .on('#rer-dev-badge a[aria-current]',{element(element){element.removeAttribute('aria-current')}})
  .transform(response)
}
