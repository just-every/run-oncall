import http from 'node:http'
import {createHmac} from 'node:crypto'

/** The network edge for outbound events: a real HTTP receiver that verifies each signature and records what arrived. */
export async function receiver() {
 const seen=[],secrets=new Map(),held=[]
 let mode='ok',clients=new Set()
 const server=http.createServer((req,res)=>{
  const chunks=[];req.on('data',c=>chunks.push(c));req.on('end',()=>{
   const body=Buffer.concat(chunks).toString(),h=req.headers,secret=secrets.get(req.url)
   const expected=secret?createHmac('sha256',secret).update(h['x-oncall-timestamp']+'.'+body).digest('hex'):null
   const entry={path:req.url,headers:h,body,payload:JSON.parse(body||'null'),verified:expected!==null&&expected===h['x-oncall-signature'],mode,duplicate:seen.some(s=>s.headers['x-oncall-operation-id']===h['x-oncall-operation-id'])}
   seen.push(entry)
   if(mode==='hang'){held.push(res);return}
   if(mode==='drop'){req.socket.destroy();return}
   if(mode==='redirect'){res.writeHead(302,{location:'http://127.0.0.1:1/never'});res.end();return}
   res.writeHead(mode==='fail500'?500:mode==='reject400'?400:200);res.end('{}')
  })
 })
 server.on('connection',s=>{clients.add(s);s.on('close',()=>clients.delete(s))})
 await new Promise(r=>server.listen(0,'127.0.0.1',r))
 return {seen,port:server.address().port,url:path=>`http://127.0.0.1:${server.address().port}${path}`,secret:(path,value)=>secrets.set(path,value),
  mode:value=>{mode=value},release:()=>{for(const r of held.splice(0))r.destroy()},
  close:async()=>{for(const s of clients)s.destroy();await new Promise(r=>server.close(r))}}
}
