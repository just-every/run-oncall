import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {writeFile} from 'node:fs/promises';
import {automationRuntime} from '/workspace/run-oncall-f239/tests/worker.mjs';
const require=createRequire('/workspace/run-oncall-f239/package.json');
const {chromium}=require('@playwright/test');
const packet=process.env.HOME+'/rer-consolidation/work/sd-oncall-c-f239/packet';
const runtime=await automationRuntime();
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext();
 const page=await context.newPage();
 const result=[];
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});
  await page.goto(runtime.origin+'/docs/agents',{waitUntil:'networkidle'});
  const row=page.locator('tr').filter({has:page.locator('code',{hasText:/^oncall\.alerts\.list$/})});
  if(width===1440){await row.waitFor();assert.equal(await row.count(),1);assert.ok((await row.innerText()).includes('incidents:read'));assert.ok((await row.innerText()).includes('sensitive'));}
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({path:packet+'/agents-'+width+'.png'});
  result.push({width,url:'/docs/agents',tool:'oncall.alerts.list',status:'shown'});
 }
 assert.deepEqual(await runtime.outboundRequests(),[]);
 await writeFile(packet+'/BROWSER.json',JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),screens:result,assertionWidth:1440,outboundRequests:0},null,2)+'\n');
 console.log('PASS served agent guide: alert row shown at 1440 and 390; scope and classes asserted at 1440; zero outbound requests');
 await context.close();
}finally{await browser?.close();await runtime.close()}
