import {fileURLToPath} from 'node:url'
import {isolatedEntrypoint} from './isolated.mjs'
const isolated=await isolatedEntrypoint(import.meta.url);if(isolated!==null)process.exit(isolated)
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdir,writeFile,rm} from 'node:fs/promises'
import {createServer} from 'node:net'
import {chromium} from '@playwright/test'
import {redact} from './diagnostics.mjs'
import {productBrowserJourney} from './product-browser-journey.mjs'

const socket=createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r))
const origin=`http://127.0.0.1:${port}`,env={...process.env,CI:'true',RER_SERVER_JOURNEY:'1',WRANGLER_SEND_METRICS:'false'},children=[]
const safe=value=>redact(value)
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
 browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
 const context=await browser.newContext({baseURL:origin,viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 await context.addCookies([{name:`oncall_session_${new URL(origin).port}`,value:'retired-installation-session',url:origin}])
 await page.goto(link);await page.waitForURL(url=>url.pathname==='/setup'||url.pathname==='/incidents'&&!url.hash,{timeout:60000})
 await page.goto(origin+'/setup');const confirm=page.getByRole('checkbox');if(await confirm.count()){await confirm.check();await page.getByRole('button',{name:'Finish setup'}).click()}
 await page.getByRole('link',{name:'Services',exact:true}).waitFor({timeout:60000})
 assert.equal((await context.cookies()).some(cookie=>cookie.name===`oncall_session_${new URL(origin).port}`),false,'explicit local sign-in clears a previous installation cookie')
 await productBrowserJourney(page,context,{ownerLink:link})
 assert.deepEqual(errors,[],'no browser application errors')
 await browser.close();browser=null
 if(dev.exitCode===null){dev.kill('SIGTERM');await new Promise(resolve=>dev.once('exit',resolve))}
 // Exercise fixed production preview and verify that dev identity is absent.
 const preview=spawn(process.execPath,[fileURLToPath(import.meta.resolve('@runeditrun/rer/internal/bin/rer.mjs')),'preview','--port',String(port),'--idle-timeout','120','--non-interactive'],{env,stdio:['ignore','pipe','pipe']});children.push(preview)
 let ready='';for(const s of [preview.stdout,preview.stderr])s.on('data',c=>ready+=c)
 for(let n=0;n<600;n++){if(preview.exitCode!==null)throw Error(safe(ready).slice(-2000));if(ready.includes('RER_READY'))break;await new Promise(r=>setTimeout(r,250))}
 assert.ok(ready.includes('RER_READY'));assert.equal((await fetch(origin+'/api/state')).status,401);await command(['preview','--stop'])
 await command(['reset','--yes'])
 console.log('Managed production preview, signed-out authority and confirmed reset passed')
}catch(error){
 if(browser){const page=browser.contexts()[0]?.pages()[0];await page?.screenshot({path:'evidence/browser/failure.png',fullPage:true,mask:[page.locator('[aria-label="New private calendar URL"]')]});console.error('Browser failure at',new URL(page.url()).pathname);console.error(safe((await page.locator('body').innerText()).slice(0,1800)))}
 throw error
}finally{
 await browser?.close()
 for(const child of children){if(child.exitCode===null){child.kill('SIGTERM');await new Promise(r=>child.once('exit',r))}}
 await rm('.rer/local/browser-answers.json',{force:true})
}
