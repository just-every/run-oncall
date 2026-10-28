import {spawnSync} from 'node:child_process'
// Public journeys share one production build. CI's build job owns prerequisites;
// local rer verify creates that same build before running the complete suite.
const suites={
 runtime:['tests/runtime.mjs','tests/changes.mjs'],
 activation:['tests/activation.mjs'],
 triage:['tests/triage.mjs'],
 intake:['tests/intake.mjs','tests/routing.mjs'],
 adoption:['tests/import-door.mjs'],
 signin:['tests/member-coordination-browser.mjs'],
 'product-browser':['tests/product-browser.mjs'],
 transfer:['tests/transfer.mjs'],
}
const lane=process.env.ONCALL_VERIFY_LANE
if(lane&&!Object.hasOwn(suites,lane))throw Error(`Unknown verification lane: ${lane}`)
const selected=lane?suites[lane]:Object.values(suites).flat()
const commands=[
 ...(process.env.ONCALL_VERIFY_PREBUILT==='1'?[]:[
  ['pnpm',['exec','rer','check','--profile','first-party']],
  ['pnpm',['run','build']],
  ['pnpm',['run','typecheck']],
 ]),
 ...selected.map(file=>[process.execPath,[file]]),
]
for(const [cmd,args] of commands){
 const started=performance.now()
 const result=spawnSync(cmd,args,{stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}})
 if(result.error)throw result.error
 if(result.status!==0)process.exit(result.status??1)
 console.log(`Journey completed: ${args.join(' ')} (${((performance.now()-started)/1000).toFixed(1)}s)`)
}
console.log(`Oncall verification passed: ${lane??'all public application, browser and installation journeys'}`)
