import {randomBytes} from 'node:crypto'
export const localPart=()=> 'oncall-test-'+randomBytes(20).toString('hex');
export const recoveryRules=()=>[
 {id:'failed',action:'trigger',match:'all',conditions:[{field:'subject',op:'matches',value:'FAILED: (\\S+)'}],key:{field:'subject',kind:'regex',pattern:'FAILED: (\\S+)',group:1},severity:'critical',urgency:'high',priority:'P1'},
 {id:'ok',action:'resolve',match:'all',conditions:[{field:'subject',op:'matches',value:'OK: (\\S+)'}],key:{field:'subject',kind:'regex',pattern:'OK: (\\S+)',group:1}}
];
export async function mail(w,local,subject,{id=randomBytes(12).toString('hex'),body='Database monitor result',auth='pass',raw,from='monitor@example.test'}={}) {
 const to=local+'@inbound.example.test';
 const mime=raw??`From: ${from}\r\nTo: ${to}\r\nSubject: ${subject}\r\nMessage-ID: <${id}@monitor.example.test>\r\nAuthentication-Results: mx.cloudflare.net; dmarc=${auth} header.from=example.test; spf=pass\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`;
 const response=await fetch(w.origin+'/cdn-cgi/local/email?'+new URLSearchParams({from,to}),{method:'POST',headers:{'content-type':'message/rfc822'},body:mime});
 return {status:response.status,text:await response.text()};
}

// One saved-response scenario used by the existing intake and browser journeys.
export async function savedEmailBundle(vendor) {
 const {readFile}=await import('node:fs/promises');
 const fixture=JSON.parse(await readFile(vendor==='pagerduty'?'tests/fixtures/pagerduty-account.json':'tests/fixtures/opsgenie-email.json','utf8'));
 if(vendor==='opsgenie')return fixture;
 const services=fixture.services.services??fixture.services.flatMap(row=>row.services??[row.service??row]);
 const service=services.find(s=>s.integrations.some(i=>i.type==='generic_email_inbound_integration'));
 // A service detail retains its own parent identity without unrelated account references.
 return {services:{service:{id:service.id,type:'service',name:service.name,integrations:service.integrations.filter(i=>i.type==='generic_email_inbound_integration')}}};
}
export const convertedEmailCases=vendor=>[
 {subject:'FAILED: synthetic-oncall-db',outcome:'opened',rule:vendor==='pagerduty'?'pagerduty-1':'opsgenie-create-1',key:'synthetic-oncall-db',action:'trigger'},
 {subject:'FAILED: synthetic-oncall-db',outcome:'deduplicated',rule:vendor==='pagerduty'?'pagerduty-1':'opsgenie-create-1',key:'synthetic-oncall-db',action:'trigger'},
 {subject:'OK: synthetic-oncall-db',outcome:'recovered',rule:vendor==='pagerduty'?'pagerduty-2':'opsgenie-close-1',key:'synthetic-oncall-db',action:'resolve'},
 {subject:'OK: synthetic-oncall-db',outcome:'no-effect',rule:vendor==='pagerduty'?'pagerduty-2':'opsgenie-close-1',key:'synthetic-oncall-db',action:'resolve'},
 {subject:'Marked failure',body:'Host [synthetic-oncall-marked]',outcome:'opened',rule:vendor==='pagerduty'?'pagerduty-3':'opsgenie-create-2',key:'synthetic-oncall-marked',action:'trigger'},
 {subject:'Marked recovery',body:'Host [synthetic-oncall-marked]',outcome:'recovered',rule:vendor==='pagerduty'?'pagerduty-4':'opsgenie-close-2',key:'synthetic-oncall-marked',action:'resolve'},
 {subject:'Whole failure',body:'synthetic-oncall-entire',outcome:'opened',rule:vendor==='pagerduty'?'pagerduty-5':'opsgenie-create-3',key:'synthetic-oncall-entire',action:'trigger'},
 {subject:'Whole recovery',body:'synthetic-oncall-entire',outcome:'recovered',rule:vendor==='pagerduty'?'pagerduty-6':'opsgenie-close-3',key:'synthetic-oncall-entire',action:'resolve'},
 ...(vendor==='pagerduty'?[{subject:'Multiline failure',body:'Prefix\nHeader\nHost: synthetic-oncall-lines',outcome:'opened',rule:'pagerduty-7',key:'synthetic-oncall-lines',action:'trigger'},{subject:'Multiline recovery',body:'Prefix\nHeader\nHost: synthetic-oncall-lines',outcome:'recovered',rule:'pagerduty-8',key:'synthetic-oncall-lines',action:'resolve'}]:[]),
 {subject:'FAILED: synthetic-oncall-muted',body:'mute',outcome:vendor==='pagerduty'?'opened':'quarantined',rule:null,key:vendor==='pagerduty'?'FAILED: synthetic-oncall-muted':null,action:vendor==='pagerduty'?'trigger':'quarantine'},
 {subject:'Unmatched observation',outcome:vendor==='pagerduty'?'opened':'quarantined',rule:null,key:vendor==='pagerduty'?'Unmatched observation':null,action:vendor==='pagerduty'?'trigger':'quarantine'},
];

export async function importedEmailSettings({w,request,cookie,actor,ok}) {
 const assert=(await import('node:assert/strict')).default;
 const {ownerDoor,durableSnapshot}=await import('./worker.mjs');
 const door=ownerDoor(w,cookie),objects=async()=>ok(await request('/api/move-in/objects'));
 const viewer=ok(await request('/api/members',{name:'Synthetic email import viewer',role:'viewer',password:'synthetic-oncall-email-viewer-password'}),201);
 const viewerCookie=(await w.request('/api/login',{name:viewer.name,password:'synthetic-oncall-email-viewer-password'})).cookie;
 const receipts=[];
 const refusedBundle=await savedEmailBundle('opsgenie'),actions=refusedBundle.integration_actions[0].data;
 actions.ignore=[{type:'ignore',name:'Synthetic ignore',order:1,filter:{conditionMatchType:'Match All',conditions:[]}}];
 actions.acknowledge=[{type:'acknowledge',name:'Synthetic acknowledge',order:1,alias:'{{subject}}'}];
 actions.addNote=[{type:'addNote',name:'Synthetic add note',order:1,alias:'{{subject}}'}];
 actions.create.push({...structuredClone(actions.create[0]),name:'Synthetic compound alias',order:4,alias:'prefix-{{subject}}'},
  {...structuredClone(actions.create[0]),name:'Synthetic nested filter',order:5,filter:{conditionMatchType:'Match All Conditions',conditions:[{field:'subject',operation:'Starts With',expectedValue:'FAILED',isNot:false}]}},
  {...structuredClone(actions.create[0]),name:'Synthetic non RE2 alias',order:6,alias:'{{subject.extract(/(?=x)(x)/)}}'});
 const refused=ok(await door.preview('opsgenie',JSON.stringify(refusedBundle))),refusedItem=refused.items.find(i=>i.kind==='integrations');
 assert.equal(refusedItem.effects[0].value.emailSettings.blocked,true);
 for(const name of ['Synthetic ignore','Synthetic acknowledge','Synthetic add note','Synthetic compound alias','Synthetic nested filter','Synthetic non RE2 alias'])assert.ok(refusedItem.unmapped.some(note=>note.reason.includes(name)&&note.original.name===name),'mapping report preserves '+name);
 ok(await door.apply('opsgenie',refused));
 const refusedRow=(await objects()).find(r=>r.value.provider==='email');
 const refusedNative=ok(await request('/api/state'));
 ok(await request('/api/email/addresses',{importedId:refusedRow.targetId,importedRevision:refusedRow.revision,id:'synthetic-oncall-refused-email',name:'Refused email',service:'payments',localPart:localPart(),confirmed:true,reviewedDifferences:true}),409);
 assert.deepEqual(ok(await request('/api/state')),refusedNative,'unsupported rules cannot be bypassed by accepting differences');
 ok(await door.undo('opsgenie',refused.planId));
 for(const vendor of ['pagerduty','opsgenie']) {
  const bundle=await savedEmailBundle(vendor),before=ok(await request('/api/state')),beforeObjects=await objects();
  const preview=ok(await door.preview(vendor,JSON.stringify(bundle)));
  const item=preview.items.find(item=>item.effects.some(e=>e.value.provider==='email'));
  assert.ok(item);assert.equal(item.effects[0].value.emailSettings.blocked,false);
  assert.equal(item.effects[0].value.emailSettings.draft.rules.length,vendor==='pagerduty'?8:6);
  assert.deepEqual(ok(await request('/api/state')),before,'preview creates no native records');
  assert.equal(ok(await door.apply(vendor,preview)).job.state,'completed');
  await w.stop();await w.start();
  assert.equal(ok(await door.call(vendor,'reconcile',{planId:preview.planId})).ok,true);
  assert.deepEqual(ok(await request('/api/state')),before,'apply and restart create no address or intake');
  assert.ok((await objects()).some(row=>row.value.provider==='email'));
  assert.equal(ok(await door.undo(vendor,preview.planId)).job.state,'undone');
  assert.deepEqual(await objects(),beforeObjects,'journal undo removes the inactive imported settings');
  // A second saved integration permits an independent activation and erasure proof.
  const importedId=vendor==='pagerduty'?bundle.services.service.integrations[0].id:bundle.integrations.data[0].id;
  if(vendor==='pagerduty')bundle.services.service.integrations[0].id+='-activate';
  else {bundle.integrations.data[0].id+='-activate';bundle.integration_actions[0].data._parent.id+='-activate';}
  const plan=ok(await door.preview(vendor,JSON.stringify(bundle)));ok(await door.apply(vendor,plan));
  const row=(await objects()).find(row=>row.targetId===vendor+':'+importedId+'-activate');assert.ok(row);
  const part=localPart(),id='synthetic-oncall-imported-'+vendor;
  const input={importedId:row.targetId,importedRevision:row.revision,id,name:'Synthetic imported '+vendor,service:'payments',localPart:part,confirmed:true,reviewedDifferences:true,mode:'each',fallback:'subject',rules:[]};
  const noAddress=ok(await request('/api/email')).addresses;
  const preActivation=ok(await request('/api/state'));
  await mail(w,part,'FAILED: synthetic-oncall-before-activation');
  assert.deepEqual(ok(await request('/api/state')).alerts,preActivation.alerts);
  assert.deepEqual(ok(await request('/api/email')).addresses,noAddress);
  ok(await w.request('/api/email/addresses',input),401);
  ok(await w.request('/api/email/addresses',input,viewerCookie),403);
  ok(await request('/api/email/addresses',{...input,importedRevision:'stale'}),409);
  ok(await request('/api/email/addresses',{...input,confirmed:false}),409);
  if(vendor==='opsgenie')ok(await request('/api/email/addresses',{...input,reviewedDifferences:false}),409);
  const beforeFailure=durableSnapshot(w);
  w.sql("CREATE TRIGGER synthetic_email_import_failure BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='email.create' BEGIN SELECT RAISE(ABORT,'synthetic-oncall-email-import'); END");
  try {ok(await request('/api/email/addresses',input),503);}finally{w.sql('DROP TRIGGER synthetic_email_import_failure');}
  assert.deepEqual(durableSnapshot(w),beforeFailure,'failed activation rolls back address, rules, credentials and import binding');
  const alternate={...input,id:id+'-loser',localPart:localPart()};
  const raced=await Promise.all([request('/api/email/addresses',input),request('/api/email/addresses',alternate)]);
  assert.deepEqual(raced.map(r=>r.status).sort(),[201,409]);
  const winner=raced.findIndex(r=>r.status===201),active=raced[winner].value,local=winner?alternate.localPart:part;
  assert.equal(active.privateAddress,local+'@inbound.example.test');
  const email=ok(await request('/api/email')),version=email.versions.find(v=>v.address===active.id);
  assert.equal(version.mode,'custom');assert.equal(version.version,1);assert.equal(version.by,actor.id);
  assert.deepEqual(version.rules,row.value.emailSettings.draft.rules,'activation uses the reviewed saved settings, never client replacements');
  ok(await request('/api/email/addresses',{...input,id:id+'-repeat',localPart:localPart()}),409);
  for(const sample of convertedEmailCases(vendor)) {
   const delivered=await mail(w,local,sample.subject,{body:sample.body});
   assert.equal(delivered.status,sample.outcome==='quarantined'?400:200,vendor+' '+sample.subject+': '+delivered.text);
   const receipt=ok(await request('/api/email')).receipts.at(-1);
   assert.equal(receipt.address,active.id);assert.equal(receipt.outcome,sample.outcome);
   assert.deepEqual([receipt.decision.mode,receipt.decision.version,receipt.decision.rule,receipt.decision.key,receipt.decision.action],['custom',1,sample.rule,sample.key,sample.action]);
   if(sample.outcome==='recovered')assert.equal(receipt.stop,'stopped by source recovery');
   receipts.push({vendor,subject:sample.subject,outcome:receipt.outcome,...receipt.decision});
  }
  const saved=ok(await request('/api/email')).samples.filter(s=>s.address===active.id),zeroBefore=durableSnapshot(w);
  const comparison=ok(await request('/api/email/addresses/'+active.id+'/preview',{revision:1,...row.value.emailSettings.draft,samples:saved.map(s=>s.id)}));
  assert.equal(comparison.sideEffects,false);assert.deepEqual(durableSnapshot(w),zeroBefore,'testing the imported draft makes zero durable, audit or outbox writes');
  for(const decision of comparison.decisions) {
   const sample=saved.find(s=>s.id===decision.sample);
   const delivered=await mail(w,local,sample.subject,{body:sample.text});
   assert.equal(delivered.status,decision.proposed.action==='quarantine'?400:200,delivered.text);
   const receipt=ok(await request('/api/email')).receipts.at(-1);
   assert.deepEqual(receipt.decision,{...decision.proposed,version:1},'the emitted email door agrees with the zero-write draft test');
  }
  ok(await door.undo(vendor,plan.planId),409,'activation is a protected native edit, as with incumbent-key activation');
  const archive=ok(await request('/api/archive')),erasureInput={confirmation:'erase '+active.id,workspaceRevision:archive.revision};
  ok(await w.request('/api/erasure/email/'+active.id,erasureInput,viewerCookie),403);
  w.sql("CREATE TRIGGER synthetic_email_import_erasure BEFORE DELETE ON move_in_objects BEGIN SELECT RAISE(ABORT,'synthetic-oncall-import-erasure'); END");
  try {ok(await request('/api/erasure/email/'+active.id,erasureInput),503);}finally{w.sql('DROP TRIGGER synthetic_email_import_erasure');}
  assert.deepEqual(ok(await request('/api/archive')),archive,'failed import-custody erasure preserves native data');
  const erased=ok(await request('/api/erasure/email/'+active.id,erasureInput));assert.equal(erased.state,'complete');
  assert.ok(!(await objects()).some(r=>r.targetId===row.targetId));
  assert.ok(!ok(await request('/api/email')).versions.some(v=>v.address===active.id));
  assert.ok(!ok(await request('/api/email')).addresses.some(a=>a.id===active.id));
  assert.ok(!JSON.stringify(w.sql('SELECT CAST(bytes AS TEXT) AS original FROM ik_d1_original_chunks')).includes(importedId+'-activate'),'erasure removes saved source originals with the imported settings');
  ok(await request('/api/restore',{mode:'replace',archive}),409);
  await w.stop();await w.start();await mail(w,local,'FAILED: synthetic-oncall-after-erasure');
  assert.equal(ok(await request('/api/email')).receipts.at(-1).diagnostic,'unknown_address');
  ok(await request('/api/email/addresses',input),409);
  assert.ok(!ok(await request('/api/state')).alerts.some(a=>a.source==='email:'+active.id));
 }
 assert.deepEqual(await w.outboundRequests(),[],'saved-file import, activation, test and intake make zero outbound or provider requests');
 const {mkdir,writeFile}=await import('node:fs/promises');
 await mkdir('evidence',{recursive:true});await writeFile('evidence/imported-email-receipts.json',JSON.stringify(receipts,null,2)+'\n');
 console.log('PROBE OC-070 8: saved PagerDuty service and Opsgenie Email and actions -> inactive preview, apply, restart, reconcile and undo; guarded activation version 1; each converted rule opened, deduplicated, recovered, no-effect or quarantine; saved-mail draft zero writes; atomic erasure and replay refusal; zero outbound requests');
}
