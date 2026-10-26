import {createRequire} from 'node:module'
import {pathToFileURL} from 'node:url'
import {readdir} from 'node:fs/promises'
import {DatabaseSync} from 'node:sqlite'
import {dirname,extname,join,resolve} from 'node:path'

const require=createRequire(import.meta.url),wrangler=require.resolve('wrangler/package.json')
const {unstable_readConfig,unstable_getMiniflareWorkerOptions}=require('wrangler')
const {Miniflare,convertV4MiniflareOptions}=await import(pathToFileURL(createRequire(wrangler).resolve('miniflare')))
const [configFile,persist,port,envFile]=process.argv.slice(2)
const config=unstable_readConfig({config:configFile})
const {workerOptions,main,externalWorkers}=unstable_getMiniflareWorkerOptions(config,undefined,{envFiles:[envFile]})
const {modulesRules,...options}=workerOptions
const types={'.js':'ESModule','.mjs':'ESModule','.cjs':'CommonJS','.wasm':'CompiledWasm','.bin':'Data','.txt':'Text','.html':'Text','.sql':'Text'}
const walk=async directory=>(await Promise.all((await readdir(directory,{withFileTypes:true})).filter(entry=>entry.name!=='.wrangler').map(entry=>{
 const path=join(directory,entry.name)
 return entry.isDirectory()?walk(path):[path]
}))).flat()
const root=dirname(main),modules=[main,...(await walk(root)).filter(path=>path!==main&&types[extname(path)])].map(path=>({type:types[extname(path)],path}))

// SQLite checkpoints and deletes the WAL under an exclusive lock when the last
// connection to a database closes. Workerd closes the Worker's D1 object after
// ten idle seconds while journeys read the file out of process (wrangler d1
// execute, no busy timeout), so one closing as another opens fails SQLITE_BUSY.
// Hold each D1 database open and idle while this Worker serves.
const d1=resolve(persist,'v3','d1','miniflare-D1DatabaseObject')
const held=(await readdir(d1)).filter(name=>name.endsWith('.sqlite')).map(name=>{
 const db=new DatabaseSync(join(d1,name))
 db.prepare('SELECT count(*) FROM sqlite_master').get()
 return db
})

// Exercise the emitted Worker over HTTP. Wrangler's additional dev proxy can
// reuse a downstream socket as its five-second idle timeout closes it; it cannot
// safely retry a POST. Keep Wrangler's binding/assets projection and D1 layout,
// and the scheduled and email trigger doors wrangler dev serves under /cdn-cgi/local/.
const runtime=new Miniflare(convertV4MiniflareOptions({
 host:'127.0.0.1',port:Number(port),resourcePersistencePath:resolve(persist,'v3'),unsafeTriggerHandlers:true,
 workers:[{...options,name:config.name,modules,modulesRoot:root},...externalWorkers],
}))
const stop=async()=>{await runtime.dispose();for(const db of held)db.close();process.exit(0)}
process.once('SIGTERM',stop)
process.once('SIGINT',stop)
try{await runtime.ready}catch(error){await runtime.dispose();throw error}
