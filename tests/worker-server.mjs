import {createRequire} from 'node:module'
import {pathToFileURL} from 'node:url'
import {readdir} from 'node:fs/promises'
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

// Exercise the emitted Worker over HTTP. Wrangler's additional dev proxy can
// reuse a downstream socket as its five-second idle timeout closes it; it cannot
// safely retry a POST. Keep Wrangler's binding/assets projection and D1 layout.
const runtime=new Miniflare(convertV4MiniflareOptions({
 host:'127.0.0.1',port:Number(port),resourcePersistencePath:resolve(persist,'v3'),
 workers:[{...options,name:config.name,modules,modulesRoot:root},...externalWorkers],
}))
const stop=async()=>{await runtime.dispose();process.exit(0)}
process.once('SIGTERM',stop)
process.once('SIGINT',stop)
try{await runtime.ready}catch(error){await runtime.dispose();throw error}
