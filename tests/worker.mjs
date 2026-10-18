import {spawn,execFileSync} from 'node:child_process'
import {mkdtemp,rm,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createServer} from 'node:net'
import {randomBytes,createHash} from 'node:crypto'
import http from 'node:http'
import {workerDiagnostics} from './diagnostics.mjs'

export async function localWorker(bindings = {}) {
 const dir=await mkdtemp(join(tmpdir(),'oncall-flow-')),socket=createServer()
 await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r))
 const origin=`http://127.0.0.1:${port}`,secret=()=>randomBytes(32).toString('hex')
 const vars={AUTH_LOCAL:'true',AUTH_ORIGIN:origin,OWNER_EMAIL:'owner@example.test',SESSION_SECRET:secret(),SETUP_TOKEN:secret(),MAIL_FROM:'auth@localhost.test',RER_DEV_KEY:secret(),...bindings}
 await writeFile(join(dir,'local.env'),Object.entries(vars).map(([k,v])=>`${k}=${v}`).join('\n'),{mode:0o600})
 const cli='node_modules/wrangler/bin/wrangler.js',env={...process.env,CI:'true',WRANGLER_SEND_METRICS:'false',CLOUDFLARE_INCLUDE_PROCESS_ENV:'false',CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV:'true'}
 const statements=command=>JSON.parse(execFileSync(process.execPath,[cli,'d1','execute','DB','--local','--persist-to',dir,'--command',command,'--json'],{encoding:'utf8',env,stdio:['ignore','pipe','pipe'],maxBuffer:64*1024*1024})).map(r=>r.results)
 const sql=command=>statements(command)[0]
 execFileSync(process.execPath,[cli,'d1','migrations','apply','DB','--local','--persist-to',dir],{env,stdio:'ignore'})
 let worker,diagnostics
 let failureHandler
 const stop=async()=>{if(worker&&worker.exitCode===null){worker.kill('SIGTERM');await new Promise(r=>worker.once('exit',r))}}
 const start=async()=>{
  diagnostics=workerDiagnostics({...env,...vars})
  worker=spawn(process.execPath,[cli,'dev','--local','--config','dist/server/wrangler.json','--persist-to',dir,'--ip','127.0.0.1','--port',String(port),'--inspector-port','0','--env-file',join(dir,'local.env')],{env,stdio:['ignore','pipe','pipe']})
  let startupError;worker.once('error',error=>{startupError=error;diagnostics.report('startup process error')})
  diagnostics.attach(worker.stdout,'stdout');diagnostics.attach(worker.stderr,'stderr')
  for(let n=0;n<240;n++){if(startupError)throw Error('Worker process could not start');if(worker.exitCode!==null){diagnostics.report('startup exited');throw Error('Worker exited before readiness')};try{if((await fetch(origin+'/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,250))}
  diagnostics.report('startup readiness failed');throw Error('Worker readiness failed')
 }
 // Each request opens its own connection: a pooled one the local Worker closed while the test read D1 would fail the next request before it is sent.
 const request=(path,input,cookie,extraHeaders={})=>new Promise((resolve,reject)=>{
  const transportFailure=error=>{diagnostics.report('HTTP transport failed');reject(error)}
  const body=input===undefined?undefined:Buffer.from(JSON.stringify(input))
  const sent=http.request(origin+path,{method:body?'POST':'GET',agent:false,headers:{origin,'content-type':'application/json',...(cookie?{cookie}:{}),...(body?{'content-length':body.length}:{}),...extraHeaders}},res=>{
   const chunks=[];res.on('data',c=>chunks.push(c));res.on('error',transportFailure);res.on('end',()=>{
    const raw=Buffer.concat(chunks).toString('utf8'),headers=new Headers();let value;try{value=JSON.parse(raw)}catch{value=raw}
    for(const [name,v] of Object.entries(res.headers))for(const item of [v].flat())headers.append(name,item)
    resolve({status:res.statusCode,value,cookie:headers.getSetCookie().map(c=>c.split(';')[0]).join('; '),headers})
   })
  })
  sent.on('error',transportFailure);sent.end(body)
 })
 try{await start()}catch(error){await stop();await rm(dir,{recursive:true,force:true});throw error}
 failureHandler=()=>diagnostics.report('test failure')
 process.once('uncaughtExceptionMonitor',failureHandler)
 process.once('exit',code=>{if(code!==0)failureHandler()})
 return {origin,vars,sql,statements,request,start,stop,close:async()=>{await stop();await rm(dir,{recursive:true,force:true})}}
}

// The move-in screen's transport: the owner-session import door, one namespace per vendor. preview uploads the
// original bytes in 64 KiB checksummed chunks and plans them (the server plans a catch-up where the source holds an import);
// apply and undo repeat bounded steps until the job stops moving. Each returns the last {status,value} response.
export function ownerDoor(w,cookie) {
 const call=(vendor,action,body,as=cookie)=>w.request('/api/operator/import/'+action,body,as,{'X-Import-Source':vendor})
 const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
 async function preview(vendor,source,as=cookie,name=vendor+'-export.json') {
  const bytes=Buffer.from(source),totalChunks=Math.ceil(bytes.length/65536)
  let uploadId
  for(let index=0;index<totalChunks;index++) {
   const chunk=bytes.subarray(index*65536,(index+1)*65536)
   const uploaded=await call(vendor,'uploads',{uploadId,name,bundleSha256:hash(bytes),totalBytes:bytes.length,totalChunks,index,chunkSha256:hash(chunk),base64:chunk.toString('base64')},as)
   if(uploaded.status!==200)return uploaded
   uploadId=uploaded.value.uploadId
  }
  return call(vendor,'plan',{uploadId},as)
 }
 async function until(vendor,action,body,moving,as) {
  let response
  do response=await call(vendor,action,body,as)
  while(response.status===200&&moving.includes(response.value.job?.state))
  return response
 }
 return {call,preview,
  apply:(vendor,plan,as=cookie)=>until(vendor,'apply',{planId:plan.planId,reviewedFingerprint:plan.fingerprint},['queued','applying'],as),
  undo:(vendor,planId,as=cookie)=>until(vendor,'undo',{planId},['undoing','rolling_back'],as)}
}
