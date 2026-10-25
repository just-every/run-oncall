import assert from 'node:assert/strict'

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
   // A field shows focus on its own border (an unfocused twin of it shows the border at rest);
   // every other control draws an outline.
   assert.ok(await locator.evaluate(element=>{
    if(!element.matches(':focus-visible'))return false
    const style=getComputedStyle(element)
    if(style.outlineStyle!=='none'&&parseFloat(style.outlineWidth)>0)return true
    if(!element.matches('input:not([type=checkbox],[type=radio]),select,textarea'))return false
    const twin=element.cloneNode(false);twin.removeAttribute('id');twin.setAttribute('aria-hidden','true');twin.tabIndex=-1;twin.style.position='absolute';twin.style.visibility='hidden'
    element.after(twin);const rest=getComputedStyle(twin)
    const own=style.borderTopColor!==rest.borderTopColor||style.borderTopWidth!==rest.borderTopWidth||style.boxShadow!==rest.boxShadow
    const shown=style.borderTopStyle!=='none'&&!/rgba\(.*, 0\)$/.test(style.borderTopColor)
    twin.remove();return own&&shown
   }),'keyboard focus is visibly outlined or shown on the field\'s own border')
   await page.screenshot({path,fullPage:true})
  },
 }
}
