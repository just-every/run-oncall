import {spawnSync} from 'node:child_process'

// The production build is shared; each registration walks a whole public flow.
// Human and machine lifecycles remain distinct cases. Related API and browser
// flows share a shard to balance the complete installation transfer journey.
const suites={
 runtime:[{file:'tests/runtime.mjs',part:'core'},'tests/changes.mjs','tests/triage.mjs','tests/activation.mjs'],
 intake:[{file:'tests/runtime.mjs',part:'machines'},'tests/intake.mjs','tests/routing.mjs','tests/import-door.mjs'],
 browser:['tests/member-coordination-browser.mjs','tests/product-browser.mjs'],
 transfer:['tests/transfer.mjs'],
}
const lane=process.env.ONCALL_VERIFY_LANE,category=process.argv[2]
if(lane&&!Object.hasOwn(suites,lane))throw Error(`Unknown verification lane: ${lane}`)
if(category&&!['--flows','--browser'].includes(category))throw Error(`Unknown journey group: ${category}`)
const browserLanes=new Set(['browser','transfer'])
const selected=Object.entries(suites).filter(([name])=>lane?name===lane:category==='--browser'?browserLanes.has(name):category==='--flows'?!browserLanes.has(name):true).flatMap(([,files])=>files)
const commands=[
 ...(process.env.ONCALL_VERIFY_PREBUILT==='1'?[]:[
  {cmd:'pnpm',args:['exec','rer','check','--profile','first-party']},
  {cmd:'pnpm',args:['run','build']},
  {cmd:'pnpm',args:['run','typecheck']},
 ]),
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
