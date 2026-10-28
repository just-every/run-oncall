import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {readFile,readdir,mkdtemp,rm} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:net';
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
export async function automationRuntime(edge=()=>new Response('refused',{status:403}),bindings={}) {
 const directory=await mkdtemp(join(tmpdir(),'oncall-automation-')),build=resolve('dist/server'),config=JSON.parse(await readFile(join(build,'wrangler.json'),'utf8')),entry=join(build,config.main);
 const modules=[entry,...(await walk(build)).filter(p=>p!==entry&&types[extname(p)])].map(path=>({type:types[extname(path)],path}));
 const socket=createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
 const secret=randomBytes(32).toString('hex');let mf,db,origin='http://127.0.0.1:'+port;
 if(typeof bindings==='function')bindings=bindings(origin);
 const options=()=>convertV4MiniflareOptions({host:'127.0.0.1',port,cf:false,unsafeTriggerHandlers:true,resourcePersistencePath:join(directory,'data'),workers:[{name:'app',modules,modulesRoot:build,compatibilityDate:config.compatibility_date,compatibilityFlags:config.compatibility_flags,bindings:{SESSION_SECRET:secret,AUTH_LOCAL:'true',AUTH_ORIGIN:origin,OWNER_EMAIL:'synthetic-oncall-owner@example.test',...bindings},d1Databases:{DB:'automation-db'},outboundService:edge,...(config.assets?{assets:{directory:resolve('dist/client'),binding:'ASSETS',routerConfig:{has_user_worker:true,invoke_user_worker_ahead_of_assets:true}}}:{})}]});
 async function start(){mf=new Miniflare(options());origin=(await mf.ready).origin;db=await mf.getD1Database('DB','app');recordOwnedProcesses();}
 await start();
 for(const name of (await readdir('migrations/core')).filter(n=>n.endsWith('.sql')).sort())await db.batch(split(await readFile('migrations/core/'+name,'utf8')).map(q=>db.prepare(q)));
 return {get db(){return db;},get origin(){return origin;},get mf(){return mf;},async restart(){await mf.dispose();await start();},async close(){await mf.dispose();await rm(directory,{recursive:true,force:true});},async request(path,data,cookie='',headers={}){const response=await fetch(origin+path,{method:data===undefined?'GET':'POST',headers:{origin,'content-type':'application/json',cookie,...headers},...(data===undefined?{}:{body:JSON.stringify(data)})});return {status:response.status,value:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0],headers:response.headers};}};
}
