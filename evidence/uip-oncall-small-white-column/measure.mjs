import {createRequire} from 'node:module'
import fs from 'node:fs'
const repo='/Users/zemaj/www/rer-consolidation/work/uip-oncall-small-white-column/repo'
const require=createRequire(repo+'/package.json')
const {chromium}=require('@playwright/test')
const [,, base, openLink, phase]=process.argv
const out=`${repo}/evidence/uip-oncall-small-white-column/${phase}`
fs.mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
const sizes=[[1440,900],[390,844]]
const ctx=await browser.newContext({viewport:{width:1440,height:900}})
const page=await ctx.newPage()
await page.goto(openLink); await page.waitForLoadState('networkidle')
let paths=['/on-call','/incidents','/alerts','/reviews','/status','/settings/services','/settings/integrations','/settings/routing','/settings/team','/settings/move-in','/settings/readiness','/settings/archive']
// find an incident record
await page.goto(base+'/incidents'); await page.waitForLoadState('networkidle')
await page.getByText('Checkout errors in eu-west').first().click(); await page.waitForURL(/\/incidents\/.+/); const rec=new URL(page.url()).pathname
if(rec) paths.push(rec)
const rows=[]
for(const [w,h] of sizes){
  await page.setViewportSize({width:w,height:h})
  for(const p of paths){
    await page.goto(base+p); await page.waitForLoadState('networkidle'); await page.waitForTimeout(600)
    const pt = w>900 ? {x:w-12,y:Math.round(h/2)} : {x:2,y:Math.round(h/2)}
    const info=await page.evaluate(({x,y})=>{
      const chain=document.elementsFromPoint(x,y).map(e=>{const s=getComputedStyle(e);return {tag:e.tagName.toLowerCase()+(e.className&&typeof e.className==='string'?'.'+e.className.split(' ')[0]:''),bg:s.backgroundColor,img:s.backgroundImage==='none'?'':s.backgroundImage.slice(0,40)}})
      const ws=document.querySelector('.workspace'); const wr=ws&&ws.getBoundingClientRect()
      const wsBg=ws&&getComputedStyle(ws).backgroundColor
      return {chain,ws:wr&&{x:Math.round(wr.x),w:Math.round(wr.width)},wsBg,bodyBg:getComputedStyle(document.body).backgroundColor,htmlBg:getComputedStyle(document.documentElement).backgroundColor}
    },pt)
    const shot=`${out}/${p.replace(/\//g,'_').replace(/^_/,'')||'root'}-${w}.png`
    await page.screenshot({path:shot,fullPage:false})
    // pixel at point
    const buf=await page.screenshot({clip:{x:pt.x,y:pt.y,width:1,height:1}})
    const px=await page.evaluate(async b64=>{const i=new Image();i.src='data:image/png;base64,'+b64;await i.decode();const c=document.createElement('canvas');c.width=c.height=1;const g=c.getContext('2d');g.drawImage(i,0,0);return [...g.getImageData(0,0,1,1).data].slice(0,3).join(',')},buf.toString('base64'))
    // effective painted colour
    const eff=info.chain.find(c=>c.bg!=='rgba(0, 0, 0, 0)'||c.img)
    rows.push({w,path:p,effective:eff?(eff.bg+(eff.img?' +'+eff.img:'')+' @'+eff.tag):'none',pixel:`rgb(${px})`,wsBg:info.wsBg,body:info.bodyBg})
  }
}
for(const r of rows) console.log(`${r.w}\t${r.path}\tpixel=${r.pixel}\teffective=${r.effective}\tworkspaceBg=${r.wsBg}`)
fs.writeFileSync(`${out}/measure.json`,JSON.stringify(rows,null,1))
await browser.close()
