import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtemp,readFile,writeFile,chmod,stat,symlink,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

// Both activation's held-password session and transfer's Base session use this
// real CLI/HTTP flow. Credentials travel only in owned private files.
export async function checkpointCli(w,cookie) {
 const dir=await mkdtemp(join(tmpdir(),'oncall-checkpoint-')),session=join(dir,'session'),file=join(dir,'checkpoint.json')
 const cli=(args,sessionPath=session)=>new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['scripts/checkpoint.mjs','--origin',w.origin,'--session-file',sessionPath,...args],{stdio:['ignore','pipe','pipe']})
  let stdout='',stderr='';child.stdout.on('data',v=>stdout+=v);child.stderr.on('data',v=>stderr+=v)
  child.on('error',reject);child.on('exit',status=>resolve({status,stdout,stderr}))
 })
 const ok=(r)=>{assert.equal(r.status,200);return r.value}
 const state=c=>w.request('/api/state',undefined,c),paging=c=>w.request('/api/paging/state',undefined,c)
 try{
  await writeFile(session,cookie,{mode:0o600})
  const run=await cli(['export',file]);assert.equal(run.status,0,run.stderr)
  assert.equal((await stat(file)).mode&0o777,0o600)
  const checkpoint=JSON.parse(await readFile(file,'utf8'))
  assert.deepEqual(checkpoint.coordination,ok(await state(cookie)))
  assert.deepEqual(checkpoint.paging.schedules,ok(await paging(cookie)).schedules)
  assert.equal((await cli(['export',file])).status,1,'export never overwrites an existing checkpoint')
  assert.equal((await cli(['restore',file])).status,1,'replacement must be explicit')
  await chmod(session,0o644);assert.equal((await cli(['restore',file,'--replace'])).status,1)
  await chmod(session,0o600);const link=join(dir,'session-link');await symlink(session,link)
  assert.equal((await cli(['restore',file,'--replace'],link)).status,1,'symlink credentials are refused')
  const malformed=join(dir,'malformed.json');await writeFile(malformed,JSON.stringify({...checkpoint,unknown:true}),{mode:0o600})
  assert.equal((await cli(['restore',malformed,'--replace'])).status,1)
  assert.equal(await readFile(session,'utf8'),cookie,'refused replacement leaves the session intact')
  assert.deepEqual(ok(await state(cookie)),checkpoint.coordination,'refusal preserves application state')
  const restore=await cli(['restore',file,'--replace']);assert.equal(restore.status,0,restore.stderr)
  const rotated=(await readFile(session,'utf8')).trim()
  assert.notEqual(rotated,cookie);assert.equal((await stat(session)).mode&0o777,0o600)
  assert.deepEqual({...ok(await state(rotated)),revision:checkpoint.coordination.revision},checkpoint.coordination)
  assert.deepEqual(ok(await paging(rotated)).schedules,checkpoint.paging.schedules)
  if(cookie.includes('oncall_session='))assert.equal((await state(cookie)).status,401,'old Oncall cookie loses authority')
  for(const token of [...cookie.split('; '),...rotated.split('; ')].map(c=>c.split('=')[1]))
   assert.ok(![run,restore].some(r=>(r.stdout+r.stderr).includes(token)),'CLI output never discloses session values')
  const legacy=join(dir,'legacy.json');assert.equal((await cli(['export',legacy,'--version','1'])).status,0)
  assert.equal(JSON.parse(await readFile(legacy,'utf8')).handoffs,undefined)
  assert.equal((await cli(['restore',legacy,'--replace'])).status,0)
  const final=(await readFile(session,'utf8')).trim()
  assert.equal((await state(rotated)).status,401,'subsequent successful restore revokes the previous rotated session')
  ok(await state(final))
  return final
 }finally{await rm(dir,{recursive:true,force:true})}
}
