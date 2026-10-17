// Consume bounded API transport bytes before asynchronous authority/storage.
// The outer workerd proxy must not lose an unread upload when an early denial
// returns. Preserve the exact bytes for scoped raw-body HMAC admission.
const maximum=1000000+5*1024*1024+1024
export async function receivedRequest(request:Request):Promise<Request|Response>{
 const path=new URL(request.url).pathname
 if((!path.startsWith('/api/')&&path!=='/v2/change/enqueue')||!request.body)return request
 const reader=request.body.getReader(),chunks:Uint8Array[]=[];let length=0
 try{
  for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength
   if(length>maximum){await reader.cancel();return Response.json({error:'Request too large'},{status:413,headers:{'Cache-Control':'no-store'}})}
   chunks.push(value)
  }
 }finally{reader.releaseLock()}
 const bytes=new Uint8Array(length);let offset=0
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 return new Request(request,{body:bytes.buffer})
}
