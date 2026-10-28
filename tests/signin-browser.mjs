import assert from 'node:assert/strict'
import {mkdir,readFile} from 'node:fs/promises'
import {chromium} from '@playwright/test'
import {localWorker} from './worker.mjs'

// The emitted Worker owns production email sign-in. Base's local dev wrapper
// deliberately replaces /signin with one-click owner entry in v2.
let worker=await localWorker()
const owner=worker.vars.OWNER_EMAIL
const {surfaces:{app:{signIn}}}=JSON.parse(await readFile('management/integration/deployment-spec.json','utf8'))
const openApp=email=>{
 const url=new URL(signIn.path,worker.origin)
 if(signIn.loginHint)url.searchParams.set('login_hint',email)
 return url.href
}
let browser
const captureDirectory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser'
await mkdir(captureDirectory,{recursive:true})
try {
 const claimed=await worker.request('/auth/bootstrap',{token:worker.vars.SETUP_TOKEN,displayName:'Oncall lead'},undefined,{'CF-Connecting-IP':'127.0.0.1'})
 assert.equal(claimed.status,303,JSON.stringify(claimed.value))
 browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
 const context=await browser.newContext({viewport:{width:1440,height:1000},extraHTTPHeaders:{'CF-Connecting-IP':'127.0.0.1'}}),page=await context.newPage()
 await context.addCookies(claimed.headers.getSetCookie().map(line=>{
  const pair=line.split(';')[0],at=pair.indexOf('=')
  return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin,httpOnly:true,sameSite:'Lax'}
 }))
 const errors=[];page.on('pageerror',error=>errors.push(error.message))
 const initialState=await context.request.get(worker.origin+'/api/state')
 assert.equal(initialState.status(),200)
 const initialMember=(await initialState.json()).members.find(member=>member.role==='admin')
 assert.equal(initialMember.name,'Oncall lead','claim name becomes the owner member name')
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:1000})
  for(const [suffix,location] of [['','/app'],['?returnTo=%2Fapp%2Fincidents','/app/incidents'],['?returnTo=https%3A%2F%2Fexample.test','/app'],['?returnTo=%2F%252Fexample.test','/app']]) {
   const forward=await context.request.get(worker.origin+'/signin'+suffix,{maxRedirects:0})
   assert.equal(forward.status(),303,'signed-in owner forwards from /signin')
   assert.equal(forward.headers().location,location)
  }
  const auditBefore=new Set((await (await context.request.get(worker.origin+'/api/audit/export')).json()).rows.map(row=>row.id))
  const oldName=worker.sql("SELECT data FROM oc_members WHERE id='"+initialMember.id+"'")[0].data
  const corrected='synthetic-oncall-'+width
  const changed=await context.request.post(worker.origin+'/setup',{form:{displayName:corrected,confirm:'yes'},headers:{origin:worker.origin},maxRedirects:0})
  assert.equal(changed.status(),303)
  worker.sql("CREATE TRIGGER synthetic_owner_name_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='member.owner-name' BEGIN SELECT RAISE(ABORT,'synthetic-oncall-owner-name-audit'); END")
  try {assert.equal((await context.request.get(worker.origin+'/api/state')).status(),503);assert.equal(worker.sql("SELECT data FROM oc_members WHERE id='"+initialMember.id+"'")[0].data,oldName,'audit failure rolls back the name and workspace mutation')} finally {worker.sql('DROP TRIGGER synthetic_owner_name_audit')}
  const state=await context.request.get(worker.origin+'/api/state')
  assert.equal((await state.json()).members.find(member=>member.id===initialMember.id).name,corrected,'later setup correction follows into the mapped member')
  const auditAfter=(await (await context.request.get(worker.origin+'/api/audit/export')).json()).rows.filter(row=>!auditBefore.has(row.id)&&row.kind==='member.owner-name'&&row.outcome==='accepted')
  assert.equal(auditAfter.length,1,'one attributed owner-name synchronization commits with its audit')
  assert.equal(auditAfter[0].workspaceAfter,auditAfter[0].workspaceBefore+1)
  await page.goto(worker.origin+'/app')
  await page.locator('.oncall-frame').waitFor()
  const phone=await page.getByRole('button',{name:'Menu',exact:true}).isVisible()
  if(phone)await page.getByRole('button',{name:'Menu',exact:true}).click()
  await page.locator(phone?'.shell-sheet .profile':'.shell-rail .profile').getByText(corrected,{exact:true}).waitFor()
  await page.screenshot({path:`${captureDirectory}/signin-owner-name-${width}.png`,fullPage:true})
 }
 await page.goto(worker.origin+'/setup')
 await page.waitForURL(worker.origin+'/on-call')
 await page.locator('.oncall-frame').waitFor({timeout:60000})
 await page.getByRole('button',{name:'Menu',exact:true}).press('Enter');await page.locator('.shell-sheet .owner-button').press('Enter');await page.getByRole('menuitem',{name:'Sign out',exact:true}).click()
 await page.waitForURL(worker.origin+signIn.path)
 assert.equal((await context.request.get(worker.origin+'/api/state')).status(),401)
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:1000})
  await page.goto(openApp(owner))
  await page.getByRole('alert').waitFor()
  assert.equal(await page.getByLabel('Email',{exact:true}).count(),0,'unconfigured mail offers no unusable email form')
  await page.screenshot({path:`${captureDirectory}/signin-mail-unavailable-${width}.png`,fullPage:true})
 }
 const refused=await worker.request('/auth/magic-link',{email:owner},undefined,{'CF-Connecting-IP':'127.0.0.1'})
 assert.equal(refused.status,503)
 assert.equal(refused.value.error,'mail_unavailable')
 assert.equal((await context.request.get(worker.origin+'/api/state')).status(),401,'unavailable mail never authenticates anyone')
 await context.close()
 await worker.close()
 // Only public page reads: synthetic provider configuration makes the email
 // form available; no delivery request is submitted or sent to the network.
 worker=await localWorker({MAIL_PROVIDER:'sendgrid',MAIL_API_KEY:'synthetic-example-mail-credential',MAIL_FROM:'auth@example.test'})
 const configured=await browser.newContext({viewport:{width:1440,height:1000}}),hintPage=await configured.newPage()
 hintPage.on('pageerror',error=>errors.push(error.message))
 let submitted=0
 hintPage.on('request',request=>{if(request.method()==='POST'&&new URL(request.url()).pathname==='/auth/magic-link')submitted++})
 for(const width of [1440,390]) {
  await hintPage.setViewportSize({width,height:1000})
  await hintPage.goto(openApp(owner))
  const email=hintPage.getByLabel('Email',{exact:true})
  assert.equal(await email.inputValue(),owner)
  await email.fill('relief.lead@example.test')
  assert.equal(await email.inputValue(),'relief.lead@example.test','a hint stays editable')
  await hintPage.goto(openApp(owner))
  assert.equal(await email.inputValue(),owner)
  assert.equal(submitted,0,'a hint never submits the form')
  await hintPage.screenshot({path:`${captureDirectory}/signin-login-hint-${width}.png`,fullPage:true})
 }
 for(const hint of ['','invalid<address>']) {
  await hintPage.goto(openApp(hint))
  assert.equal(await hintPage.getByLabel('Email',{exact:true}).inputValue(),'')
 }
 await configured.close()
 assert.deepEqual(errors,[])
 console.log('Production sign-in browser flow passed at 1440 and 390: configured editable hints without a send, unconfigured mail refusal, sign-out and denied access without a session')
} finally {
 await browser?.close()
 await worker.close()
}
