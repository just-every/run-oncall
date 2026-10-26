import {triageBulkBrowser} from './triage-bulk-browser.mjs';
import assert from 'node:assert/strict'
import {routingBrowser} from './routing-browser.mjs';
import {keyboardUser} from './keyboard.mjs'
import {keyboardCoordination} from './keyboard-coordination.mjs'
import {alertSeverity} from './alert-severity-browser.mjs'
import {productSchedule} from './product-schedule-browser.mjs'
import {productImport} from './product-import-browser.mjs'

// The same product assertions run against emitted Worker and managed dev doors.
export async function productBrowserJourney(page,context,{ownerLink,openSession}={}) {
 const key=keyboardUser(page)
 const session=await page.evaluate(async()=>await (await fetch('/api/session')).json())
 assert.equal(session.member.role,'admin');assert.ok(!page.url().includes('rer-dev'))
 await key.activate(page.getByRole('link',{name:'Services',exact:true}));await key.text(page.getByLabel('Service name',{exact:true}),'Checkout');await key.text(page.getByLabel('Runbook steps (one per line)'),'Verify recovery');await key.activate(page.getByRole('button',{name:'Create service',exact:true}));await page.getByRole('heading',{name:'Checkout',exact:true}).waitFor()
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:1000})
  await keyboardCoordination(page,context,width,ownerLink,openSession)
  if(width===1440)await sharedIncidentLinks(page,context)
  await alertSeverity(page,context,width)
  await productSchedule(page,context,width,session,{ownerLink})
  await triageBulkBrowser(page,context,width)
  await productImport(page,context,width,session)
  await routingBrowser(page,context,width)
  await page.getByRole('link',{name:'Routing & replay',exact:true}).click();await page.getByLabel(/^Event JSON array/).fill(JSON.stringify([{source:'browser',eventId:'replay-'+width,service:'checkout',environment:'production',key:'browser',generation:'g1',intent:'trigger',severity:'critical',title:'Replay '+width,observedAt:'2026-10-12T00:00:00.000Z'}]))
  // An ordinary pointer click where the button sits at the viewport's lower edge;
  // anything covering it there (such as a fixed dev identity badge) takes the click.
  const compare=page.getByRole('button',{name:'Compare decisions',exact:true});await compare.evaluate(button=>button.scrollIntoView({block:'end'}));const box=await compare.boundingBox()
  const [replay]=await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname==='/api/replay',{timeout:15000}),page.mouse.click(box.x+box.width/2,box.y+box.height/2)]);assert.equal(replay.status(),200)
  await page.getByLabel('Replay comparison',{exact:true}).waitFor()
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'routing viewport has no horizontal overflow')
  console.log(`Product browser journey ${width}: keyboard incident coordination, stale-write alert, hostile text, schedules, overrides, coverage/ICS, provider export, reviewed import/adoption/erasure, pointer replay and responsive layout passed`)
 }
}

async function sharedIncidentLinks(page,context) {
 const origin=new URL(page.url()).origin
 const state=await (await context.request.get('/api/state')).json(),incident=state.incidents.find(incident=>!incident.mergedInto)
 assert.ok(incident,'the existing coordination journey provides an incident to share')
 await page.addInitScript(()=>{
  window.__routeReplacements=[]
  const replace=history.replaceState.bind(history)
  history.replaceState=(data,unused,url)=>{
   if(url!=null){const next=new URL(url,location.href);if(next.href!==location.href)window.__routeReplacements.push(next.pathname)}
   return replace(data,unused,url)
  }
 })
 const sections=['incidents','alerts','services','status','routing','schedules','move-in','reviews','team','archive']
 for(const [entry,path] of [['/','/incidents'],...sections.map(section=>['/#'+section,'/'+section]),['/?incident='+encodeURIComponent(incident.id)+'#incidents','/incidents/'+encodeURIComponent(incident.id)]]){
  await page.goto(origin+entry)
  await page.waitForURL(url=>url.pathname===path)
  await page.locator('.navigation').waitFor()
  assert.deepEqual(await page.evaluate(()=>window.__routeReplacements),[path],'a shared entry canonicalizes in one client replace hop')
 }
 const visitor=await context.browser().newContext()
 try{
  const entry=await visitor.newPage()
  for(const [old,path] of [['/#alerts','/alerts'],['/#schedules','/schedules'],['/?incident='+encodeURIComponent(incident.id)+'#incidents','/incidents/'+encodeURIComponent(incident.id)]]){
   await entry.goto(origin+old)
   await entry.waitForURL(url=>url.pathname===path)
   assert.equal(await entry.locator('.detail').count(),0,'shared guest entries retain the sign-in lobby without incident data')
  }
 }finally{await visitor.close()}
 await page.locator('.detail').getByRole('heading',{name:incident.title,exact:true}).waitFor()
 const shell=await page.locator('.app').elementHandle()
 try{
  for(const section of sections){
   await page.locator('.navigation a[href="/'+section+'"]').click()
   await page.waitForURL(url=>url.pathname==='/'+section)
   assert.ok(await shell.evaluate(element=>element.isConnected),'workspace navigation retains the shell')
  }
 }finally{await shell.dispose()}
 await page.goto(origin+'/incidents/'+encodeURIComponent('missing-'+incident.id))
 const back=page.locator('main a[href="/incidents"]')
 await back.waitFor()
 assert.equal(await page.locator('.detail').count(),0,'a missing shared incident never opens a different incident')
 await back.click()
 await page.waitForURL(url=>url.pathname==='/incidents')
}
