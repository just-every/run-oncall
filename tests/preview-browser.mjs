import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {mkdir} from 'node:fs/promises'
import {selectRoutedSource,openHistoryComparison} from './keyboard.mjs'

// The same saved rota and retained event are read through the rendered preview doors.
export async function previewIsolationBrowser(page,context,proof) {
 const origin=new URL(page.url()).origin,directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser'
 await mkdir(directory,{recursive:true})
 const api=async(path,data,status=200)=>{
  const response=await (data===undefined?context.request.get(path):context.request.post(path,{headers:{origin},data}))
  assert.equal(response.status(),status,`${path}: ${await response.text()}`)
  return response.json()
 }
 const {member}=await api('/api/session'),id='synthetic-oncall-14-browser',key=randomBytes(32).toString('hex'),at=Date.now()
 const colleague=await api('/api/members',{name:'synthetic-oncall-14-colleague',role:'responder',password:'synthetic-oncall-14-password'},201)
 const service=await api('/api/command',{type:'service',id,name:'Checkout preview',environment:'production',owner:member.id,runbook:['Inspect checkout latency before changing the rota.'],pager:''})
 await api('/api/command',{type:'policy',service:id,severity:'*',action:'route',owner:member.id,reason:'Checkout owner coordinates the response'})
 const schedule=await api('/api/paging/schedules',{id,name:'Checkout response rota',service:id,revision:0,timezone:'UTC',validFrom:new Date(at-86400000).toISOString(),validUntil:null,primary:{anchorLocal:new Date(at-86400000).toISOString().slice(0,10)+'T00:00',periodDays:7,members:[member.id,colleague.id],ambiguity:'earlier'},backup:{anchorLocal:new Date(at-86400000).toISOString().slice(0,10)+'T00:00',periodDays:7,members:[colleague.id,member.id],ambiguity:'earlier'},overrides:[]})
 const source=await api('/api/routing/keys',{id,name:'Checkout preview monitor',provider:'native',authentication:'bearer',scope:[id],owner:member.id,key,revision:0,rules:[],catchAll:id},201)
 const signal={source:'intake:'+id,eventId:id,service:id,environment:'production',key:id,generation:id,intent:'trigger',severity:'warning',title:'Checkout response latency',observedAt:new Date(at).toISOString(),evidence:''}
 const admitted=await context.request.post('/api/ingress/'+signal.source,{headers:{authorization:'Bearer '+key},data:signal});assert.equal(admitted.status(),201)
 const before=proof.snapshot(),paging=await api('/api/paging/state'),outbound=await proof.outbound()
 const unchanged=async()=>{
  assert.deepEqual(proof.snapshot(),before,'rendered previews preserve every durable row and timer')
  assert.deepEqual(await api('/api/paging/state'),paging,'rendered previews preserve receipt counts and synthetic labeling')
  assert.deepEqual(await proof.outbound(),outbound,'rendered previews cause no provider request')
 }
 const screen=async(name,width)=>{
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} fits ${width}`)
  await page.screenshot({path:`${directory}/oc014-${name}-${width}.png`,fullPage:true})
 }
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:1000})
  await page.goto(origin+'/on-call')
  const row=page.locator(`[data-rota="${schedule.id}"]`);await row.waitFor()
  assert.ok((await row.innerText()).includes(member.name));assert.ok((await row.innerText()).includes(colleague.name))
  await screen('now-next',width);await unchanged()
  await page.goto(origin+'/on-call/'+schedule.id)
  await page.getByRole('heading',{name:'On call now and next',exact:true}).waitFor()
  await page.getByRole('heading',{name:'Checkout response rota',exact:true}).waitFor()
  await screen('saved-preview',width);await unchanged()
  await page.goto(origin+'/on-call/'+schedule.id+'/edit')
  const disclosure=page.locator('.oc-preview > summary')
  if(width===390)await disclosure.click()
  await page.getByRole('list',{name:'Resolved coverage spans',exact:true}).waitFor()
  assert.ok((await page.getByRole('list',{name:'Resolved coverage spans',exact:true}).innerText()).includes(colleague.name))
  await screen('draft-preview',width);await unchanged()
  await page.goto(origin+'/settings/routing');await selectRoutedSource(page,source)
  await page.getByLabel('Catch-all for unmatched events',{exact:true}).selectOption('')
  await page.getByRole('button',{name:'Preview routing changes',exact:true}).click()
  const comparison=page.getByRole('region',{name:'Routing preview',exact:true})
  await comparison.getByText('Decision changes',{exact:false}).waitFor()
  assert.ok((await comparison.innerText()).includes(signal.title))
  await comparison.scrollIntoViewIfNeeded();await screen('routing-preview',width);await unchanged()
  await openHistoryComparison(page)
  const replay=page.getByRole('region',{name:'Replay comparison',exact:true})
  await replay.getByRole('heading',{name:signal.title,exact:true}).waitFor()
  await replay.getByRole('heading',{name:'Historical decision',exact:true}).first().waitFor()
  await replay.getByRole('heading',{name:'Proposed decision',exact:true}).first().waitFor()
  await screen('history-replay',width);await unchanged()
  await page.getByRole('button',{name:'Close comparison',exact:true}).click()
 }
 console.log('PROBE OC-014 1 browser: aggregate now and next, saved and draft rota coverage, changed key routing preview and retained event replay at 1440 and 390 -> populated results, unchanged durable rows and receipts, zero provider requests')
}
