import {createRequire} from 'node:module'
import {pathToFileURL} from 'node:url'
import {readdir,mkdtemp,rm,writeFile,readFile} from 'node:fs/promises'
import {extname,join,resolve} from 'node:path'
import {fixtureDatabase} from './fixture-database.mjs'
import {spawn,execFileSync} from 'node:child_process'
import {tmpdir} from 'node:os'
import {createServer} from 'node:net'
import {randomBytes,createHash} from 'node:crypto'
import http from 'node:http'
import {workerDiagnostics} from './diagnostics.mjs'
// automation-runtime: part of this public journey.
const require=createRequire(import.meta.url),wrangler=require.resolve('wrangler/package.json');
const {Miniflare,convertV4MiniflareOptions}=await import(pathToFileURL(createRequire(wrangler).resolve('miniflare')));
const {unstable_splitSqlQuery:split}=require('wrangler');
const walk=async dir=>(await Promise.all((await readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]))).flat();
const types={'.js':'ESModule','.mjs':'ESModule','.cjs':'CommonJS','.wasm':'CompiledWasm','.bin':'Data','.txt':'Text','.html':'Text','.sql':'Text'};
export function recordOwnedProcesses() {
 const rows=execFileSync('ps',['-A','-o','pid=,ppid=,comm='],{encoding:'utf8'}).trim().split('\n').map(line=>line.trim().split(/\s+/,3));
 const owned=new Set([String(process.pid)]);let found=true;
 while(found){found=false;for(const [pid,parent] of rows)if(owned.has(parent)&&!owned.has(pid)){owned.add(pid);found=true;}}
 console.log('Owned runtime processes',JSON.stringify(rows.filter(([pid])=>owned.has(pid))));
}
export async function automationRuntime(edge=()=>new Response('refused',{status:403}),native={}) {
 const directory=await mkdtemp(join(tmpdir(),'oncall-automation-')),build=resolve('dist/server'),config=JSON.parse(await readFile(join(build,'wrangler.json'),'utf8')),entry=join(build,config.main);
 const modules=[entry,...(await walk(build)).filter(p=>p!==entry&&types[extname(p)])].map(path=>({type:types[extname(path)],path}));
 const socket=createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
 const secret=randomBytes(32).toString('hex');let mf,db,origin='http://127.0.0.1:'+port;
 const options=()=>convertV4MiniflareOptions({host:'127.0.0.1',port,cf:false,unsafeTriggerHandlers:true,resourcePersistencePath:join(directory,'data'),workers:[{name:'app',modules,modulesRoot:build,compatibilityDate:config.compatibility_date,compatibilityFlags:config.compatibility_flags,bindings:{SESSION_SECRET:secret,AUTH_LOCAL:'true',AUTH_ORIGIN:origin,OWNER_EMAIL:'synthetic-oncall-owner@example.test',...(native.bindings?.(origin)??{})},d1Databases:{DB:'automation-db'},outboundService:edge,...(config.assets?{assets:{directory:resolve('dist/client'),binding:'ASSETS',routerConfig:{has_user_worker:true,invoke_user_worker_ahead_of_assets:true}}}:{})}]});
 async function start(){mf=new Miniflare(options());origin=(await mf.ready).origin;db=await mf.getD1Database('DB','app');recordOwnedProcesses();}
 await start();
 for(const name of (await readdir('migrations/core')).filter(n=>n.endsWith('.sql')).sort())await db.batch(split(await readFile('migrations/core/'+name,'utf8')).map(q=>db.prepare(q)));
 return {get db(){return db;},get origin(){return origin;},get mf(){return mf;},async restart(){await mf.dispose();await start();},async close(){await mf.dispose();await rm(directory,{recursive:true,force:true});},async request(path,data,cookie='',headers={}){const response=await fetch(origin+path,{method:data===undefined?'GET':'POST',headers:{origin,'content-type':'application/json',cookie,...headers},...(data===undefined?{}:{body:JSON.stringify(data)})});return {status:response.status,value:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0],headers:response.headers};}};
}


// runtime-held-workspace: part of this public journey.
// Hand-authored held installation data, deliberately ordered differently from
// entity IDs. The migration must preserve every array, nested snapshot and entry.
export function heldWorkspace() {
  const at = n => `2026-10-01T00:00:${String(n).padStart(2, '0')}.000Z`;
  const members = [
    { id: 'prior-admin', name: 'Prior Operator', role: 'admin', active: true },
    { id: 'z-responder', name: 'Held Responder', role: 'responder', active: true },
    { id: 'a-viewer', name: 'Held Viewer', role: 'viewer', active: false },
  ];
  const services = ['z', 'a', 'm'].map((key, index) => ({
    id: index === 0 ? 'prior-service' : `${key}-service`, name: `${key} held service`,
    environment: index === 1 ? 'staging' : 'production', owner: 'z-responder',
    runbook: [`${key} original instruction`, `${key} retain evidence`], pager: '',
  }));
  const policies = services.map((service, index) => ({
    id: ['z-policy', 'a-policy', 'm-policy'][index], version: index + 2,
    service: service.id, severity: '*', action: 'route', owner: 'z-responder', reason: 'Held routing instruction',
  }));
  const events = services.flatMap((service, index) => ['trigger', 'recover'].map((intent, n) => ({
    source: 'held-monitor', eventId: `${service.id}-${intent}`, service: service.id, environment: service.environment,
    key: 'held-key', generation: 'held-generation', intent, severity: 'warning', title: 'Held event title',
    observedAt: at(index * 2 + n), evidence: 'https://example.test/held-evidence',
    id: `${['z', 'a', 'm'][index]}-event-${n}`, acceptedAt: at(index * 2 + n),
    decision: { policy: policies[index].id, version: policies[index].version, action: 'route', owner: 'z-responder', reason: 'Held routing instruction' },
    routingSnapshot: { policies: structuredClone(policies), members: structuredClone(members), evaluatedAt: at(index * 2 + n) },
  })));
  const alerts = services.map((service, index) => ({
    id: `${['z', 'a', 'm'][index]}-alert`, source: 'held-monitor', service: service.id, environment: service.environment,
    key: 'held-key', generation: 'held-generation', state: 'recovered',
    events: events.filter(event => event.service === service.id).map(event => event.id), owner: 'z-responder', suppressed: false,
  }));
  const incidents = services.map((service, index) => ({
    id: `${['z', 'a', 'm'][index]}-incident`, title: 'Held incident', service: service.id, severity: 'warning', state: 'resolved',
    commander: 'z-responder', revision: 6, createdAt: at(0), alerts: [alerts[index].id],
    timeline: ['declared', 'transition', 'action', 'transition', 'transition', 'review'].map((kind, n) => ({
      id: `${service.id}-${['z', 'a', 'y', 'b', 'x', 'c'][n]}-history`, at: at(n), actor: n === 0 ? 'prior-admin' : 'z-responder', kind, text: `Held ${kind} entry ${n}`,
    })),
    runbook: [{ text: `${service.id} copied instruction`, done: true }, { text: 'Copied uncompleted instruction', done: false }],
    actions: [{ id: `${service.id}-z-action`, title: 'Retained open follow-up', owner: 'z-responder', due: '2026-10-20', done: false, evidence: '' },
      { id: `${service.id}-a-action`, title: 'Retained completed follow-up', owner: 'prior-admin', due: '2026-10-02', done: true, evidence: 'https://example.test/follow-up' }],
    recovery: 'https://example.test/recovery', review: 'Held review remains editable',
  }));
  const audit = ['z', 'a', 'm'].map((key, index) => ({ id: `${key}-audit`, at: at(index), actor: 'prior-admin', kind: 'service', text: `Held ${key} service change` }));
  return { schemaVersion: 1, revision: 3, members, services, policies, events, alerts, incidents, audit };
}


export async function localWorker(bindings = {}, {persistTo,clock=false,fetchSource=""} = {}) {
 const dir=await mkdtemp(join(tmpdir(),'oncall-flow-')),socket=createServer()
 await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r))
 const persist=persistTo??dir;
 const origin=`http://127.0.0.1:${port}`,secret=()=>randomBytes(32).toString('hex')
 const vars={AUTH_LOCAL:'true',AUTH_ORIGIN:origin,OWNER_EMAIL:'owner@example.test',SESSION_SECRET:secret(),SETUP_TOKEN:secret(),MAIL_FROM:'auth@localhost.test',RER_DEV_KEY:secret(),...bindings}
 await writeFile(join(dir,'local.env'),Object.entries(vars).map(([k,v])=>`${k}=${v}`).join('\n'),{mode:0o600})
 const cli='node_modules/wrangler/bin/wrangler.js',env={...process.env,CI:'true',WRANGLER_SEND_METRICS:'false',CLOUDFLARE_INCLUDE_PROCESS_ENV:'false',CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV:'true'}
 const statements=command=>fixtureDatabase(persist,command)
 const sql=command=>statements(command)[0]
 execFileSync(process.execPath,[cli,'d1','migrations','apply','DB','--local','--persist-to',persist],{env,stdio:'ignore'})
 let config='dist/server/wrangler.json',clockFiles=[];
 if(clock||fetchSource){
  const name='.test-clock-'+randomBytes(8).toString('hex'),wrapper=resolve('dist/server',name+'.js');
  config=resolve('dist/server',name+'.json');clockFiles=[wrapper,config];
  const built=JSON.parse(await readFile('dist/server/wrangler.json','utf8'));
  await writeFile(wrapper,`import app from './${built.main}';
const RealDate=Date;let at;
// The test platform clock must agree for Date.now() and no-argument new Date().
// Explicit source timestamps and all native Date parsing remain unchanged.
if(${clock})globalThis.Date=class extends RealDate {constructor(...args){super(...(args.length?args:[at??RealDate.now()]));}static now(){return at??RealDate.now();}};
${fetchSource}
export default {...app,async fetch(request,env,ctx){if(new URL(request.url).pathname==='/__provider_control'&&${Boolean(fetchSource)}){const input=await request.json();providerMode=input.mode??'normal';providerCalls=[];pkceChallenge=input.challenge??pkceChallenge;return Response.json({ok:true});}if(new URL(request.url).pathname==='/__provider_calls'&&${Boolean(fetchSource)})return Response.json({calls:providerCalls,pkceValid,revoked});if(new URL(request.url).pathname==='/__provider_cron'&&${Boolean(fetchSource)}){await app.scheduled({},env,ctx);return Response.json({ok:true});}if(new URL(request.url).pathname==='/__test_clock'){at=Number(await request.text());return new Response('clock injected');}return app.fetch(request,env,ctx);}};`);
  await writeFile(config,JSON.stringify({...built,main:name+'.js'}));
 }
 let worker,diagnostics,logLines=''
 let failureHandler
 const stop=async()=>{if(worker&&worker.exitCode===null){worker.kill('SIGTERM');await new Promise(r=>worker.once('exit',r))}}
 const start=async()=>{
  diagnostics=workerDiagnostics({...env,...vars})
  worker=spawn(process.execPath,['tests/worker-server.mjs',config,persist,String(port),join(dir,'local.env')],{env,stdio:['ignore','pipe','pipe']})
  let startupError;worker.once('error',error=>{startupError=error;diagnostics.report('startup process error')})
  diagnostics.attach(worker.stdout,'stdout');diagnostics.attach(worker.stderr,'stderr');for(const stream of [worker.stdout,worker.stderr])stream.on('data',chunk=>{logLines+=chunk.toString()})
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
 // A sender's raw body (string or bytes) takes its own connection for the same reason, as does the injected clock.
 const send=(path,raw,headers={},method='POST')=>new Promise((resolve,reject)=>{
  const transportFailure=error=>{diagnostics.report('HTTP transport failed');reject(error)}
  const body=raw===undefined?undefined:Buffer.from(raw)
  const sent=http.request(origin+path,{method,agent:false,headers:{...headers,...(body?{'content-length':body.length}:{})}},res=>{
   const chunks=[];res.on('data',c=>chunks.push(c));res.on('error',transportFailure);res.on('end',()=>{
    const text=Buffer.concat(chunks).toString('utf8'),received=new Headers();let value;try{value=JSON.parse(text)}catch{value=text}
    for(const [name,v] of Object.entries(res.headers))for(const item of [v].flat())received.append(name,item)
    resolve({status:res.statusCode,value,headers:received})
   })
  })
  sent.on('error',transportFailure);sent.end(body)
 })
 try{await start()}catch(error){await stop();await rm(dir,{recursive:true,force:true});throw error}
 failureHandler=()=>diagnostics.report('test failure')
 process.once('uncaughtExceptionMonitor',failureHandler)
 process.once('exit',code=>{if(code!==0)failureHandler()})
 return {origin,vars,sql,statements,request,send,start,stop,logs:()=>logLines,time:async at=>{if(!clock)throw Error('Clock not injected');const r=await send('/__test_clock',String(at));if(r.status<200||r.status>=300)throw Error('Clock injection failed');},close:async()=>{await stop();await rm(dir,{recursive:true,force:true});for(const file of clockFiles)await rm(file,{force:true});}}
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
