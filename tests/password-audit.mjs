import assert from 'node:assert/strict'

// Extends the native coordination journey through its protected password door.
export async function passwordAudit({request,sql,rows,cookie,admin,viewerCookie}) {
 const ok=(response,status=200)=>{assert.equal(response.status,status,JSON.stringify(response.value));return response.value}
 const req=(path,input,as=cookie)=>request(path,input,as)
 const oldPassword='synthetic-oncall-410-password',newPassword='synthetic-oncall-411-password'
 const member=ok(await req('/api/members',{name:'synthetic-oncall-410',role:'responder',password:oldPassword}),201)
 const session=await req('/api/login',{name:member.name,password:oldPassword});ok(session)
 const input={member:member.id,password:newPassword}
 const snapshot=()=>Object.fromEntries(rows("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%' ORDER BY name")
  .map(({name})=>[name,rows('SELECT * FROM "'+name.replaceAll('"','""')+'"').sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))]))
 const before=snapshot()
 sql("CREATE TRIGGER synthetic_oncall_password_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='password.request' BEGIN SELECT RAISE(ABORT,'synthetic-oncall-410'); END")
 try{ok(await req('/api/password',input),503)}finally{sql('DROP TRIGGER synthetic_oncall_password_audit')}
 assert.deepEqual(snapshot(),before,'failed password audit rolls back credentials, sessions, labels, revisions and permanent history together')
 ok(await req('/api/state',undefined,session.cookie))
 ok(await req('/api/login',{name:member.name,password:oldPassword}))
 ok(await req('/api/login',{name:member.name,password:newPassword}),401)

 const credentials=()=>rows('SELECT * FROM credentials ORDER BY member'),sessions=()=>rows('SELECT * FROM sessions ORDER BY token')
 const deniedCredentials=credentials(),deniedSessions=sessions(),deniedState=ok(await req('/api/state'))
 const priorIds=new Set(rows('SELECT id FROM oc_admin_audit').map(row=>row.id))
 ok(await req('/api/password',input,viewerCookie),403)
 ok(await req('/api/password',input,''),401)
 assert.deepEqual(credentials(),deniedCredentials);assert.deepEqual(sessions(),deniedSessions)
 assert.deepEqual(ok(await req('/api/state')),deniedState,'refused password changes preserve all operational data')
 const refused=rows("SELECT * FROM oc_admin_audit WHERE kind='password.request'").filter(row=>!priorIds.has(row.id))
 assert.equal(refused.length,1);assert.equal(refused[0].outcome,'refused')
 assert.equal(refused[0].before_revision,refused[0].after_revision,'refused authority writes a fact without advancing the global revision')

 const acceptedBefore=snapshot()
 ok(await req('/api/password',input))
 const acceptedAfter=snapshot(),ids=new Set(acceptedBefore.oc_admin_audit.map(row=>row.id))
 const facts=acceptedAfter.oc_admin_audit.filter(row=>!ids.has(row.id)&&row.kind==='password.request')
 assert.equal(facts.length,1);const fact=facts[0];assert.equal(fact.outcome,'accepted')
 assert.equal(fact.after_revision,fact.before_revision+1)
 for(const [from,to] of [['workspace_before','workspace_after'],['paging_before','paging_after'],['handoff_before','handoff_after']])assert.equal(fact[from],fact[to],'password authority changes retain operational revision snapshots')
 const label=id=>rows("SELECT label FROM oc_audit_identities WHERE kind='member' AND entity_id='"+id+"'")[0].label
 assert.equal(fact.actor,label(admin.id));assert.equal(fact.subject,label(member.id));assert.notEqual(fact.actor,fact.subject)
 assert.notDeepEqual(credentials(),acceptedBefore.credentials,'accepted password changes persist new credential custody')
 const retained=new Map(acceptedAfter.oc_admin_audit.map(row=>[row.id,row]));for(const row of acceptedBefore.oc_admin_audit)assert.deepEqual(retained.get(row.id),row)
 ok(await req('/api/state',undefined,session.cookie),401)
 ok(await req('/api/audit/export',undefined,session.cookie),401)
 ok(await req('/api/login',{name:member.name,password:oldPassword}),401)
 ok(await req('/api/login',{name:member.name,password:newPassword}))
 const exported=JSON.stringify(ok(await req('/api/audit/export')))
 for(const secret of [member.name,oldPassword,newPassword,...credentials().flatMap(row=>[row.salt,row.digest])])assert.ok(!exported.includes(secret),'permanent export excludes identities and password custody')
 console.log('PROBE OC-041 password: protected reset with audit failure -> complete rollback; accepted reset -> attributed revision-bound fact, new password works and old sessions and password are refused')
}
