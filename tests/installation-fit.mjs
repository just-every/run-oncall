import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {expect} from '@playwright/test';

// Part of the existing managed installation journey, through the real CLI.
export async function localMailChoiceRefusal(managed, answers) {
 const selected={OWNER_EMAIL:'synthetic-oncall-owner@example.test',APP_NAME:'Example Operations',MAIL_PROVIDER:'none'};
 await writeFile(answers,JSON.stringify(selected),{mode:0o600});
 const output=await managed.command(['setup','--answers',answers,'--non-interactive'],4);
 assert.match(output,/MAIL_PROVIDER=none.*hosted.*MAIL_PROVIDER=development/);
 // A retry of the same selection must explain the same correction before success.
 const retry=await managed.command(['setup','--answers',answers,'--non-interactive'],4);
 assert.match(retry,/MAIL_PROVIDER=none.*MAIL_PROVIDER=development/);
 await writeFile(answers,JSON.stringify({...selected,MAIL_PROVIDER:'development'}),{mode:0o600});
 console.log('PASS local mail selection: public setup refuses hosted-only none on first attempt and retry, with a field-specific correction');
}

export async function signedInInstallation(page, origin, {fallback=false, capture=false}={}) {
 const branding=JSON.parse(await readFile('src/branding.json','utf8'));
 const stored=branding.name?.trim(),installation=stored&&stored!=='Oncall'?stored:null;
 const expectedTitle=installation?`${installation} · Oncall`:'Oncall';
 await page.setViewportSize({width:1440,height:1000});
 for(const path of ['/on-call','/settings/services']) {
  await page.goto(origin+path);
  await page.locator('.oncall-frame').waitFor();
  await expect(page).toHaveTitle(new RegExp('^'+expectedTitle+'(?: Dev)?$'));
  await expect(page.locator('.shell-rail .brand')).toHaveText('Oncall');
  if(installation)await expect(page.locator('.shell-rail .installation-name')).toHaveText(installation);
  else assert.equal(await page.locator('.installation-name').count(),0);
  if(capture){
   const directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser';await mkdir(directory,{recursive:true});
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});
    await page.screenshot({path:`${directory}/installation-${path==='/on-call'?'workspace':'settings'}-${width}.png`,fullPage:true});
   }
   await page.setViewportSize({width:1440,height:1000});
  }
 }
 if(fallback){
  const original=await readFile('src/branding.json','utf8');
  try{
   // Vite reloads the actual saved identity; neither the app nor auth is mocked.
   const {name,...withoutName}=branding;
   await writeFile('src/branding.json',JSON.stringify(withoutName)+'\n');
   await page.reload();
   await expect(page).toHaveTitle(/^Oncall(?: Dev)?$/);
   await expect(page.locator('.shell-rail .brand')).toHaveText('Oncall');
   await expect(page.locator('.installation-name')).toHaveCount(0);
  }finally{await writeFile('src/branding.json',original);}
 }
 console.log('PASS signed-in installation: saved name in title and rail across workspace/settings'+(fallback?', absent name falls back to product':'')+(capture?', built screens captured at 1440/390':''));
}

export async function compiledHealth(request) {
 const {version}=JSON.parse(await readFile('package.json','utf8'));
 const sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const response=await request('/health');
 assert.equal(response.status,200);
 assert.equal(response.value.buildVersion,version,'public health reports the compiled package version');
 assert.equal(response.value.deployment.sourceSha,sourceSha,'without deploy bindings health identifies the compiled checkout');
 assert.equal(response.value.ok,true);assert.equal(response.value.storage,'available');
 assert.equal(response.value.paging,'not-provided');
 console.log('PASS compiled health: actual package version and checkout SHA without deployment bindings; coordination liveness preserved');
}
