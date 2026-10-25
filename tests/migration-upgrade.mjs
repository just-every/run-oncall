import assert from 'node:assert/strict';
import {mkdtemp,readdir,readFile,writeFile,mkdir,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
// Exercise the maintained migration CLI on a populated pre-stack installation.
async function upgradeFrom(baseline){
 const root=await mkdtemp(join(tmpdir(),'oncall-upgrade-')),old=join(root,'migrations'),config=join(root,'wrangler.json'),persist=join(root,'state');
 const names=(await readdir('migrations/core')).filter(n=>n.endsWith('.sql')).sort();
 assert.equal(new Set(names.map(n=>Number(n.slice(0,4)))).size,names.length,'migration numbers are unique');
 assert.ok(names.includes('0140_incumbent_intake_credentials.sql')&&names.includes('0141_business_status.sql')&&names.includes('0142_manual_command_receipts.sql'));
 const env={...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'};
 const cli=(...args)=>execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args,'--config',config,'--local','--persist-to',persist],{env,encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:16*1024*1024});
 const sql=command=>JSON.parse(cli('d1','execute','DB','--command',command,'--json'))[0].results;
 const quote=value=>"'"+JSON.stringify(value).replaceAll("'","''")+"'";
 try{
  await mkdir(old);
  for(const name of names.filter(n=>Number(n.slice(0,4))<=baseline))await copyFile(join('migrations/core',name),join(old,name));
  const bindings={name:'synthetic-oncall-upgrade',compatibility_date:'2026-09-08',d1_databases:[{binding:'DB',database_name:'synthetic-oncall-upgrade',database_id:'00000000-0000-0000-0000-000000000001',migrations_dir:old}]};
  await writeFile(config,JSON.stringify(bindings));cli('d1','migrations','apply','DB');
  const member={id:'synthetic-oncall-1',name:'Held upgrade owner',role:'admin',active:true};
  const service={id:'synthetic-oncall-1',name:'Held upgrade service',environment:'production',owner:member.id,runbook:['Retain this authored step'],pager:''};
  sql(`INSERT INTO oc_members VALUES('synthetic-oncall-1',0,${quote(member)}); INSERT INTO oc_services VALUES('synthetic-oncall-1',0,${quote(service)}); INSERT INTO workspace_control VALUES(1,7,'synthetic-oncall-1');`);
  const before=sql('SELECT id,ordinal,data FROM oc_members UNION ALL SELECT id,ordinal,data FROM oc_services');
  bindings.d1_databases[0].migrations_dir=resolve('migrations/core');await writeFile(config,JSON.stringify(bindings));cli('d1','migrations','apply','DB');
  assert.deepEqual(sql('SELECT id,ordinal,data FROM oc_members UNION ALL SELECT id,ordinal,data FROM oc_services'),before,'all held identities, fields and authored runbooks survive the real upgrade');
  assert.equal(sql('SELECT revision FROM workspace_control')[0].revision,7);
  const applied=sql('SELECT name FROM d1_migrations ORDER BY id').map(r=>r.name);assert.deepEqual(applied,names,'migration ledger follows the unique candidate history in order');
  assert.equal(sql('SELECT COUNT(*) AS n FROM oc_business_services')[0].n,0);assert.equal(sql('SELECT COUNT(*) AS n FROM rer_command_receipts')[0].n,0);assert.equal(sql('SELECT COUNT(*) AS n FROM oc_erased_report_cases')[0].n,0);
  console.log(`PASS populated migration CLI upgrade: main ${String(baseline).padStart(4,'0')} to candidate, held member/service/runbook bytes and workspace revision preserved; complete unique migration ledger in order`);
 }finally{await rm(root,{recursive:true,force:true});}
}
export async function migrationUpgrade(){for(const baseline of [140,143])await upgradeFrom(baseline);}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1])await migrationUpgrade();
