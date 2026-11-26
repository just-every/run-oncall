import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {expect} from '@playwright/test';

// Part of the existing managed installation journey, through the real CLI.
export async function localMailChoiceRefusal(managed, answers) {
 const selected={OWNER_EMAIL:'transfer-owner@example.test',APP_NAME:'Example Operations',MAIL_PROVIDER:'none'};
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
  await expect(page).toHaveTitle(expectedTitle);
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
  const reloadWithTitle=async title=>{
   await expect(async()=>{
    await page.reload();
    await expect(page).toHaveTitle(title,{timeout:1000});
   }).toPass({timeout:15000});
  };
  try{
   // Vite reloads the actual saved identity; neither the app nor auth is mocked.
   const {name,...withoutName}=branding;
   await writeFile('src/branding.json',JSON.stringify(withoutName)+'\n');
   // The first reload can arrive before Vite invalidates the changed module.
   await reloadWithTitle('Oncall');
   await expect(page.locator('.shell-rail .brand')).toHaveText('Oncall');
   await expect(page.locator('.installation-name')).toHaveCount(0);
  }finally{await writeFile('src/branding.json',original);}
  await reloadWithTitle(expectedTitle);
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
 assert.equal(response.value.paging,'not-configured');
 console.log('PASS compiled health: actual package version and checkout SHA without deployment bindings; coordination liveness preserved');
}

/** One owner journey: setup names the installation, General renames it, then a
 * fresh colleague sees that same saved name through both public sign-in doors. */
export async function installationNaming() {
 const {localWorker}=await import('./worker.mjs');
 const {chromium}=await import('@playwright/test');
 const worker=await localWorker();let browser;
 const directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser';
 const screenshot=async(page,screen)=>{
  if(!process.env.ONCALL_BROWSER_EVIDENCE)return;
  await mkdir(directory,{recursive:true});
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.screenshot({path:`${directory}/after-${screen}-${width}.png`,fullPage:true});}
  await page.setViewportSize({width:1440,height:1000});
 };
 try {
  browser=await chromium.launch({headless:true,executablePath:process.env.ONCALL_CHROMIUM_PATH??process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
  const context=await browser.newContext({baseURL:worker.origin,viewport:{width:1440,height:1000},extraHTTPHeaders:{connection:'close'}}),page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const branding=JSON.parse(await readFile('src/branding.json','utf8')),initial=branding.name?.trim()||'Oncall';
  // Nothing is named in storage yet: every door uses the setup brand or product.
  for(const path of ['/signin','/signin/local']){
   await page.goto(worker.origin+path);
   await expect(page.locator(path==='/signin'?'.rer-themed .brand [data-rer-name]':'.oc-header .oc-wordmark [data-installation-name]')).toHaveText(initial);
   await expect(page).toHaveTitle(initial==='Oncall'?'Oncall':`${initial} · Oncall`);
   await expect(page.locator('.oc-door-board')).toHaveCount(0);
  }
  assert.equal((await worker.request('/api/installation',{name:'Unauthorized name'})).status,401);
  const owner=await worker.request('/auth/bootstrap',{token:worker.vars.SETUP_TOKEN,displayName:'Synthetic installation owner'},undefined,{'CF-Connecting-IP':'127.0.0.1'});
  assert.equal(owner.status,303);
  await context.addCookies(owner.headers.getSetCookie().map(line=>{const pair=line.split(';')[0],at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin};}));
  await page.goto(worker.origin+'/setup');
  await expect(page.getByLabel('What should we call this?')).toHaveValue(initial);
  const chosen='Brightwell Support',renamed='Brightwell Operations';
  await page.getByLabel('What should we call this?').fill(chosen);
  await screenshot(page,'setup');
  await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup',exact:true}).click();
  await expect(page.locator('.shell-rail .installation-name')).toHaveText(chosen);
  await expect(page).toHaveTitle(`${chosen} · Oncall`);
  await page.getByRole('link',{name:'Settings',exact:true}).click();
  await page.getByRole('link',{name:'General',exact:true}).click();
  await expect(page.getByLabel('What should we call this?')).toHaveValue(chosen);
  const invalid=await context.request.post('/api/installation',{headers:{origin:worker.origin},data:{name:' '}});
  assert.equal(invalid.status(),400);
  await page.getByLabel('What should we call this?').fill(renamed);
  await page.getByRole('button',{name:'Save name',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Installation name saved.'}).waitFor();
  await expect(page.locator('.shell-rail .installation-name')).toHaveText(renamed);
  await expect(page).toHaveTitle(`${renamed} · Oncall`);
  await screenshot(page,'general');
  // A viewer can read the name but cannot change it; revoked sessions also fail.
  const made=await worker.request('/api/members',{name:'Synthetic name viewer',role:'viewer',active:true,password:'synthetic-oncall-viewer-password'},owner.cookie);
  assert.equal(made.status,201,JSON.stringify(made.value));
  const viewer=await worker.request('/api/login',{name:'Synthetic name viewer',password:'synthetic-oncall-viewer-password'});
  assert.equal(viewer.status,200);
  assert.equal((await worker.request('/api/installation',{name:'Viewer change'},viewer.cookie)).status,403);
  await worker.request('/api/logout',{},viewer.cookie);
  assert.equal((await worker.request('/api/installation',{name:'Revoked change'},viewer.cookie)).status,401);
  const fresh=await browser.newContext({viewport:{width:1440,height:1000},extraHTTPHeaders:{connection:'close'}}),colleague=await fresh.newPage();
  for(const path of ['/signin','/signin/local']){
   await colleague.goto(worker.origin+path);
   await expect(colleague.locator(path==='/signin'?'.rer-themed .brand [data-rer-name]':'.oc-door-card [data-installation-name]')).toHaveText(renamed);
   await expect(colleague).toHaveTitle(`${renamed} · Oncall`);
   await expect(colleague.locator('.oc-door-board')).toHaveCount(0);
   await screenshot(colleague,path==='/signin'?'signin':'signin-local');
  }
  await worker.stop();await worker.start();await colleague.reload();
  await expect(colleague.locator('.oc-door-card [data-installation-name]')).toHaveText(renamed);
  await expect(colleague).toHaveTitle(`${renamed} · Oncall`);
  assert.deepEqual(errors,[],'installation naming has no browser errors');
  if(process.env.ONCALL_BROWSER_EVIDENCE)await writeFile(`${directory}/installation-name-receipt.json`,JSON.stringify({observedAt:new Date().toISOString(),setupName:chosen,savedName:renamed,setupPrefilled:true,settingsRename:true,freshColleagueDoors:['/signin','/signin/local'],sampleRotas:0,persistedAfterRestart:true,anonymousRefused:true,viewerRefused:true,revokedRefused:true,assertionWidth:1440,screenshotWidths:[1440,390],browserErrors:errors},null,2)+'\n');
  console.log('PASS installation naming: setup -> General -> fresh sign-in doors -> restart; unauthorized changes refused');
 } finally {await browser?.close();await worker.close();}
}

if(process.env.ONCALL_INSTALLATION_NAME_ONLY==='1')await installationNaming();
