import { chromium } from '/workspace/run-oncall/node_modules/@playwright/test/index.mjs';
import { marked } from '/workspace/run-oncall/node_modules/marked/lib/marked.esm.js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import http from 'node:http';
import { resolve, extname } from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const repo='/workspace/run-oncall', root=resolve(repo,'dist/site');
const packet=process.env.HOME+'/rer-consolidation/work/main-oncall-run-docs-1/packet';
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
const readme=await readFile(repo+'/README.md','utf8');
const local=readme.slice(readme.indexOf('# Run it locally'),readme.indexOf('Oncall keeps rotas,'));
const host=readme.slice(readme.indexOf('### Host for your team'),readme.indexOf('The deploying owner can recover'));
const html='<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>README changed sections</title><style>body{box-sizing:border-box;max-width:900px;margin:0 auto;padding:24px;font:16px/1.6 Arial,sans-serif;color:#202020}h1,h2,h3{line-height:1.25}a{color:#0969da}code{font-size:.9em;overflow-wrap:anywhere}pre{padding:16px;background:#f6f8fa;overflow:auto;border-radius:6px}pre code{overflow-wrap:normal}p,li{overflow-wrap:anywhere}</style><main>'+marked.parse(local+'\n\n'+host)+'</main>';
await writeFile(packet+'/readme-rendered-sections.html',html);
const server=http.createServer(async(req,res)=>{
 try {
  if(req.url==='/README-preview'){res.setHeader('Content-Type','text/html');res.end(html);return;}
  let path=decodeURIComponent(req.url.split('?')[0]);
  if(path==='/')path='/index.html';
  if(!extname(path))path+='.html';
  const file=resolve(root,'.'+path);
  if(!file.startsWith(root+'/'))throw Error('outside root');
  res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.woff2':'font/woff2'})[extname(file)]??'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const port=server.address().port;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const rows=[];
try {
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:1});
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:'+port+'/README-preview');
  await page.screenshot({path:packet+'/readme-'+width+'.png',fullPage:true});
  const readmeMetrics=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,codeBlocks:[...document.querySelectorAll('pre')].map(e=>({width:e.clientWidth,scroll:e.scrollWidth}))}));
  if(width===1440)assert(readmeMetrics.document<=width,'README document fits desktop viewport');
  rows.push({screen:'README changed sections (local Markdown preview, not GitHub)',width,...readmeMetrics,screenshot:'readme-'+width+'.png'});
  await page.goto('http://127.0.0.1:'+port+'/docs/getting-started');
  await page.evaluate(()=>document.fonts.ready);
  const section=await page.evaluate(()=>{
   const heading=document.getElementById('4-deploy-and-test-sign-in');
   const next=document.getElementById('owner-access-without-email');
   if(!heading||!next)throw Error('Missing deploy section anchors');
   return {y:Math.max(0,Math.floor(heading.getBoundingClientRect().top+scrollY-20)),end:Math.ceil(next.getBoundingClientRect().top+scrollY),viewport:innerWidth,document:document.documentElement.scrollWidth};
  });
  if(width===1440)assert(section.document<=width,'Built getting-started page fits desktop viewport');
  await page.screenshot({path:packet+'/getting-started-'+width+'.png',fullPage:true,clip:{x:0,y:section.y,width,height:section.end-section.y}});
  rows.push({screen:'Actual built /docs/getting-started, deployment section',width,...section,screenshot:'getting-started-'+width+'.png'});
  await context.close();
 }
 await writeFile(packet+'/browser-receipt.json',JSON.stringify({head,browser:'system Chromium /usr/bin/chromium --no-sandbox',assertionWidth:1440,rows},null,2)+'\n');
 console.log(JSON.stringify({head,rows},null,2));
} finally {
 await browser.close();
 await new Promise(r=>server.close(r));
}
