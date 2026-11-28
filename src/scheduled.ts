import {sweepOnCall} from './family/response-operations/on-call-notifications/sweep';
import {sweepPages} from './sms-paging/sweep';
import { sweepMoveInConsent } from './move-in/pagerduty-oauth';
import {sweepDeadlines} from './incident-deadlines/sweep';
import { dispatchOutbox } from './automation/dispatch'
import { storeReadSnapshot } from './read-snapshot'
import { auditedDatabase } from './audit-database'
import { expireReplayCalls } from './modules/agent-door/erasure.ts'
import type { Bindings } from './auth.server';

export async function scheduled(env: Bindings) {
  await expireReplayCalls({ options: { db: env.DB }, now: Date.now });
  const moveIn=auditedDatabase(env.DB,{feature:'move-in',kind:'move-in.consent.cleanup',actor:{kind:'service',id:'move-in-consent'},source:{kind:'provider',id:'pagerduty'},commits:0,storageFailed:false});
  if((await sweepMoveInConsent({...env,DB:moveIn.db})).failed)await moveIn.record('failed');
  const deadlines=auditedDatabase(env.DB,{feature:'incident-deadlines',kind:'deadline.sweep',actor:{kind:'service',id:'incident-deadlines'},source:{kind:'door',id:'scheduled'},commits:0,storageFailed:false});
  const deadlineEnv={...env,DB:deadlines.db};
  await sweepDeadlines(deadlines.db,async (args,who)=>{
    const { oncallAgentDoor } = await import('./agent-door/index.server');
    return oncallAgentDoor(deadlineEnv).invoke('oncall.incidents.update',{...args,change:'expire-deadline',idempotency_key:`deadline-${args.deadline}`},who);
  });
  const notifications=auditedDatabase(env.DB,{feature:'on-call',kind:'on-call.record',actor:{kind:'service',id:'on-call'},source:{kind:'door',id:'scheduled'},commits:0,storageFailed:false});
  await sweepOnCall(notifications.db);
  const paging=auditedDatabase(env.DB,{feature:'paging',kind:'paging.send',actor:{kind:'service',id:'paging'},source:{kind:'door',id:'scheduled'},commits:0,storageFailed:false});
  await sweepPages(paging.db,env,env.AUTH_ORIGIN);
  for(let n=0;n<10;n++) {
    const audit=auditedDatabase(env.DB,{feature:'automation',kind:'automation.dispatch',actor:{kind:'service',id:'outbox-dispatcher'},source:{kind:'door',id:'outbox-dispatcher'},commits:0,storageFailed:false});
    if(!(await dispatchOutbox({...env,DB:audit.db})).processed)break;
  }
  // Keeps a cold isolate's first read near the change log instead of every stored row.
  await storeReadSnapshot(env.DB);
}
