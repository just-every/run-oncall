import {createRequire} from 'node:module'
const repo='/Users/zemaj/www/rer-consolidation/work/uip-oncall-small-white-column/repo'
const {chromium}=createRequire(repo+'/package.json')('@playwright/test')
const [,, base, openLink]=process.argv
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
const page=await (await browser.newContext({viewport:{width:1440,height:900}})).newPage()
await page.goto(openLink); await page.waitForLoadState('networkidle')
const paths=['/on-call','/incidents','/alerts','/reviews','/status','/settings/services','/settings/integrations','/settings/routing','/settings/team','/settings/move-in','/settings/readiness','/settings/archive']
await page.goto(base+'/incidents'); await page.getByText('Checkout errors in eu-west').first().click(); await page.waitForURL(/\/incidents\/.+/); paths.push(new URL(page.url()).pathname)
let worst=[],bare=new Map()
for(const w of [1440,390]){ await page.setViewportSize({width:w,height:w==390?844:900})
 for(const p of paths){ await page.goto(base+p); await page.waitForLoadState('networkidle'); await page.waitForTimeout(400)
  const r=await page.evaluate(()=>{
   const parse=c=>{const m=c.match(/[\d.]+/g).map(Number);return {r:m[0],g:m[1],b:m[2],a:m[3]??1}}
   const lum=({r,g,b})=>{const f=v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4};return .2126*f(r)+.7152*f(g)+.0722*f(b)}
   const ws=document.querySelector('.workspace'); const out={low:[],bare:[]}
   // effective bg of element: walk up to first opaque bg; return {rgb, whiteDirect}
   const effBg=e=>{for(let n=e;n;n=n.parentElement){const s=getComputedStyle(n);const c=parse(s.backgroundColor);if(c.a>0.99)return {c,node:n}}return {c:{r:255,g:255,b:255},node:null}}
   for(const e of ws.querySelectorAll('*')){
     const s=getComputedStyle(e)
     const hasText=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())
     if(hasText&&s.visibility!=='hidden'&&e.getClientRects().length){
       const {c,node}=effBg(e); if(node===ws){const fg=parse(s.color);const L1=lum(fg),L2=lum(c);const ratio=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);const big=parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.66&&+s.fontWeight>=700);if(ratio<(big?3:4.5))out.low.push(`${e.tagName}.${e.className} "${e.textContent.trim().slice(0,30)}" ${s.color} ${ratio.toFixed(2)}`)}
     }
     // surfaces on white: own opaque bg that's cream-ish (not white) and has no visible border
     const c=parse(s.backgroundColor)
     if(c.a>0.99&&e.getClientRects().length&&!['BUTTON','INPUT','SELECT','TEXTAREA'].includes(e.tagName)){
       const par=effBg(e.parentElement); const bw=['Top','Right','Bottom','Left'].map(k=>parseFloat(s['border'+k+'Width'])>0&&s['border'+k+'Style']!=='none')
       if(par.node===ws&&!bw.every(Boolean)&&(e.getBoundingClientRect().width>60)) out.bare.push(`${e.tagName}.${(e.className+'').split(' ')[0]} bg=${s.backgroundColor} border=${bw.join('/')}`)
     }
   }
   return out})
  r.low.forEach(x=>worst.push(`${w} ${p} ${x}`)); r.bare.forEach(x=>bare.set(`${x}`,(bare.get(x)||[]).concat(w+p)))
 }}
console.log('LOW CONTRAST on white:',worst.length);worst.slice(0,40).forEach(x=>console.log(' ',x))
console.log('SURFACES ON WHITE WITHOUT FULL BORDER:');for(const [k,v] of bare)console.log(' ',k,v.length,'e.g.',v[0])
await browser.close()
