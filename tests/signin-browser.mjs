import {isolatedEntrypoint} from './isolated.mjs'
const isolated=await isolatedEntrypoint(import.meta.url);if(isolated!==null)process.exit(isolated)
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {chromium} from '@playwright/test'
import {managedSeed} from './managed.mjs'
import {redact} from './diagnostics.mjs'

const managed=await managedSeed(),owner='oncall.lead@example.com'
const {surfaces:{app:{signIn}}}=JSON.parse(await readFile('management/integration/deployment-spec.json','utf8'))
const openApp=email=>{
 const url=new URL(signIn.path,managed.origin)
 if(signIn.loginHint)url.searchParams.set('login_hint',email)
 return url.href
}
const answers='.rer/local/signin-answers.json',env={...process.env,CI:'true',RER_SERVER_JOURNEY:'1',WRANGLER_SEND_METRICS:'false'}
let browser,dev
await mkdir('.rer/local',{recursive:true,mode:0o700});await mkdir('evidence/browser',{recursive:true})
await writeFile(answers,JSON.stringify({OWNER_EMAIL:owner}),{mode:0o600})
try {
 await managed.command(['setup','--answers',answers,'--port',String(managed.port),'--non-interactive'])
 dev=spawn(process.execPath,[fileURLToPath(import.meta.resolve('@runeditrun/rer/internal/bin/rer.mjs')),'dev','--port',String(managed.port),'--idle-timeout','300','--non-interactive'],{env,stdio:['ignore','pipe','pipe']})
 let output='',link
 for(const stream of [dev.stdout,dev.stderr])stream.on('data',chunk=>output+=chunk)
 for(let attempt=0;attempt<600;attempt++) {
  if(dev.exitCode!==null)throw Error(redact(output).slice(-2000))
  link=output.match(/RER_OPEN (http[^\s]+)/)?.[1]
  if(link)break
  await new Promise(resolve=>setTimeout(resolve,250))
 }
 assert.ok(link,'rer offers the private owner entry')
 browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage()
 const errors=[];page.on('pageerror',error=>errors.push(error.message))
 await page.goto(link)
 await page.waitForURL(url=>url.pathname==='/setup'||url.pathname==='/'&&!url.hash,{timeout:60000})
 await page.goto(managed.origin+'/setup')
 const confirmation=page.getByRole('checkbox')
 if(await confirmation.count()){await confirmation.check();await page.getByRole('button',{name:'Finish setup'}).click()}
 await page.getByRole('link',{name:'Services',exact:true}).waitFor({timeout:60000})
 await page.getByRole('button',{name:'Sign out',exact:true}).click()
 await page.waitForURL(managed.origin+signIn.path)
 assert.equal((await context.request.get(managed.origin+'/api/state')).status(),401)
 let submitted=0
 page.on('request',request=>{if(request.method()==='POST'&&new URL(request.url()).pathname==='/auth/magic-link')submitted++})
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:1000})
  await page.goto(openApp(owner))
  const email=page.getByLabel('Email',{exact:true})
  assert.equal(await email.inputValue(),owner)
  await email.fill('relief.lead@example.com')
  assert.equal(await email.inputValue(),'relief.lead@example.com','a hint stays editable')
  await page.goto(openApp(owner))
  assert.equal(await email.inputValue(),owner)
  assert.equal(submitted,0,'a hint never submits the form')
  await page.screenshot({path:`evidence/browser/signin-login-hint-${width}.png`,fullPage:true})
 }
 for(const hint of ['','invalid<address>']) {
  await page.goto(openApp(hint))
  assert.equal(await page.getByLabel('Email',{exact:true}).inputValue(),'')
 }
 await page.goto(openApp(owner))
 await page.getByRole('button',{name:'Email a sign-in link',exact:true}).click()
 await page.getByRole('alert').waitFor()
 assert.equal(submitted,1,'only explicit submission requests delivery')
 assert.equal(new URL(page.url()).searchParams.get('notice'),'mail_unavailable','unconfigured mail is an explicit refusal')
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:1000})
  await page.screenshot({path:`evidence/browser/signin-mail-unavailable-${width}.png`,fullPage:true})
 }
 await page.goto(link)
 await page.waitForURL(url=>url.pathname==='/'&&!url.hash,{timeout:60000})
 assert.equal((await context.request.get(managed.origin+'/api/state')).status(),200,'the owner entry opens the real workspace')
 assert.deepEqual(errors,[])
 console.log('Sign-in browser flow passed at 1440 and 390: editable login hint, invalid hint refusal, explicit mail-unavailable state and private owner entry')
} finally {
 await browser?.close()
 await managed.command(['dev','--stop'])
 if(dev&&dev.exitCode===null){dev.kill('SIGTERM');await new Promise(resolve=>dev.once('exit',resolve))}
 await managed.close();await rm(answers,{force:true})
}
