import {spawnSync} from 'node:child_process'

// Every lane builds the exact checkout. rer verify keeps its outer hosted and
// hydration checks; CI runs that public command on the hosted lane.
const suites={
 hosted:['tests/hosted.mjs'],
 runtime:['tests/runtime.mjs'],
 triage:['tests/triage.mjs'],
 changes:['tests/changes.mjs'],
 intake:['tests/intake.mjs','tests/routing.mjs','tests/monitoring.mjs','tests/urgency.mjs'],
 reviews:['tests/reviews.mjs'],
 activation:['tests/activation.mjs'],
 'adoption-demo':['tests/demo.mjs','tests/move-in-adoption.mjs','tests/import-door.mjs'],
 signin:['tests/signin-browser.mjs','tests/member-coordination-browser.mjs'],
 'product-browser':['tests/product-browser.mjs'],
 'managed-browser':['tests/activation-browser.mjs'],
 transfer:['tests/transfer.mjs'],
}
const lane=process.env.ONCALL_VERIFY_LANE
if(lane&&!Object.hasOwn(suites,lane))throw Error(`Unknown verification lane: ${lane}`)
const selected=lane?suites[lane]:Object.values(suites).flat()
const commands=[
 ['pnpm',['exec','rer','check','--profile','first-party']],
 ['pnpm',['run','build']],
 ['pnpm',['run','typecheck']],
 ...selected.map(file=>[process.execPath,[file]]),
]
for(const [cmd,args] of commands){
 const result=spawnSync(cmd,args,{stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}})
 if(result.error)throw result.error
 if(result.status!==0)process.exit(result.status??1)
}
console.log(`Oncall verification passed: ${lane??'all application, browser and installation journeys'}`)
