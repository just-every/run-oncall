import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const root=process.cwd(),mode=process.argv[2],label=process.argv[3];
const {localWorker}=await import(pathToFileURL(resolve('tests/worker.mjs')));
let flow;
if(mode==='bulk')({triageBulkBrowser:flow}=await import(pathToFileURL(resolve('tests/product-browser-journey.mjs'))));
else {
 const source=(await readFile('tests/product-browser.mjs','utf8')).split('// Production Worker + real local D1')[0];
 const scoped=mode==='bulk-then-change'?source.replace("assert.ok(!(await request('/api/state')).incidents.some(i=>i.id===erasedIncident.id));","assert.ok(!(await request('/api/state')).incidents.some(i=>i.id===erasedIncident.id)); return;"):source;
 const diagnosed=scoped.replace("assert.equal((await incidentEraseResponse).status(),200);","const erasureDiagnostic=await incidentEraseResponse; console.log('INCIDENT_ERASURE',erasureDiagnostic.status(),await erasureDiagnostic.text()); assert.equal(erasureDiagnostic.status(),200);");
 const module=diagnosed.replace(/from '\.\/([^']+)'/g,(_,name)=>`from '${pathToFileURL(resolve('tests',name))}'`)+ '\nexport {changeAndSigningBrowser};\n';
 await writeFile('/tmp/oncall-probes/change-flow.mjs',module);
 ({changeAndSigningBrowser:flow}=await import('./change-flow.mjs?'+Date.now()));
}
const worker=await localWorker({INBOUND_EMAIL_DOMAIN:'inbound.example.test'},{clock:true,outboundLedger:true});
let browser;
try {
 await mkdir('evidence/browser',{recursive:true});
 const owner=await worker.request('/api/setup',{name:'Synthetic bulk browser owner',password:randomBytes(32).toString('hex')});assert.equal(owner.status,200);
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-mock-keychain','--password-store=basic']});
 const context=await browser.newContext({baseURL:worker.origin,viewport:{width:1440,height:1000},locale:'en-US',timezoneId:'UTC',extraHTTPHeaders:{connection:'close'}});
 await context.addCookies(owner.headers.getSetCookie().map(line=>{const pair=line.split(';')[0],at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin,httpOnly:true,sameSite:'Lax'};}));
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(worker.origin);await page.locator('.oncall-frame').waitFor({timeout:60000});
 if(['bulk','bulk-then-change'].includes(mode)){
  const session=await (await context.request.get('/api/session')).json();
  const service=await context.request.post('/api/command',{headers:{origin:worker.origin},data:{type:'service',id:'synthetic-oncall-1',name:'Checkout',environment:'production',owner:session.member.id,runbook:[],pager:''}});assert.equal(service.status(),200);
  if(mode==='bulk-then-change'){const {triageBulkBrowser}=await import(pathToFileURL(resolve('tests/product-browser-journey.mjs')));await triageBulkBrowser(page,context,1440);await flow(page,context);}else await flow(page,context,1440);
 }else await flow(page,context);
 assert.deepEqual(errors,[]);
 console.log('PROBE_PASS',mode,label);
} finally {try{await browser?.close();}finally{await worker.close();}}
