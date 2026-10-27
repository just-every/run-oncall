import {openWorkspaceSection} from './keyboard.mjs'
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {keyboardUser} from './keyboard.mjs';

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

async function selectRoutedSource(page,source) {
 const picker=page.getByLabel('Routed integration',{exact:true});
 if(await picker.count())await picker.selectOption(source.id);
 await page.getByRole('region',{name:'Routing rules',exact:true}).getByRole('heading',{name:source.name,exact:true}).waitFor();
}
