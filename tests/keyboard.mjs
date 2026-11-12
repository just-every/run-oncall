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
 const createdKey=await create.getByLabel('Private key',{exact:true}).inputValue();assert.ok(createdKey);
 // A newcomer can configure the sender from this confirmation alone: the key ID, the ingress address and a sample that runs as copied.
 const setup=create.getByRole('region',{name:'Sender setup for this key',exact:true}),shots=process.env.ONCALL_BROWSER_EVIDENCE??'../evidence/browser';
 assert.equal(await setup.getByLabel('Key ID',{exact:true}).inputValue(),source.id);
 const url=await setup.getByLabel('Ingress URL',{exact:true}).inputValue();assert.equal(url,origin+'/api/ingress/'+encodeURIComponent('intake:'+source.id));
 const sample=await setup.getByLabel('Sample request',{exact:true}).inputValue();assert.ok(!sample.includes(createdKey),'sample never embeds the secret');assert.ok(sample.includes(JSON.stringify('intake:'+source.id).slice(1,-1)),'sample names the key as its source');
 await context.grantPermissions(['clipboard-read','clipboard-write']);await setup.getByRole('button',{name:'Copy sample request',exact:true}).click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),sample);
 const {spawn}=await import('node:child_process');
 const sent=await new Promise((resolve,reject)=>{const child=spawn('bash',['-e','-o','pipefail','-c',sample],{env:{...process.env,ONCALL_SOURCE_KEY:createdKey}});let out='';child.stdout.on('data',d=>out+=d);child.stderr.resume();child.on('error',reject);child.on('close',code=>code===0?resolve(out):reject(Error('Copied routed-key sample failed: '+code)));});
 assert.ok(JSON.parse(sent).id,'the copied sample is accepted by the new key');
 await mkdir(shots,{recursive:true});for(const shot of [1440,390]){await page.setViewportSize({width:shot,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'sender setup fits '+shot);await page.screenshot({path:shots+'/routed-key-sender-setup-'+shot+'.png',fullPage:true,mask:[page.locator('.one-time-secret input')]});}await page.setViewportSize({width,height:1000});
 await key.activate(create.getByRole('button',{name:'Done',exact:true}));
 await selectRoutedSource(page,source);
 const rules=page.getByRole('region',{name:'Routing rules',exact:true});
 await key.activate(rules.getByText('Per-key rate allowance',{exact:true}));
 const firstSave=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/intake/allowances'&&r.request().method()==='POST');await key.text(rules.getByLabel('Requests per minute',{exact:true}),'500');assert.equal((await firstSave).status(),200);
 const secondSave=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/intake/allowances'&&r.request().method()==='POST');await key.text(rules.getByLabel('New events per minute',{exact:true}),'100');assert.equal((await secondSave).status(),200);
 await key.activate(rules.getByRole('button',{name:'Preview routing changes',exact:true}));await rules.getByText('1 retained events compared. No records changed.',{exact:true}).waitFor();
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
 const rules=page.getByRole('region',{name:'Routing rules',exact:true});
 await rules.waitFor();
 const picker=page.getByLabel('Routed integration',{exact:true});
 if(await picker.count())await picker.selectOption(source.id);
 await rules.getByRole('heading',{name:source.name,exact:true}).waitFor();
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
 async function visibleFocus(locator) {
  assert.ok(await locator.evaluate(element=>{
   const style=getComputedStyle(element)
   return element===document.activeElement&&element.matches(':focus-visible')&&(
    style.outlineStyle!=='none'&&parseFloat(style.outlineWidth)>=2||
    ['INPUT','SELECT','TEXTAREA'].includes(element.tagName)&&style.borderTopStyle!=='none'&&parseFloat(style.borderTopWidth)>=2)
  }),'keyboard focus has a visible outline or thickened field border')
 }
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
  visibleFocus,
  async activate(locator, key='Enter') { await reach(locator);await visibleFocus(locator);await page.keyboard.press(key) },
  async text(locator, value) { await reach(locator);await visibleFocus(locator);await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type(value);await page.keyboard.press('Tab') },
  async calendar(locator, value) {
   await reach(locator);await visibleFocus(locator)
   const type=await locator.getAttribute('type')
   assert.ok(['date','time','datetime-local'].includes(type),'a native calendar or clock field')
   // Chromium's native date order follows the host on macOS even when the
   // context locale is en-US. Inspect the focused native segment; keep all
   // entry and movement on the keyboard rather than filling the ISO value.
   for(let count=0;count<8;count++)await page.keyboard.press('ArrowLeft')
   if(type!=='time') {
    const [year,month,day]=value.slice(0,10).split('-')
    const session=await page.context().newCDPSession(page)
    let nodes
    try {({nodes}=await session.send('Accessibility.getFullAXTree'))} finally {await session.detach()}
    const first=nodes.find(node=>node.role?.value==='spinbutton'&&node.properties?.some(property=>property.name==='focused'&&property.value.value===true))
    const segment=first?.name?.sources?.find(source=>source.attribute==='aria-label'&&!source.superseded)?.value?.value
    assert.ok(['Day','Month'].includes(segment),'the native date editor starts with a day or month segment')
    await page.keyboard.type((segment==='Day'?day+month:month+day)+year)
    if(type==='datetime-local')await page.keyboard.press('ArrowRight')
   }
   if(type!=='date') {
    const [hour,minute]=(type==='time'?value:value.slice(11)).split(':').map(Number)
    await page.keyboard.type(String(hour%12||12).padStart(2,'0')+String(minute).padStart(2,'0')+(hour<12?'AM':'PM'))
   }
   await page.keyboard.press('Tab');assert.equal(await locator.inputValue(),value,'native key input retains the requested date and time')
  },
  async option(locator, value) {
   await reach(locator);await visibleFocus(locator)
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
   await visibleFocus(locator)
   await page.screenshot({path,fullPage:true})
  },
  async dialog(dialog) {
   assert.ok(await dialog.evaluate(element=>element.contains(document.activeElement)),'opening the dialog moves focus inside')
   const controls=dialog.locator('button:enabled:visible,a[href]:visible,input:enabled:visible,select:enabled:visible,textarea:enabled:visible,summary:visible,[tabindex="0"]:visible')
   const first=controls.first(),last=controls.last()
   await reach(last);await visibleFocus(last);await page.keyboard.press('Tab')
   assert.ok(await focused(first),'Tab at the last dialog control wraps to the first')
   await visibleFocus(first);await page.keyboard.press('Shift+Tab')
   assert.ok(await focused(last),'Shift+Tab at the first dialog control wraps to the last')
   await visibleFocus(last)
  },
  async dismiss(dialog,opener) {
   await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'})
   assert.ok(await focused(opener),'Escape returns focus to the dialog opener')
   await visibleFocus(opener)
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
