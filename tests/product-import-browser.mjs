import assert from 'node:assert/strict'
import {providerExport} from './provider-export-browser.mjs'

export async function productImport(page,context,width,session) {
  await page.getByRole('link',{name:'Move-in kit',exact:true}).click()
  await providerExport(page,context,width)
  const bundle={users:[],schedules:[],overrides:[],escalations:[],timelines:[]}
  await page.getByLabel('Export JSON').setInputFiles('tests/fixtures/opsgenie.json');await page.getByRole('button',{name:'Preview import',exact:true}).click();await page.getByRole('heading',{name:'Compatibility review'}).waitFor()
  assert.ok(await page.getByText(/Eight-hour shift/).count()>0)
  await page.screenshot({path:`evidence/browser/import-review-${width}.png`,fullPage:true})
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'import viewport has no horizontal overflow')
  if(width===1440){await page.getByRole('button',{name:'Confirm paused import',exact:true}).click();await page.getByRole('heading',{name:'Import journal'}).waitFor();await page.getByRole('button',{name:'Undo this import',exact:true}).click();await page.locator('[role="status"] p').filter({hasText:/undone/}).waitFor()}
  // Follow the bundle instructions through paused import, explicit adoption, native coverage and erasure.
  const email=`erase-${width}@example.test`,rota=`Move-in rota ${width}`,personId='erase-'+width
  bundle.users.push({data:[{id:personId,username:email,fullName:'Erase '+width}]})
  bundle.schedules.push({data:{id:'move-in-'+width,name:rota,timezone:'UTC',rotations:[{name:'Weekly',startDate:'2026-10-12T09:00:00Z',type:'weekly',length:1,participants:[{type:'user',id:personId}]}]}})
  await page.getByLabel('Export JSON').setInputFiles({name:'opsgenie-export.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bundle))})
  await page.getByRole('button',{name:'Preview import',exact:true}).click();await page.getByRole('heading',{name:'Compatibility review'}).waitFor()
  await page.getByRole('button',{name:'Confirm paused import',exact:true}).click();await page.getByRole('heading',{name:'Import journal'}).waitFor()
  const imported=page.getByRole('listitem').filter({hasText:rota}).last()
  await imported.getByRole('button',{name:'Make schedule live',exact:true}).click()
  await imported.getByLabel('Service for '+rota,{exact:true}).selectOption({label:'Checkout'})
  await imported.getByLabel('Workspace member for Erase '+width,{exact:false}).selectOption(session.member.id)
  await imported.getByRole('button',{name:'Confirm live schedule · paging OFF',exact:true}).click()
  await page.getByRole('listitem').filter({hasText:rota}).getByRole('link',{name:'Schedules',exact:true}).click()
  const adoptedOption=page.getByLabel('Schedule',{exact:true}).locator('option').filter({hasText:rota});await adoptedOption.waitFor({state:'attached'})
  await page.getByLabel('Schedule',{exact:true}).selectOption(await adoptedOption.getAttribute('value'))
  assert.equal(await page.getByLabel('Schedule name',{exact:true}).inputValue(),rota,'adopted coverage opens as a native schedule')
  assert.equal(await page.getByLabel('Primary responder 1',{exact:true}).inputValue(),session.member.id,'explicit person mapping survives adoption')
  await page.getByRole('link',{name:'Move-in kit',exact:true}).click()
  const person=page.getByRole('listitem').filter({hasText:`user: Erase ${width}`})
  await person.getByRole('button',{name:'Erase person',exact:true}).click()
  const typed=page.getByLabel(`Type "erase ${email}" to erase this person from imported data`);assert.equal(await person.getByRole('button',{name:'Erase permanently',exact:true}).isDisabled(),true,'erasing needs the typed confirmation')
  await typed.fill('erase '+email)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'erase control has no horizontal overflow')
  await page.screenshot({path:`evidence/browser/erase-person-${width}.png`,fullPage:true})
  await person.getByRole('button',{name:'Erase permanently',exact:true}).click()
  await page.getByText(/^Erased\. Receipt /).waitFor();assert.equal(await person.count(),0,'the erased person leaves the paused data list')
}
