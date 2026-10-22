import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
export const receiptCount=w=>w.sql('SELECT COUNT(*) AS n FROM oc_intake_receipts')[0].n;
// Copy an actually admitted integration tuple, preserving every frozen field and reference.
export function seedReceipts(w,target) {
 const count=receiptCount(w),size=target-count;if(size<=0)return;
 const receipt=JSON.parse(w.sql("SELECT data FROM oc_intake_receipts WHERE json_extract(data,'$.provider')='pagerduty-v2' AND json_extract(data,'$.outcome')='opened' ORDER BY ordinal LIMIT 1")[0].data);
 const event=JSON.parse(w.sql('SELECT data FROM oc_events WHERE id='+quote(receipt.event))[0].data),alert=JSON.parse(w.sql('SELECT data FROM oc_alerts WHERE id='+quote(receipt.alert))[0].data);
 const base="WITH RECURSIVE n(i) AS (SELECT "+count+" UNION ALL SELECT i+1 FROM n WHERE i<"+(target-1)+") ";
 const id="'synthetic-oncall-'||i",alertId="'synthetic-oncall-'||i||'-alert'";
 const put=(table,data)=>base+`INSERT INTO ${table}(id,ordinal,data) SELECT json_extract(v,'$.id'),(SELECT COALESCE(MAX(ordinal),-1)+1 FROM ${table})+i-${count},v FROM (SELECT i,${data} AS v FROM n);`;
 const e=`json_set(${quote(JSON.stringify(event))},'$.id',${id},'$.eventId',${id},'$.key',${id},'$.generation',${id},'$.title',${id}||': Checkout latency')`;
 const a=`json_set(${quote(JSON.stringify(alert))},'$.id',${alertId},'$.key',${id},'$.generation',${id},'$.events',json_array(${id}),'$.urgencyHistory[0].id','urgency:'||${id})`;
 const r=`json_set(${quote(JSON.stringify(receipt))},'$.id',${id},'$.event',${id},'$.alert',${alertId},'$.key',${id},'$.generation',${id},'$.title',${id}||': Checkout latency','$.routing.serviceDecision.event',${id})`;
 let sql=put('oc_events',e)+put('oc_alerts',a)+put('oc_intake_receipts',r);
 const audits=w.sql('SELECT data FROM oc_audit WHERE instr(data,'+quote(receipt.event)+')>0 OR instr(data,'+quote(receipt.alert)+')>0');
 for(const {data} of audits){const row=JSON.parse(data),entry=`json_set(replace(replace(${quote(data)},${quote(receipt.event)},${id}),${quote(receipt.alert)},${alertId}),'$.id',${row.kind==='alert-urgency'?"'urgency:'||"+id:id+"||'-"+row.kind+"'"})`;sql+=put('oc_audit',entry);}
 const columns=w.sql('PRAGMA table_info(oc_admin_audit)').map(r=>r.name).filter(c=>c!=='ordinal');
 const permanent=columns.map(c=>c==='id'?id+"||'-permanent'":c==='before_revision'?'(SELECT revision FROM oc_audit_clock WHERE id=1)+i-'+count:c==='after_revision'?'(SELECT revision FROM oc_audit_clock WHERE id=1)+i-'+count+'+1':'t.'+c).join(',');
 sql+=base+`INSERT INTO oc_admin_audit(${columns.join(',')}) SELECT ${permanent} FROM n CROSS JOIN (SELECT * FROM oc_admin_audit ORDER BY ordinal DESC LIMIT 1) t;`;
 sql+=`UPDATE oc_audit_clock SET revision=revision+${size} WHERE id=1;UPDATE workspace_control SET revision=revision+1 WHERE id=1;`;
 w.sql(sql);assert.equal(receiptCount(w),target);
}
export function ownedWorkerMemory(w) {
 const rows=execFileSync('ps',['-A','-ww','-o','pid=,ppid=,rss=,comm='],{encoding:'utf8'}).split('\n').flatMap(line=>{const m=/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/.exec(line);return m?[{pid:+m[1],ppid:+m[2],bytes:+m[3]*1024,command:m[4]}]:[]});
 const owned=new Set([w.pid]);for(let changed=true;changed;){changed=false;for(const row of rows)if(owned.has(row.ppid)&&!owned.has(row.pid)){owned.add(row.pid);changed=true;}}
 const workers=rows.filter(row=>owned.has(row.pid)&&row.command.split('/').at(-1)==='workerd');
 assert.ok(workers.length>0,'memory measurement requires owned workerd processes');return workers.map(({pid,bytes})=>({pid,rssMiB:bytes/1024/1024}));
}
const rss=w=>Math.max(...ownedWorkerMemory(w).map(worker=>worker.rssMiB*1024*1024));
export async function capacitySamples(w,doors,label,{warm=true}={}) {
 if(warm)for(const door of doors)await door.run();
 const before=receiptCount(w),samples={};
 for(let n=0;n<7;n++)for(const door of doors){let peak=rss(w);const timer=setInterval(()=>{peak=Math.max(peak,rss(w));},25),at=performance.now();let result;
  try{result=await door.run();}finally{clearInterval(timer);peak=Math.max(peak,rss(w));}
  assert.equal(result.status,door.status,door.name+' '+JSON.stringify(result.value));
  (samples[door.name]??=[]).push({ms:performance.now()-at,rssMiB:peak/1024/1024});
 }
 const report={label,before,after:receiptCount(w),samples};console.log('OC-073 SAMPLES '+JSON.stringify(report));return report;
}
export function assertCapacitySamples(small,large,exact) {
 const rows=[];for(const run of [large,exact])for(const [door,samples] of Object.entries(small.samples))for(const field of ['ms','rssMiB']){const measured=run===exact&&door==='compatible-admission'?'compatible-capacity-refusal':door,baseline=samples.map(s=>s[field]),held=run.samples[measured].map(s=>s[field]),min=Math.min(...baseline),max=Math.max(...baseline),spread=max-min;rows.push({population:run.label,door:measured,field,smallMin:min,smallMax:max,spread,largeMax:Math.max(...held),limit:max+spread});}
 console.log('OC-073 COMPARISON '+JSON.stringify({small:[small.before,small.after],large:[large.before,large.after],exact,rows}));
 const failures=rows.filter(r=>r.largeMax>r.limit).map(r=>`${r.population} ${r.door} ${r.field}: ${r.largeMax} > calibrated ${r.limit}`);
 for(const run of [small,large,exact])for(const [door,samples] of Object.entries(run.samples))if(samples.some(s=>s.rssMiB>128))failures.push(`${run.label} ${door} workerd RSS exceeded Workers 128 MiB`);
 assert.deepEqual(failures,[],'OC-073 time/memory must stay within the small-population spread and Workers memory bound');
}
