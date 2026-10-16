import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {pathToFileURL} from 'node:url'
import {resolve} from 'node:path'

// The browser's real download produces importable bundles; only the external provider HTTP edge is faked.
export async function providerExport(page,context,width) {
 await context.grantPermissions(['clipboard-read','clipboard-write'])
 for(const vendor of ['pagerduty','opsgenie']) {
  await page.getByLabel('Source',{exact:true}).selectOption(vendor)
  const help=page.locator('.move-in-export-help')
  await help.locator('summary').click()
  await help.getByRole('button',{name:/Copy .* export command/}).click()
  const copied=await page.evaluate(()=>navigator.clipboard.readText())
  assert.equal(copied,await help.locator('pre code').innerText(),'copy control supplies the displayed runnable command')
  const [download]=await Promise.all([page.waitForEvent('download'),help.getByRole('link',{name:'Download oncall-export.mjs',exact:true}).click()])
  const file=resolve('.rer/local',vendor+'-export.mjs')
  await download.saveAs(file)
  const {collectExport,exportWindow}=await import(pathToFileURL(file).href)
  const fixture=JSON.parse(await readFile(`tests/fixtures/${vendor}.json`,'utf8'))
  const ops=vendor==='opsgenie',users=ops?fixture.users.data:fixture.users
  const schedules=ops?fixture.schedules.data:fixture.schedules
  const calls=[],key='test-export-key-private'
  const request=async(url,options)=>{
   calls.push(url.href)
   assert.equal(options.method,'GET','export never writes to the provider')
   assert.equal(url.origin,ops?'https://api.opsgenie.com':'https://api.pagerduty.com','key only goes to the selected provider')
   assert.ok(options.headers.Authorization.endsWith(key))
   const path=url.pathname,offset=Number(url.searchParams.get('offset')??0)
   const list=(kind,items)=>ops?{data:items,...(kind==='users'&&offset===0?{paging:{next:`${url.origin}${path}?limit=1&offset=1`}}:{})}:{[kind]:items,limit:1,offset,more:kind==='users'&&offset===0}
   let body
   if(path.endsWith('/users')) body=list('users',[{...users[offset],...(offset===0?{apiKey:key}:{})}])
   else if(path.endsWith('/schedules')) body=list('schedules',schedules.map(({id})=>({id})))
   else if(path.endsWith('/overrides')) body=list('overrides',ops?fixture.overrides.data.filter(value=>path.includes(value.scheduleId)):[])
   else if(path.endsWith('/timeline')) {
    const id=decodeURIComponent(path.split('/').at(-2)),original=fixture.timelines.data
    body={data:{...original,_parent:{id},...(id===original._parent.id?{}:{finalTimeline:{rotations:[]}})}}
   } else if(path.includes('/schedules/')) {
    const schedule=schedules.find(value=>value.id===decodeURIComponent(path.split('/').at(-1)))
    body=ops?{data:schedule}:{schedule}
   } else if(path.endsWith('/escalations')) body=list('escalations',fixture.escalations.data)
   else if(path.endsWith('/escalation_policies')) body=list('escalation_policies',fixture.escalation_policies)
   else assert.fail('unexpected provider request')
   return new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}})
  }
  const result=await collectExport({vendor,region:'us',key,window:exportWindow('2026-03-07','2026-03-10'),request})
  assert.ok(calls.some(url=>url.includes('offset=1')),'exporter follows the second people page')
  assert.ok(!result.json.includes(key),'downloaded bundle excludes credentials')
  assert.equal(JSON.parse(result.json).users.length,users.length,'all pages survive assembly')
  await page.getByLabel('Export JSON').setInputFiles({name:vendor+'-export.json',mimeType:'application/json',buffer:Buffer.from(result.json)})
  const [preview]=await Promise.all([page.waitForResponse(response=>new URL(response.url()).pathname==='/api/move-in/preview'),page.getByRole('button',{name:'Preview import',exact:true}).click()])
  assert.equal(preview.status(),200,'downloaded exporter output is accepted by the actual importer')
  assert.ok((await preview.json()).items.some(item=>item.kind==='schedules'&&!item.rejection&&item.effects.some(effect=>effect.targetKind==='schedule')),'a schedule survives provider export and real compatibility review')
  await page.getByRole('heading',{name:'Compatibility review'}).waitFor()
  await page.screenshot({path:`evidence/browser/export-help-${vendor}-${width}.png`,fullPage:true})
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'export and review fit viewport')
 }
}
