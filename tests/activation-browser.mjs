import {fileURLToPath} from 'node:url'
import {isolatedEntrypoint} from './isolated.mjs'
const isolated=await isolatedEntrypoint(import.meta.url);if(isolated!==null)process.exit(isolated)
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdir,writeFile,rm} from 'node:fs/promises'
import {createServer} from 'node:net'
import {chromium} from '@playwright/test'

const socket=createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r))
const origin=`http://127.0.0.1:${port}`,env={...process.env,CI:'true',RER_SERVER_JOURNEY:'1',WRANGLER_SEND_METRICS:'false'},children=[]
const safe=value=>value.replace(/#rer-dev=[^\s"']+/g,'#rer-dev=[redacted]').replace(/\?token=[^\s"']+/g,'?token=[redacted]')
async function command(args) {
 const child=spawn(process.execPath,[fileURLToPath(import.meta.resolve('@runeditrun/rer/internal/bin/rer.mjs')),...args],{env,stdio:['ignore','pipe','pipe']});children.push(child);let output='';child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>output+=c)
 const code=await new Promise(r=>child.once('exit',r));assert.equal(code,0,safe(output).slice(-2000));return output
}
let browser,dev
await mkdir('.rer/local',{recursive:true,mode:0o700});await mkdir('evidence/browser',{recursive:true})
await writeFile('.rer/local/browser-answers.json',JSON.stringify({OWNER_EMAIL:'owner@example.test'}),{mode:0o600})
try {
 await command(['setup','--answers','.rer/local/browser-answers.json','--port',String(port),'--non-interactive'])
 dev=spawn(process.execPath,[fileURLToPath(import.meta.resolve('@runeditrun/rer/internal/bin/rer.mjs')),'dev','--port',String(port),'--idle-timeout','300','--non-interactive'],{env,stdio:['ignore','pipe','pipe']});children.push(dev)
 let output='';for(const stream of [dev.stdout,dev.stderr])stream.on('data',c=>output+=c)
 let link
 for(let n=0;n<600;n++){if(dev.exitCode!==null)throw Error(safe(output).slice(-2000));link=output.match(/RER_OPEN (http[^\s]+)/)?.[1];if(link)break;await new Promise(r=>setTimeout(r,250))}
 assert.ok(link,'managed dev emitted a private owner-open link')
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})})
 const context=await browser.newContext({baseURL:origin,viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.goto(link);await page.waitForURL(url=>url.pathname==='/setup'||url.pathname==='/'&&!url.hash,{timeout:60000})
 await page.goto(origin+'/setup');const confirm=page.getByRole('checkbox');if(await confirm.count()){await confirm.check();await page.getByRole('button',{name:'Finish setup'}).click()}
 await page.getByRole('link',{name:'Services',exact:true}).waitFor({timeout:60000})
 const session=await page.evaluate(async()=>await (await fetch('/api/session')).json());assert.equal(session.member.role,'admin');assert.ok(!page.url().includes('rer-dev'))
 await page.getByRole('link',{name:'Services',exact:true}).click();await page.getByLabel('Service name',{exact:true}).fill('Checkout');await page.getByLabel('Runbook steps (one per line)').fill('Verify recovery');await page.getByRole('button',{name:'Create service',exact:true}).click();await page.getByRole('heading',{name:'Checkout',exact:true}).waitFor()
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:1000})
  await page.getByRole('link',{name:'Schedules',exact:true}).click();await page.getByRole('button',{name:'New schedule',exact:true}).click()
  await page.getByLabel('Schedule ID',{exact:true}).fill('browser-'+width);await page.getByLabel('Schedule name',{exact:true}).fill('Checkout rota '+width)
  await page.getByRole('button',{name:'Add primary responder',exact:false}).click();await page.getByLabel('Primary responder 1',{exact:true}).selectOption(session.member.id)
  await page.getByRole('button',{name:'Save schedule',exact:true}).click();await page.getByText('Schedule saved',{exact:true}).waitFor()
  await page.getByRole('button',{name:'Add interval',exact:false}).click();await page.getByLabel('Override 1 responder',{exact:true}).selectOption(session.member.id)
  await page.getByRole('button',{name:'Save schedule',exact:true}).click();await page.getByText('Schedule saved',{exact:true}).waitFor()
  await page.getByRole('button',{name:'Preview coverage',exact:true}).click();await page.getByText('Saved schedule preview evaluated; no delivery or timer was created',{exact:true}).waitFor()
  const feed=page.getByRole('link',{name:/private ICS feed/});await feed.waitFor();assert.equal((await context.request.get(await feed.getAttribute('href'))).status(),200)
  await page.screenshot({path:`evidence/browser/schedules-${width}.png`,fullPage:true})
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'schedule viewport has no horizontal overflow')
  await page.getByRole('link',{name:'Move-in kit',exact:true}).click();await page.getByLabel('Export JSON').setInputFiles('tests/fixtures/opsgenie.json');await page.getByRole('button',{name:'Preview import',exact:true}).click();await page.getByRole('heading',{name:'Compatibility review'}).waitFor()
  assert.ok(await page.getByText(/Eight-hour shift/).count()>0)
  await page.screenshot({path:`evidence/browser/import-review-${width}.png`,fullPage:true})
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'import viewport has no horizontal overflow')
  if(width===1440){await page.getByRole('button',{name:'Confirm paused import',exact:true}).click();await page.getByRole('heading',{name:'Import journal'}).waitFor();await page.getByRole('button',{name:'Undo this import',exact:true}).click();await page.locator('[role="status"] p').filter({hasText:/undone/}).waitFor()}
  // Erasing an imported person from the paused data list: typed confirmation, an ordinary click, no overflow.
  const email=`erase-${width}@example.test`
  await page.getByLabel('Export JSON').setInputFiles({name:'erase.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({users:{data:[{id:'erase-'+width,username:email,fullName:'Erase '+width}]}}))})
  await page.getByRole('button',{name:'Preview import',exact:true}).click();await page.getByRole('heading',{name:'Compatibility review'}).waitFor()
  await page.getByRole('button',{name:'Confirm paused import',exact:true}).click();await page.getByRole('heading',{name:'Import journal'}).waitFor()
  const person=page.getByRole('listitem').filter({hasText:`user: Erase ${width}`})
  await person.getByRole('button',{name:'Erase person',exact:true}).click()
  const typed=page.getByLabel(`Type "erase ${email}" to erase this person from imported data`);assert.equal(await person.getByRole('button',{name:'Erase permanently',exact:true}).isDisabled(),true,'erasing needs the typed confirmation')
  await typed.fill('erase '+email)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'erase control has no horizontal overflow')
  await page.screenshot({path:`evidence/browser/erase-person-${width}.png`,fullPage:true})
  await person.getByRole('button',{name:'Erase permanently',exact:true}).click()
  await page.getByText(/^Erased\. Receipt /).waitFor();assert.equal(await person.count(),0,'the erased person leaves the paused data list')
  await page.getByRole('link',{name:'Routing & replay',exact:true}).click();await page.getByLabel(/^Event JSON array/).fill(JSON.stringify([{source:'browser',eventId:'replay-'+width,service:'checkout',environment:'production',key:'browser',generation:'g1',intent:'trigger',severity:'critical',title:'Replay '+width,observedAt:'2026-10-12T00:00:00.000Z'}]))
  // An ordinary pointer click where the button sits at the viewport's lower edge;
  // anything covering it there (such as a fixed dev identity badge) takes the click.
  const compare=page.getByRole('button',{name:'Compare decisions',exact:true});await compare.evaluate(button=>button.scrollIntoView({block:'end'}));const box=await compare.boundingBox()
  const [replay]=await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname==='/api/replay',{timeout:15000}),page.mouse.click(box.x+box.width/2,box.y+box.height/2)]);assert.equal(replay.status(),200)
  await page.getByLabel('Replay comparison',{exact:true}).waitFor()
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'routing viewport has no horizontal overflow')
  console.log(`Browser journey ${width}: managed setup/dev owner identity, real service/schedule/override, coverage/ICS, reviewed paused import, pointer replay and responsive layout passed`)
 }
 assert.deepEqual(errors,[],'no browser application errors')
 await browser.close();browser=null
 await command(['dev','--stop'])
 // Exercise fixed production preview and verify that dev identity is absent.
 const preview=spawn(process.execPath,[fileURLToPath(import.meta.resolve('@runeditrun/rer/internal/bin/rer.mjs')),'preview','--port',String(port),'--idle-timeout','120','--non-interactive'],{env,stdio:['ignore','pipe','pipe']});children.push(preview)
 let ready='';for(const s of [preview.stdout,preview.stderr])s.on('data',c=>ready+=c)
 for(let n=0;n<600;n++){if(preview.exitCode!==null)throw Error(safe(ready).slice(-2000));if(ready.includes('RER_READY'))break;await new Promise(r=>setTimeout(r,250))}
 assert.ok(ready.includes('RER_READY'));assert.equal((await fetch(origin+'/api/state')).status,401);await command(['preview','--stop'])
 await command(['reset','--yes'])
 console.log('Managed production preview, signed-out authority and confirmed reset passed')
}catch(error){
 if(browser){const page=browser.contexts()[0]?.pages()[0];await page?.screenshot({path:'evidence/browser/failure.png',fullPage:true});console.error('Browser failure at',new URL(page.url()).pathname);console.error((await page.locator('body').innerText()).slice(0,1800))}
 throw error
}finally{
 await browser?.close()
 for(const child of children){if(child.exitCode===null){child.kill('SIGTERM');await new Promise(r=>child.once('exit',r))}}
 await rm('.rer/local/browser-answers.json',{force:true})
}
