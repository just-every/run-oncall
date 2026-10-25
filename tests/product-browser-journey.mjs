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
