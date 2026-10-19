import assert from 'node:assert/strict'
import {generateKeyPairSync,sign,createHash,randomUUID} from 'node:crypto'
import {appendFile,mkdir} from 'node:fs/promises'

// Real Business HTTP grants; no production authority or credentials in fixtures.
export function transferDoor(m) {
 const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'})
 const kid='transfer-business',issuer='https://business.example.test',installationId=randomUUID()
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url')
 const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
 const grant=(action,extra={})=>{
  const now=Math.floor(Date.now()/1000),payload={v:1,iss:issuer,aud:m.origin,installationId,email:'transfer-owner@example.test',jti:randomUUID(),iat:now,exp:now+300,action,namespace:'pagerduty',maxBytes:512*1024,maxChunks:8,maxRecords:500,...extra}
  const signed=encode({alg:'ES256',typ:'rer-import-grant+jwt',kid})+'.'+encode(payload)
  return signed+'.'+sign('sha256',Buffer.from(signed),{key:privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url')
 }
 const call=(action,input,token=grant(action))=>m.request('/api/rer/import/'+action,input,undefined,{Authorization:'Bearer '+token})
 const ok=r=>{assert.equal(r.status,200,JSON.stringify(r.value));return r.value}
 let plan,approval,pendingJob,oldGrant
 return {
  async configure() {
   const vars={RER_OWNER_CLAIM_PUBLIC_KEYS:JSON.stringify({[kid]:publicKey.export({format:'jwk'})}),RER_OWNER_CLAIM_ISSUER:issuer,RER_OWNER_CLAIM_INSTALLATION_ID:installationId}
   await appendFile('.dev.vars','\n'+Object.entries(vars).map(([k,v])=>k+'='+v).join('\n')+'\n',{mode:0o600})
  },
  async prepare(cookie) {
   ok(await m.request('/auth/settings/imports',{enabled:true},cookie))
   const bytes=Buffer.from(JSON.stringify({users:{users:Array.from({length:45},(_,i)=>({id:'portable-pd-'+i,email:'pending-'+i+'@example.test',name:'Pending responder '+i}))}}))
   const uploaded=ok(await call('uploads',{name:'pending-pagerduty.json',bundleSha256:hash(bytes),totalBytes:bytes.length,totalChunks:1,index:0,chunkSha256:hash(bytes),base64:bytes.toString('base64')}))
   plan=ok(await call('plan',{uploadId:uploaded.uploadId}))
   approval={fingerprint:plan.fingerprint,approvalRecordId:randomUUID(),approvedAt:new Date().toISOString()}
   pendingJob=ok(await call('apply',{planId:plan.planId,reviewedFingerprint:plan.fingerprint},grant('apply',approval))).job
   assert.ok(['queued','applying'].includes(pendingJob.state),'a bounded HTTP apply leaves real pending work and its approval')
   oldGrant=grant('apply',approval)
   return pendingJob
  },
  async assertInactive(cookie,oldCookie,sql) {
   assert.equal(ok(await m.request('/auth/settings/imports',undefined,cookie)).enabled,false,'portable restore disables Business intake')
   const before=sql('SELECT * FROM ik_jobs ORDER BY id')
   assert.deepEqual(before.find(j=>j.id===pendingJob.id).state,pendingJob.state)
   assert.equal((await call('apply',{planId:plan.planId,reviewedFingerprint:plan.fingerprint},oldGrant)).status,404,'the unconsumed old Business grant cannot execute restored work')
   assert.equal((await m.request('/api/operator/import/apply',{planId:plan.planId,reviewedFingerprint:plan.fingerprint},oldCookie,{'X-Import-Source':'pagerduty'})).status,401,'restored sessions grant no authority')
   const fresh=await m.request('/api/operator/import/apply',{planId:plan.planId,reviewedFingerprint:plan.fingerprint},cookie,{'X-Import-Source':'pagerduty'})
   assert.ok([403,409].includes(fresh.status),'a new owner cannot reuse the old owner approval')
   assert.deepEqual(sql('SELECT * FROM ik_jobs ORDER BY id'),before,'refused restored pending work advances no checkpoint or effects')
  },
  async screens(cookie) {
   if(!process.env.ONCALL_TRANSFER_BROWSER)return
   const {chromium}=await import('@playwright/test')
   const browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
   try {
    const context=await browser.newContext(),page=await context.newPage()
    await context.addCookies(cookie.split('; ').map(pair=>{const at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:m.origin}}))
    const directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser';await mkdir(directory,{recursive:true})
    for(const width of [1440,390]) {
     await page.setViewportSize({width,height:1000})
     await page.goto(m.origin+'/auth/settings/identity')
     await page.getByRole('heading',{name:'Sign-in settings',exact:true}).waitFor()
     assert.equal(await page.getByRole('checkbox',{name:'Allow Business imports',exact:true}).isChecked(),false)
     await page.screenshot({path:`${directory}/OC-052-restored-door-${width}.png`,fullPage:true})
     await page.goto(m.origin)
     await page.getByRole('link',{name:'Move-in kit',exact:true}).click()
     await page.getByLabel('Source',{exact:true}).selectOption('pagerduty')
     await page.getByLabel('Saved import journal',{exact:true}).selectOption(pendingJob.id)
     await page.getByRole('status').filter({hasText:'Import journal'}).getByText(new RegExp(pendingJob.state)).first().waitFor()
     assert.equal(await page.getByRole('button',{name:'Resume import',exact:true}).count(),0,'restored Business work offers no session-based resume')
     await page.screenshot({path:`${directory}/OC-052-restored-pending-${width}.png`,fullPage:true})
     await page.getByRole('link',{name:'Archive',exact:true}).click()
     await page.getByRole('heading',{name:'Portable workspace archive',exact:true}).first().waitFor()
     await page.screenshot({path:`${directory}/OC-052-restored-archive-${width}.png`,fullPage:true})
    }
   }finally{await browser.close()}
  },
 }
}
