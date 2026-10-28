const attempts=new Map()
const bytes=new TextEncoder()
async function hmac(key,value) {
 const imported=await crypto.subtle.importKey('raw',bytes.encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign'])
 return [...new Uint8Array(await crypto.subtle.sign('HMAC',imported,bytes.encode(value)))].map(n=>n.toString(16).padStart(2,'0')).join('')
}
export default {async fetch(request,{fixture}={}) {
 if(!fixture?.key||request.method!=='POST')return new Response('Refused',{status:403})
 const raw=await request.text(),timestamp=request.headers.get('x-oncall-timestamp'),signature=request.headers.get('x-oncall-signature')
 if(signature!==await hmac(fixture.key,timestamp+'.'+raw))return new Response('Signature refused',{status:401})
 const attribution=request.headers.get('x-oncall-prepared-by')
 if(attribution&&request.headers.get('x-oncall-prepared-signature')!==await hmac(fixture.key,timestamp+'.'+attribution+'.'+raw))return new Response('Attribution signature refused',{status:401})
 let body;try{body=JSON.parse(raw)}catch{return new Response('Invalid body',{status:400})}
 if(Object.keys(body).sort().join(',')!=='at,incident,operationId,revision,service,state,type'||body.service!=='agent-service'||request.headers.get('x-oncall-operation')!==body.operationId)return new Response('Projection refused',{status:403})
 const count=(attempts.get(body.operationId)??0)+1;attempts.set(body.operationId,count)
 const result=fixture.uncertain?'':fixture.accept||count>1?'accepted':'retry'
 if(!result)return new Response(null,{status:200})
 return new Response(null,{status:result==='accepted'?200:503,headers:{'x-oncall-result':result,'x-oncall-receipt':await hmac(fixture.key,body.operationId+'.'+timestamp+'.'+result)}})
}}
