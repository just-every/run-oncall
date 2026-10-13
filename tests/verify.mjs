import {spawnSync} from 'node:child_process'
const commands=[['node',['scripts/rer.mjs','check','--profile','first-party']],['pnpm',['run','build']],['pnpm',['run','typecheck']],['node',['tests/hosted.mjs']],['node',['tests/runtime.mjs']],['node',['tests/activation.mjs']],['node',['tests/email-link.mjs']],['node',['tests/activation-browser.mjs']],['node',['tests/transfer.mjs']]]
for(const [cmd,args] of commands){const result=spawnSync(cmd,args,{stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});if(result.status!==0)process.exit(result.status??1)}
console.log('Oncall verification passed: commands, build/typecheck, coordination/upgrade, scheduling/import/recovery, ordinary sign-in and responsive browser journeys')
