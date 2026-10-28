import {mkdir} from 'node:fs/promises'
import assert from 'node:assert/strict'
// routing-browser: part of this public journey.
export async function routingBrowser(page,context,width) {
 const key=keyboardUser(page),origin=new URL(page.url()).origin;
 await openWorkspaceSection(page,'routing');
 const create=page.locator('.routing-create');
 if(!await create.getByLabel('Name',{exact:true}).isVisible())await key.activate(create.locator(':scope > summary'));
 await key.text(create.getByLabel('Name',{exact:true}),'Checkout monitor '+width);
 await key.option(create.getByLabel('Provider',{exact:true}),'native');
 await key.option(create.getByLabel('Authentication',{exact:true}),'signed');
 await key.activate(create.getByRole('checkbox').first(),'Space');
 const createdResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/routing/keys'&&r.request().method()==='POST');
 await key.activate(create.getByRole('button',{name:'Create routed key',exact:true}));
 const response=await createdResponse;assert.equal(response.status(),201);const source=await response.json();
 const createdKey=await create.getByLabel('Private key',{exact:true}).inputValue();assert.ok(createdKey);await key.activate(create.getByRole('button',{name:'Done',exact:true}));
 await selectRoutedSource(page,source);
 const rules=page.getByRole('region',{name:'Routing rules',exact:true});
 await key.activate(rules.getByText('Per-key rate allowance',{exact:true}));
 const firstSave=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/intake/allowances'&&r.request().method()==='POST');await key.text(rules.getByLabel('Requests per minute',{exact:true}),'500');assert.equal((await firstSave).status(),200);
 const secondSave=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/intake/allowances'&&r.request().method()==='POST');await key.text(rules.getByLabel('New events per minute',{exact:true}),'100');assert.equal((await secondSave).status(),200);
 await key.activate(rules.getByRole('button',{name:'Preview routing changes',exact:true}));await rules.getByText('No retained events yet.',{exact:false}).waitFor();
 const evidence=process.env.ONCALL_BROWSER_EVIDENCE??'../evidence/browser';await mkdir(evidence,{recursive:true});await rules.screenshot({path:evidence+'/native-routing-empty-'+width+'.png'});
 // Keep the stale-write refusal: draft, open its confirmation, then publish a competing version.
 await rules.getByLabel('Catch-all for unmatched events',{exact:true}).selectOption(source.routing.scope[0]);await rules.getByRole('button',{name:'Publish version 2',exact:true}).click();
 const published=await context.request.post('/api/routing/keys/'+source.id+'/publish',{headers:{origin},data:{baseVersion:1,rules:[],catchAll:source.routing.scope[0]}});assert.equal(published.status(),201);
 await rules.getByRole('button',{name:'Publish version 2',exact:true}).last().click();await page.getByRole('alert').filter({hasText:'Routing base version is stale'}).waitFor();await page.screenshot({path:evidence+'/native-routing-stale-'+width+'.png',fullPage:true});
 await page.reload();await selectRoutedSource(page,source);assert.equal(await page.locator('input').evaluateAll((inputs,key)=>inputs.some(input=>input.value===key),createdKey),false);
 await key.activate(rules.getByText('Rotate or revoke this key',{exact:true}));await key.activate(rules.getByRole('button',{name:'Rotate routed key',exact:true}));await key.activate(rules.getByRole('button',{name:'Rotate key now',exact:true}));await page.getByRole('status').filter({hasText:'Routed key rotated'}).waitFor();assert.ok(await rules.getByLabel('Private key',{exact:true}).inputValue());await key.activate(rules.getByRole('button',{name:'Done',exact:true}));
 await key.activate(rules.getByRole('button',{name:'Revoke routed key',exact:true}));await key.activate(rules.getByRole('button',{name:'Revoke key now',exact:true}));await page.getByRole('status').filter({hasText:'Routed key revoked'}).waitFor();assert.ok(await rules.getByRole('button',{name:'Revoke routed key',exact:true}).isDisabled());
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await rules.screenshot({path:evidence+'/native-routing-revoked-'+width+'.png'});
}

export async function openHistoryComparison(page) {
 const panel=page.getByRole('dialog',{name:'Compare with history',exact:true});
 if(!await panel.isVisible()) {
  const compared=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/replay'&&r.request().method()==='POST');await page.getByRole('button',{name:'Compare with history',exact:true}).click();assert.equal((await compared).status(),200);await panel.getByRole('region',{name:'Replay comparison',exact:true}).waitFor();
 }
 if(!await panel.getByLabel('Event JSON',{exact:true}).isVisible())await panel.getByText('Paste your own events',{exact:true}).click();
}

export async function selectRoutedSource(page,input) {
 const source=typeof input==='string'?await page.evaluate(async id=>{const response=await fetch('/api/state');if(!response.ok)throw Error('Current routing sources could not be read');return ((await response.json()).intakeSources??[]).find(row=>row.id===id)},input):input;
 assert.ok(source,'the requested routed source is retained');
 const picker=page.getByLabel('Routed integration',{exact:true});
 if(await picker.count())await picker.selectOption(source.id);
 await page.getByRole('region',{name:'Routing rules',exact:true}).getByRole('heading',{name:source.name,exact:true}).waitFor();
}


export async function focusWorkspace(page) {
 const [response]=await Promise.all([
  page.waitForResponse(response=>new URL(response.url()).pathname==='/api/workspace'&&response.request().method()==='GET'),
  page.evaluate(()=>window.dispatchEvent(new Event('focus'))),
 ])
 assert.equal(response.status(),200,'returning to the workspace fetches current state')
 await response.finished()
}

/** Reach controls only through the browser's native tab order. Locators inspect;
 * they never click, focus, fill or select on this keyboard journey. */
export function keyboardUser(page) {
 const focused = locator => locator.evaluate(element => element === document.activeElement)
 async function reach(locator, backwards = false) {
  await locator.waitFor({state:'visible'})
  for(let count=0;count<240;count++) {
   if(await focused(locator)) return
   await page.keyboard.press(backwards?'Shift+Tab':'Tab')
  }
  throw Error('Control is unreachable through native tab order')
 }
 return {
  reach,
  async activate(locator, key='Enter') { await reach(locator);await page.keyboard.press(key) },
  async text(locator, value) { await reach(locator);await page.keyboard.press('ControlOrMeta+A');await page.keyboard.insertText(value);await page.keyboard.press('Tab') },
  async option(locator, value) {
   await reach(locator)
   const options=await locator.locator('option').evaluateAll(items=>items.map(item=>({value:item.value,label:item.label}))),option=options.find(item=>item.value===value)
   assert.ok(option,'native select contains intended option')
   // Repeating the initial character cycles native options with the same prefix.
   // Keep this to key events: type(label) inserts non-keyboard characters (such
   // as a middle dot) through the text editor rather than select typeahead.
   const character=[...option.label.trimStart()][0]
   assert.ok(character,'native select option has a typeahead character')
   for(let count=0;count<options.length;count++) {
    await page.keyboard.press(character)
    if(await locator.inputValue()===value)break
   }
   await page.keyboard.press('Tab');assert.equal(await locator.inputValue(),value)
  },
  async focusScreenshot(locator,path) {
   await reach(locator,true)
   assert.ok(await locator.evaluate(element=>element.matches(':focus-visible')&&getComputedStyle(element).outlineStyle!=='none'&&parseFloat(getComputedStyle(element).outlineWidth)>0),'keyboard focus is visibly outlined')
   await page.screenshot({path,fullPage:true})
  },
 }
}

/** Follow an incident action through its one menu and its own sheet. */
export async function openIncidentAction(page, name) {
 await page.getByRole('button',{name:'Incident actions',exact:true}).click()
 await page.getByRole('menuitem',{name,exact:true}).click()
 return page.getByRole('dialog',{name,exact:true})
}

/** Open a section through the current rail or the phone Menu sheet. */
export async function openWorkspaceSection(page, section, {keyboard = false} = {}) {
 await page.locator('.oncall-frame').waitFor({state:'visible'})
 const paths={incidents:'/incidents',alerts:'/alerts',reviews:'/reviews',status:'/status',schedules:'/on-call','on-call':'/on-call',services:'/settings/services',integrations:'/settings/integrations',routing:'/settings/routing',team:'/settings/team','move-in':'/settings/move-in',archive:'/settings/archive'}
 const path=paths[section]
 assert.ok(path,'workspace section has a destination')
 const key=keyboardUser(page),activate=async control=>keyboard?key.activate(control):control.click()
 const phone=await page.getByRole('button',{name:'Menu',exact:true}).isVisible()
 if(phone) {
  await activate(page.getByRole('button',{name:'Menu',exact:true}))
  const sheet=page.getByRole('dialog',{name:'Menu',exact:true})
  if(path.startsWith('/settings/')&&!await sheet.locator(`a[href="${path}"]`).isVisible()) await activate(sheet.getByRole('button',{name:'Settings',exact:true}))
  if(!path.startsWith('/settings/')&&!await sheet.locator(`a[href="${path}"]`).isVisible()) await activate(sheet.getByRole('button',{name:'‹ Oncall',exact:true}))
  await activate(sheet.locator(`nav a[href="${path}"]`))
 } else {
  const rail=page.locator('.shell-rail')
  if(path.startsWith('/settings/')&&!await rail.locator(`nav a[href="${path}"]`).isVisible()) await activate(rail.locator('a[href="/settings/services"]'))
  if(!path.startsWith('/settings/')&&!await rail.locator(`nav a[href="${path}"]`).isVisible()) await activate(rail.locator('.settings-back'))
  await activate(rail.locator(`nav a[href="${path}"]`))
 }
 await page.waitForURL(url=>url.pathname===path)
}
