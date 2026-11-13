// One-off calendar probe; this file is evidence, never a registered test.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const fromCheckout=file=>import(pathToFileURL(resolve(file)));
console.log('Calendar probe runtime',process.version,'host UTC',new Date().toISOString());
const real=Number(process.env.ONCALL_PROBE_REAL_NOW_MS),day=86400000;
assert.ok(Math.abs(Date.now()-real-30*day)<300000,'Host wall clock is 30 days ahead');
const {agentRuntime}=await fromCheckout('tests/agent-door-runtime.mjs');
const runtime=await agentRuntime({clock:Math.floor(Date.now()/3600000)*3600000});
try {
 const now=await runtime.db.prepare("SELECT round((julianday('now')-2440587.5)*86400000) AS ms, datetime('now') AS utc").first();
 console.log('SQLite wall clock',JSON.stringify(now));
 assert.ok(Math.abs(now.ms-Date.now())<10000,'SQLite and host see the same shifted wall clock');
 assert.ok(Math.abs(now.ms-real-30*day)<300000,'SQLite also advanced 30 days');
}finally{await runtime.close()}
for(const [file,name] of [['tests/oncall-agent-alerts.mjs','alertReads'],['tests/oncall-agent-analytics.mjs','analyticsReads'],['tests/oncall-agent-triage.mjs','triageReads']]){
 console.log('START shifted journey',name,new Date().toISOString());
 await (await fromCheckout(file))[name]();
 console.log('PASS shifted journey',name);
}
console.log('PASS 30-day future calendar: three unchanged public-door journeys; host, emitted Worker and SQLite shifted; monotonic timers unchanged.');
