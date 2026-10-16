import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'

// One core flow: admitted monitoring events -> visible severity -> declared incident -> stored severity.
export async function alertSeverity(page,context,width) {
 const origin=new URL(page.url()).origin
 const state=await (await context.request.get('/api/state')).json()
 const service=state.services.find(service=>service.name==='Checkout')
 const source='severity-'+width,key='test-source-'+randomUUID()
 const created=await context.request.post('/api/sources',{headers:{origin},data:{id:source,key,scopes:[service.id],mode:'bearer'}})
 assert.equal(created.status(),200)
 for(const severity of ['critical','warning','info']) {
  const event={source,eventId:severity+'-trigger',service:service.id,environment:service.environment,key:severity,generation:'g1',intent:'trigger',severity,title:`Checkout ${severity} ${width}`,observedAt:new Date().toISOString(),evidence:''}
  assert.equal((await context.request.post('/api/ingress/'+source,{headers:{authorization:'Bearer '+key},data:event})).status(),201)
  // A lower-severity recovery receipt must not erase the urgent trigger's severity.
  if(severity==='critical') assert.equal((await context.request.post('/api/ingress/'+source,{headers:{authorization:'Bearer '+key},data:{...event,eventId:'critical-recovery',intent:'recover',severity:'info'}})).status(),201)
 }
 await page.getByRole('link',{name:'Alerts & events',exact:true}).click()
 await page.getByRole('button',{name:'Refresh',exact:true}).click()
 for(const severity of ['critical','warning','info']) {
  const title=`Checkout ${severity} ${width}`
  const card=page.getByRole('article').filter({has:page.getByRole('heading',{name:title,exact:true})})
  await card.locator('.priority').filter({hasText:severity}).waitFor()
 }
 await page.screenshot({path:`evidence/browser/alert-severity-${width}.png`,fullPage:true})
 for(const severity of ['critical','warning','info']) {
  const title=`Checkout ${severity} ${width}`
  const card=page.getByRole('article').filter({has:page.getByRole('heading',{name:title,exact:true})})
  await card.getByRole('button',{name:'Declare incident from alert',exact:true}).click()
  await page.locator('.detail').getByRole('heading',{name:title,exact:true}).waitFor()
  const stored=await (await context.request.get('/api/state')).json()
  const incident=stored.incidents.find(incident=>incident.title===title)
  assert.equal(incident.severity,severity,'declaring from alert preserves its severity')
  assert.equal(incident.alerts.length,1,'declaration keeps the source alert linked')
  await page.locator('.priority').filter({hasText:severity}).first().waitFor()
  if(severity==='critical') await page.screenshot({path:`evidence/browser/declared-critical-${width}.png`,fullPage:true})
  await page.getByRole('link',{name:'Alerts & events',exact:true}).click()
 }
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'alert list fits viewport')
 await singleIncidentPerAlert(page,context,width,service,source,key)
}

// One core flow: concurrent declarations, a retry and a reload all keep one incident per alert.
async function singleIncidentPerAlert(page,context,width,service,source,key) {
 const origin=new URL(page.url()).origin,title=`Checkout elevated error rate ${width}`
 const event={source,eventId:'concurrent-trigger',service:service.id,environment:service.environment,key:'concurrent',generation:'g1',intent:'trigger',severity:'critical',title,observedAt:new Date().toISOString()}
 assert.equal((await context.request.post('/api/ingress/'+source,{headers:{authorization:'Bearer '+key},data:event})).status(),201)
 const state=await (await context.request.get('/api/state')).json()
 const alert=state.alerts.find(alert=>alert.events.some(id=>state.events.some(event=>event.id===id&&event.eventId==='concurrent-trigger'&&event.source===source)))
 const data={type:'declare',service:service.id,title,severity:'critical',summary:'Customers see failed checkout requests',alerts:[alert.id]}
 const results=await Promise.all([0,1].map(()=>context.request.post('/api/command',{headers:{origin},data})))
 assert.deepEqual(results.map(result=>result.status()).sort(),[200,409],'only one simultaneous declaration is saved')
 assert.equal((await context.request.post('/api/command',{headers:{origin},data})).status(),409,'a repeated declaration is refused')
 await page.reload()
 const card=page.getByRole('article').filter({has:page.getByRole('heading',{name:title,exact:true})})
 const link=card.getByRole('link',{name:'Open incident: '+title,exact:true})
 await link.waitFor()
 assert.equal(await card.getByRole('button',{name:'Declare incident from alert',exact:true}).count(),0)
 const saved=await (await context.request.get('/api/state')).json()
 assert.equal(saved.incidents.filter(incident=>incident.alerts.includes(alert.id)).length,1)
 await page.screenshot({path:`evidence/browser/alert-linked-incident-${width}.png`,fullPage:true})
 await link.click()
 await page.locator('.detail').getByRole('heading',{name:title,exact:true}).waitFor()
 await page.screenshot({path:`evidence/browser/alert-linked-incident-open-${width}.png`,fullPage:true})
 await page.getByRole('link',{name:'Alerts & events',exact:true}).click()
}
