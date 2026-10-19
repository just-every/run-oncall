import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {mkdir,readFile} from 'node:fs/promises'

// Command readback and a real storage outage through the emitted Worker.
export async function coordinationHealth({origin,request,sql,deployment,cookie}) {
 const ok=r=>{assert.equal(r.status,200,JSON.stringify(r.value));return r.value}
 const cli=fileURLToPath(import.meta.resolve('@runeditrun/rer/internal/bin/rer.mjs'))
 const command=args=>execFileSync(process.execPath,[cli,...args,'--json'],{encoding:'utf8',env:{...process.env,CI:'true'},stdio:['ignore','pipe','pipe']}).trim().split('\n').map(line=>JSON.parse(line)).at(-1)
 const pkg=JSON.parse(await readFile('node_modules/@runeditrun/rer/package.json','utf8'))
 const commands=()=>{
  const described=command(['describe']);assert.equal(described.cliVersion,pkg.version,'describe identifies the executable that actually answered')
  assert.ok(described.verbs.deploy.flags.includes('--dry-run'));assert.ok(described.verbs.deploy.flags.includes('--remove'))
  assert.ok(described.verbs.import.flags.includes('--yes'));assert.ok(described.verbs.export.flags.includes('--output'))
  const checked=command(['check','--profile','first-party']);assert.equal(checked.ok,true);assert.ok(checked.clauses.every(c=>c.ok))
  return described
 }
 const healthy=ok(await request('/health'))
 assert.deepEqual(healthy.deployment,deployment,'local emitted build advertises its actual source SHA and artifact fingerprint')
 assert.equal(healthy.ok,true);assert.equal(healthy.storage,'available');assert.equal(healthy.target,'coordination');assert.equal(healthy.paging,'not-provided')
 const before=ok(await request('/api/archive',undefined,cookie)),description=commands()
 assert.deepEqual(ok(await request('/api/archive',undefined,cookie)),before,'check and describe leave durable coordination unchanged')
 let browser,page
 if(process.env.ONCALL_HEALTH_BROWSER) {
  const {chromium}=await import('@playwright/test')
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  page=await (await browser.newContext()).newPage()
 }
 const capture=async state=>{
  if(!page)return
  const directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser';await mkdir(directory,{recursive:true})
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});await page.goto(origin+'/health')
   const body=JSON.parse(await page.locator('pre').innerText());assert.deepEqual(body.deployment,deployment)
   assert.equal(body.storage,state==='unavailable'?'unavailable':'available')
   await page.screenshot({path:`${directory}/OC-010-health-${state}-${width}.png`,fullPage:true})
  }
 }
 try {
  await capture('available')
  sql('ALTER TABLE workspace_control RENAME TO workspace_fault')
  try {
   const failed=await request('/health');assert.equal(failed.status,503)
   assert.equal(failed.value.ok,false);assert.equal(failed.value.storage,'unavailable')
   assert.equal(failed.value.target,'coordination');assert.equal(failed.value.paging,'not-provided')
   assert.deepEqual(failed.value.deployment,deployment,'failure still identifies the deployed build')
   assert.equal(typeof failed.value.error,'string')
   assert.equal((await request('/api/state',undefined,cookie)).status,503)
   assert.deepEqual(commands(),description,'read-only command capabilities and local effects remain available during storage failure')
   await capture('unavailable')
  }finally{sql('ALTER TABLE workspace_fault RENAME TO workspace_control')}
  assert.deepEqual(ok(await request('/health')),healthy,'503 recovers to the same healthy deployment')
  assert.deepEqual(ok(await request('/api/archive',undefined,cookie)),before,'failure/recovery loses no records and creates no claimed effect')
  await capture('recovered')
  if(page)for(const width of [1440,390]) {
   await page.setViewportSize({width,height:1000});await page.goto(origin+'/docs/install#host-for-your-team')
   await page.getByText('Dry run:',{exact:true}).scrollIntoViewIfNeeded()
   await page.screenshot({path:`${process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser'}/OC-010-command-effects-${width}.png`})
  }
  console.log('OC-010 coordination health, deployment identity and honest command effects survive storage failure: local 503/recovery and read-only check/describe; paging not provided; capacity unmeasured')
 }finally{await browser?.close()}
}
