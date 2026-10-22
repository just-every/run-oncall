import {fileURLToPath} from 'node:url'
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createServer} from 'node:net'
import {loadavg,platform} from 'node:os'
import {readDevKey,signInAs} from '../src/modules/operator-auth/dev/sign-in-as.mjs'

export async function managedSeed(bindings={}){
 const socket=createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r))
 const origin=`http://127.0.0.1:${port}`,children=[],env={...process.env,CI:'true',RER_SERVER_JOURNEY:'1',WRANGLER_SEND_METRICS:'false',...bindings}
 const safe=s=>s.replace(/#rer-dev=[^\s"']+/g,'#rer-dev=[redacted]').replace(/\?token=[^\s"']+/g,'?token=[redacted]')
 function spawnCommand(args){const child=spawn(process.execPath,[fileURLToPath(import.meta.resolve('@runeditrun/rer/internal/bin/rer.mjs')),...args],{env,stdio:['ignore','pipe','pipe']});children.push(child);let output='';for(const stream of [child.stdout,child.stderr])stream.on('data',c=>output+=c);return {child,output:()=>output}}
 async function capacity(){
  // Leave startup headroom on the shared Mac; the CLI's own limit stays 36.
  const ceiling=platform()==='darwin'?30:36
  for(let minute=0;loadavg()[0]>ceiling;minute++){if(minute>=20)throw Error('Managed server load guard did not clear in 20 minutes');console.log('Managed server waiting for the shared host load guard');await new Promise(r=>setTimeout(r,60000))}
 }
 async function command(args,status=0){if(args[0]==='setup')await capacity();const run=spawnCommand(args),code=await new Promise(r=>run.child.once('exit',r));assert.equal(code,status,safe(run.output()).slice(-1400));return run.output()}
 async function start(){
  await capacity()
  const run=spawnCommand(['dev','--port',String(port),'--idle-timeout','180','--non-interactive']);for(let n=0;n<600;n++){if(run.child.exitCode!==null)throw Error(safe(run.output()).slice(-1400));if(run.output().includes('RER_OPEN'))return;await new Promise(r=>setTimeout(r,250))}throw Error('Managed dev readiness timeout')}
 // Serve the real Vite/Worker HTTP entry without a second process injecting cron
 // requests. Transfer tests control trigger delivery explicitly while comparing
 // exact snapshots; production scheduling is exercised by the automation journey.
 async function startHttp(){
  await capacity()
  const key=await readDevKey(process.cwd()),child=spawn(process.execPath,['node_modules/vite/bin/vite.js','dev','--host','127.0.0.1','--port',String(port),'--strictPort'],{env:{...env,RER_DEV_ORIGIN:origin,RER_DEV_KEY:key,RER_DEV_IDENTITY:'on'},stdio:['ignore','pipe','pipe']});children.push(child);console.log('Owned transfer HTTP runtime PID',child.pid)
  let output='';for(const stream of [child.stdout,child.stderr])stream.on('data',c=>output+=c)
  for(let n=0;n<240;n++){
   if(child.exitCode!==null)throw Error(safe(output).split(key).join('[redacted]').slice(-1400))
   try{if((await fetch(origin+'/health')).ok)return}catch{}
   await new Promise(r=>setTimeout(r,250))
  }
  throw Error('Transfer HTTP runtime readiness timeout')
 }
 const owner=async()=>{const {header}=await signInAs({origin,key:await readDevKey(process.cwd())});return header}
 async function request(path,input,cookie,extraHeaders={}){const response=await fetch(origin+path,{method:input===undefined?'GET':'POST',redirect:'manual',headers:{origin,connection:'close','content-type':'application/json',...(cookie?{cookie}:{}),...extraHeaders},body:input===undefined?undefined:JSON.stringify(input)});const text=await response.text();let value;try{value=JSON.parse(text)}catch{value=text}return {status:response.status,value,cookie:response.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')}}
 async function close(){for(const child of children)if(child.exitCode===null){child.kill('SIGTERM');await new Promise(r=>child.once('exit',r))}}
 return {port,origin,command,start,startHttp,owner,request,close}
}
