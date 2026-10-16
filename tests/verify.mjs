import {spawnSync} from 'node:child_process'
const commands=[['pnpm',['exec','rer','check','--profile','first-party']],['pnpm',['run','build']],['pnpm',['run','typecheck']],['node',['tests/hosted.mjs']],['node',['tests/runtime.mjs']],['node',['tests/activation.mjs']],['node',['tests/move-in-adoption.mjs']],['node',['tests/signin-browser.mjs']],['node',['tests/activation-browser.mjs']],['node',['tests/transfer.mjs']]]
for(const [cmd,args] of commands){const result=spawnSync(cmd,args,{stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});if(result.status!==0)process.exit(result.status??1)}
console.log('Oncall verification passed: commands, build/typecheck, coordination/upgrade, scheduling/import/recovery, sign-in hints, local owner entry and responsive browser journeys')
