import assert from 'node:assert/strict'
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {randomBytes,randomUUID} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {chromium} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {createInstallerModel} from '@runeditrun/rer/setup-manifest'
import {inspectOperations} from '@runeditrun/rer/operations'
import {signinCommand} from '@runeditrun/rer/internal/cli/signin.mjs'
import {requireProductionAuth} from '@runeditrun/rer/internal/cli/production-auth.mjs'
import {validateSetupValue} from '../scripts/delivery/base/schema/setup-validation.mjs'
import {commandAdapter} from '../scripts/installer/local.mjs'
import {operatorMail} from '../src/mail.server.mjs'
import {automationRuntime} from './worker.mjs'

// Extends the existing member/owner journey: deliberately disabled mail is one
// installation mode, with the same native HTTP, owner CLI and coordination doors.
export async function mailOffJourney() {
 const root=process.cwd(),manifest=JSON.parse(await readFile('rer-setup.json','utf8'))
 const provider=manifest.fields.find(f=>f.name==='MAIL_PROVIDER')
 validateSetupValue(provider,'none')
 const model=createInstallerModel(manifest,{}, {ownerBootstrap:true})
 const input=model.validateInput({APP_NAME:'Oncall',PRIMARY_COLOR:'#1d2a35',OWNER_EMAIL:'synthetic-oncall-owner@example.test',MAIL_PROVIDER:'none',displayName:'Synthetic owner'})
 assert.equal(input.MAIL_PROVIDER,'none')
 const off={MAIL_PROVIDER:'none'}
 const diagnostic=await inspectOperations(root,off)
 assert.equal(diagnostic.ok,true,'native operations accepts explicit mail off without mail inputs')
 for(const env of [{MAIL_PROVIDER:'sendgrid'}, {...off,MAIL_API_KEY:'synthetic-oncall-1'}]) {
  assert.equal((await inspectOperations(root,env)).configuration,'invalid','native operations refuses incomplete or contradictory mail')
 }
 const declaration=JSON.parse(await readFile('deploy.json','utf8'))
 const bindings=env=>({...declaration.vars,...Object.fromEntries(declaration.secrets.filter(s=>env[s.environment]).map(s=>[s.binding,env[s.environment]]))})
 for(const env of [off,{MAIL_PROVIDER:'sendgrid',MAIL_FROM:'synthetic-oncall@example.test',SENDGRID_API_KEY:'synthetic-oncall-1'}]) {
  commandAdapter.deployPolicy({options:{dryRun:true},env,bindings:bindings(env)})
  await requireProductionAuth({root,declaration,env,setupManifest:manifest,adapter:commandAdapter,options:{verb:'deploy',dryRun:true}})
 }
 for(const env of [{},{MAIL_PROVIDER:'later'},{MAIL_PROVIDER:'sendgrid'}, {...off,MAIL_API_KEY:'synthetic-oncall-1'}, {...off,SENDGRID_API_KEY:'synthetic-oncall-1'}, {...off,MAIL_RELAY_URL:'https://relay.example.test'}, {...off,MAIL_DKIM_PRIVATE_KEY:'synthetic-oncall-1'}]) {
  assert.throws(()=>commandAdapter.deployPolicy({options:{dryRun:false},env,bindings:bindings(env)}), 'incomplete enabled mail and none plus credentials refuse before build')
 }
 assert.equal(operatorMail(off),undefined)
 assert.equal(operatorMail({...off,MAIL_API_KEY:'synthetic-oncall-1',MAIL_FROM:'synthetic-oncall@example.test'}),undefined,'explicit none never constructs a sending runtime')
 // The public deploy command builds and validates an offline plan with explicit
 // none; its command environment deliberately contains no provider credentials.
 const cleanEnv=Object.fromEntries(Object.entries(process.env).filter(([key])=>!/(?:CLOUDFLARE|^CF_|MAIL|SMTP|SENDGRID|RESEND|POSTMARK|^GH_TOKEN$|^GITHUB_TOKEN$|^RER_CLOUD_)/i.test(key)))
 Object.assign(cleanEnv,{MAIL_PROVIDER:'none',CI:'true',WRANGLER_SEND_METRICS:'false'})
 const planned=spawnSync(process.execPath,['node_modules/@runeditrun/rer/global/rer.mjs','deploy','--dry-run','--non-interactive'],{env:cleanEnv,encoding:'utf8',timeout:180000})
 assert.equal(planned.status,0,'public mail-off deploy dry run succeeds: '+planned.stderr)
 assert.match(planned.stdout,/Outbound email is off/)
 assert.match(planned.stdout,/rer signin/)
 assert.match(planned.stdout,/nothing was changed remotely/)
 console.log('PASS mail-off configuration: native setup selection, operations, deploy policy, production preflight, public offline deploy plan and runtime none; incomplete enabled providers and contradictory credentials refuse')

 const origin='https://synthetic-oncall.example.test',setupToken=randomBytes(32).toString('hex')
 const runtime=await automationRuntime(()=>new Response('unexpected egress',{status:403}),{bindings:()=>({AUTH_LOCAL:'false',AUTH_ORIGIN:origin,MAIL_PROVIDER:'none',SETUP_TOKEN:setupToken})})
 const request=(path,data,cookie='')=>runtime.mf.dispatchFetch(origin+path,{method:data===undefined?'GET':'POST',headers:{origin,'content-type':'application/json',cookie},...(data===undefined?{}:{body:JSON.stringify(data)}),redirect:'manual'})
 const json=async(path,data,cookie='',status=200)=>{const r=await request(path,data,cookie);assert.equal(r.status,status,path);return r.json()}
 const directory=await mkdtemp(join(tmpdir(),'oncall-mail-off-'))
 let browser
 try {
  const bootstrap=await request('/auth/bootstrap',{token:setupToken,displayName:'Synthetic mail-off owner'})
  assert.equal(bootstrap.status,303)
  const bootstrapCookie=bootstrap.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ')
  await bootstrap.body?.cancel()
  const setup=await runtime.mf.dispatchFetch(origin+'/setup',{method:'POST',headers:{origin,cookie:bootstrapCookie,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'})
  assert.equal(setup.status,303);await setup.body?.cancel()
  await json('/auth/signout',{},bootstrapCookie)
  for(const email of ['synthetic-oncall-owner@example.test','synthetic-oncall-unknown@example.test']) {
   assert.deepEqual(await json('/auth/magic-link',{email},'',503),{error:'mail_unavailable'})
  }
  await json('/api/state',undefined,'',401)
  await json('/api/setup',{name:'Synthetic untrusted owner',password:'synthetic-oncall-1'},'',403)
  const dev=await request('/__dev/key',{key:'synthetic-oncall-1'});assert.equal(dev.status,404);await dev.body?.cancel()
  const oneClick=await request('/auth/one-click?email=synthetic-oncall-owner%40example.test&token=synthetic-oncall-1')
  assert.ok(oneClick.status>=400);await oneClick.body?.cancel()
  await json('/auth/owner-signin',{token:randomBytes(32).toString('base64url')},'',400)

  // Exercise the released rer signin handler against the actual native auth D1.
  // Only the provider edge is replaced; receipt and target checks remain real.
  const accountId='a'.repeat(32),worker='synthetic-oncall-recorded-app',versionId=randomUUID(),deploymentId=randomUUID(),etag='synthetic-oncall-etag'
  let replaced=false,writes=0
  const providerFetch=async(input,init={})=>{
   const url=new URL(input),path=url.pathname,body=init.body?JSON.parse(init.body):null
   assert.equal(url.origin,'https://api.cloudflare.com')
   assert.ok(path.startsWith('/client/v4/accounts/'+accountId+'/'))
   let result
   if(path.endsWith('/d1/database/synthetic-oncall-auth/query')) {
    if(/INSERT|UPDATE|DELETE/i.test(body.sql))writes++
    result=[await runtime.db.prepare(body.sql).all()]
   } else {
    assert.ok(path.includes('/workers/scripts/'+worker+'/'),'only the recorded app Worker may be read')
    if(path.endsWith('/settings'))result={bindings:[]}
    else if(path.endsWith('/deployments'))result={deployments:[{id:deploymentId,versions:[{version_id:versionId,percentage:100}]}]}
    else if(path.endsWith('/versions/'+versionId))result={id:versionId,resources:{script:{etag:replaced?'synthetic-oncall-replaced':etag}}}
    else throw Error('Unexpected provider request')
   }
   return Response.json({success:true,errors:[],messages:[],result})
  }
  await mkdir(join(directory,'.rer/deploy'),{recursive:true})
  await writeFile(join(directory,'deploy.json'),JSON.stringify(declaration,null,2)+'\n')
  const state={version:1,kind:'rer-deploy-owner-state',accountId,project:declaration.project,environment:'production',worker,
   owned:{worker:{status:'created'},d1:{auth:{status:'created',id:'synthetic-oncall-auth'}},r2:{},kv:{},queues:{}},
   receipt:{origin,provider:{versionId,deploymentId,etag}}}
  const record=join(directory,'.rer/deploy/production.json')
  const save=()=>writeFile(record,JSON.stringify(state,null,2)+'\n',{mode:0o600})
  await save()
  const priorAccount=process.env.CLOUDFLARE_ACCOUNT_ID,priorToken=process.env.CLOUDFLARE_API_TOKEN
  process.env.CLOUDFLARE_ACCOUNT_ID=accountId;process.env.CLOUDFLARE_API_TOKEN='synthetic-oncall-credential'
  const project={root:directory,profile:'first-party',adapter:commandAdapter}
  const signIn=()=>signinCommand(project,{environment:'production',json:true},{human(){throw Error('Do not print private links')}},{fetch:providerFetch})
  let grant
  try {
   for(const mutate of [
    ()=>{process.env.CLOUDFLARE_ACCOUNT_ID='b'.repeat(32)},
    ()=>{state.project='synthetic-other'},
    ()=>{state.environment='staging'},
    ()=>{state.worker='synthetic-public-site'},
    ()=>{state.receipt=null},
    ()=>{replaced=true},
   ]) {
    const original=structuredClone(state);mutate();await save()
    await assert.rejects(signIn)
    for(const key of Object.keys(state))delete state[key]
    Object.assign(state,original);replaced=false;process.env.CLOUDFLARE_ACCOUNT_ID=accountId;await save()
   }
   assert.equal(writes,0,'wrong deployment identities issue no owner grant')
   grant=await signIn()
   assert.equal(writes,1,'the recorded app auth D1 receives one grant')
  } finally {
   if(priorAccount===undefined)delete process.env.CLOUDFLARE_ACCOUNT_ID;else process.env.CLOUDFLARE_ACCOUNT_ID=priorAccount
   if(priorToken===undefined)delete process.env.CLOUDFLARE_API_TOKEN;else process.env.CLOUDFLARE_API_TOKEN=priorToken
  }
  const link=new URL(grant.link)
  assert.equal(link.origin,origin)
  const preview=await request(link.pathname+link.search);assert.equal(preview.status,200);await preview.body?.cancel()
  const signed=await request('/auth/owner-signin',{token:link.searchParams.get('token')});assert.equal(signed.status,303)
  const cookie=signed.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');await signed.body?.cancel()
  await json('/auth/owner-signin',{token:link.searchParams.get('token')},'',400)
  const member=(await json('/api/workspace',undefined,cookie)).member;assert.equal(member.role,'admin')
  for(const email of ['synthetic-oncall-owner@example.test','synthetic-oncall-unknown@example.test']) {
   assert.deepEqual(await json('/auth/invite',{email,displayName:'Synthetic invite',role:'member'},cookie,503),{error:'mail_unavailable'})
  }
  const service=await json('/api/command',{type:'service',id:'synthetic-mail-off',name:'Synthetic mail-off service',environment:'test',owner:member.id,runbook:[],pager:''},cookie)
  const schedule=await json('/api/paging/schedules',{id:'synthetic-mail-off',service:service.id,name:'Synthetic mail-off rota',revision:0,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:{anchorLocal:'2026-01-01T00:00',periodDays:1,members:[member.id],ambiguity:'earlier'},backup:{anchorLocal:'2026-01-01T00:00',periodDays:1,members:[member.id],ambiguity:'earlier'},overrides:[]},cookie)
  assert.equal(schedule.service,service.id)
  const incident=await json('/api/command',{type:'declare',service:service.id,title:'Synthetic mail-off incident',severity:'warning',summary:'Retained coordination without mail'},cookie)
  const notified=await json('/api/command',{type:'request-responders',incident:incident.id,revision:incident.revision,users:[member.id],message:'Synthetic responder coordination'},cookie)
  assert.equal(notified.responderRequests[0].obligation.label,'no sender')
  assert.equal(notified.responderRequests[0].obligation.paging,'off')
  assert.equal(notified.responderRequests[0].obligation.automatic,false)
  assert.notEqual(notified.responderRequests[0].obligation.state,'sent')
  await runtime.restart()
  assert.equal((await json('/api/state',undefined,cookie)).incidents.find(i=>i.id===incident.id).responderRequests.length,1)
  for(const path of ['/','/docs','/health']){const r=await request(path);assert.equal(r.status,200,path);await r.body?.cancel()}
  await json('/api/state',undefined,'',401)
  const privatePage=await request('/incidents/'+incident.id);assert.ok(!(await privatePage.text()).includes(incident.title),'signed-out document reveals no incident')
  assert.deepEqual(await runtime.outboundRequests(),[])

  browser=await chromium.launch({headless:true,executablePath:process.env.ONCALL_CHROMIUM_PATH??process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
  const context=await browser.newContext({viewport:{width:1440,height:1000}})
  await context.route(origin+'/**',async route=>{
   const req=route.request(),response=await runtime.mf.dispatchFetch(req.url(),{method:req.method(),headers:req.headers(),...(req.postDataBuffer()?{body:req.postDataBuffer()}:{})})
   await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())})
  })
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message))
  await page.goto(origin+'/signin')
  assert.equal(await page.locator('code').filter({hasText:'rer signin'}).count(),1)
  assert.equal(await page.locator('input[type=email],input[name=token],a[href*="/__dev/"],a[href*="/auth/owner-signin"]').count(),0,'no mail form, local-dev entry or sign-in token is exposed')
  assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations.filter(v=>['serious','critical'].includes(v.impact)),[])
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  const captures=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser';await mkdir(captures,{recursive:true})
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.screenshot({path:join(captures,'mail-off-signin-'+width+'.png'),fullPage:true})}
  assert.deepEqual(errors,[])
  await context.close()
  console.log('PASS mail-off hosted journey: uniform 503 email and invitations, guarded rer signin against recorded Worker/account/project/environment/receipt, one-time owner grant, signed-out private protection, schedules/incidents/public pages, unsent notification and zero egress; sign-in proof at 1440/390')
 } finally {await browser?.close();await runtime.close();await rm(directory,{recursive:true,force:true})}
}
