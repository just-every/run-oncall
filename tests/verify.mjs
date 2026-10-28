import {spawnSync} from 'node:child_process'
import {lanes as suites} from '../scripts/verify-oncall-plan.mjs'
import {preparation,requirePreparedBuild} from '../scripts/verify-oncall-build.mjs'

// Local verification prepares the exact checkout. CI shares that preparation
// once, with an exact-SHA receipt, and keeps every existing lane and assertion.
// rer verify retains its outer hosted and hydration checks on the hosted lane.
const lane=process.env.ONCALL_VERIFY_LANE
if(lane&&!Object.hasOwn(suites,lane))throw Error(`Unknown verification lane: ${lane}`)
const selected=lane?suites[lane]:Object.values(suites).flat()
if(process.env.ONCALL_VERIFY_PREBUILT==='true')await requirePreparedBuild()
const commands=[
 ...(process.env.ONCALL_VERIFY_PREBUILT==='true'?[]:preparation),
 ...selected.map(file=>[process.execPath,[file]]),
]
for(const [cmd,args] of commands){
 const result=spawnSync(cmd,args,{stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}})
 if(result.error)throw result.error
 if(result.status!==0)process.exit(result.status??1)
}
console.log(`Oncall verification passed: ${lane??'all application, browser and installation journeys'}`)
