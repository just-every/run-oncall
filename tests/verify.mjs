import {spawnSync} from 'node:child_process'
import {lanes as suites} from '../scripts/verify-oncall-plan.mjs'
import {preparation,requirePreparedBuild} from '../scripts/verify-oncall-build.mjs'

// The production build is shared; each registration walks a whole public flow.
// Human and machine lifecycles remain distinct cases. Related API and browser
// flows share a shard to balance the complete installation transfer journey.
const lane=process.env.ONCALL_VERIFY_LANE,category=process.argv[2]
if(lane&&!Object.hasOwn(suites,lane))throw Error(`Unknown verification lane: ${lane}`)
if(category&&!['--flows','--browser'].includes(category))throw Error(`Unknown journey group: ${category}`)
const browserLanes=new Set(['browser','transfer'])
const prebuilt=['1','true'].includes(process.env.ONCALL_VERIFY_PREBUILT)
if(prebuilt)await requirePreparedBuild()
const selected=Object.entries(suites).filter(([name])=>lane?name===lane:category==='--browser'?browserLanes.has(name):category==='--flows'?!browserLanes.has(name):true).flatMap(([,files])=>files)
const commands=[
 ...(prebuilt?[]:preparation.map(([cmd,args])=>({cmd,args}))),
 ...selected.map(entry=>{
  const {file,part}=typeof entry==='string'?{file:entry}:entry
  return {cmd:process.execPath,args:[file],env:part?{ONCALL_RUNTIME_PART:part}:{}}
 }),
]
for(const {cmd,args,env} of commands){
 const started=performance.now()
 const result=spawnSync(cmd,args,{stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false',...env}})
 if(result.error)throw result.error
 if(result.status!==0)process.exit(result.status??1)
 console.log(`Journey completed: ${args.join(' ')}${env?.ONCALL_RUNTIME_PART?' '+env.ONCALL_RUNTIME_PART:''} (${((performance.now()-started)/1000).toFixed(1)}s)`)
}
console.log(`Oncall verification passed: ${lane??'all public application, browser and installation journeys'}`)
