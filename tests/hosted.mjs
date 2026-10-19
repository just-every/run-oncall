import assert from 'node:assert/strict'
import {readdir,readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {serveHosted} from '@runeditrun/rer/internal/cli/hosted-output.mjs'

// Every page or file the app links, and every built HTML file, must answer when the build is served
// the way rer deploy hosts it (the Worker runs before the static assets). A link that redirects and
// then falls through to the app's 404 fails here, whichever file it names.
const walk=async dir=>(await Promise.all((await readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]))).flat()
const links=new Set;for(const file of (await walk('src')).filter(f=>/\.tsx$/.test(f)))for(const m of (await readFile(file,'utf8')).matchAll(/href="(\/[^"#?]+)"/g))links.add(m[1])
for(const file of (await walk('dist/client')).filter(f=>f.endsWith('.html')))links.add(file.slice('dist/client'.length))
assert.ok(links.size>0,'the app links at least one built file')
const hosted=await serveHosted(process.cwd())
try{
 const health=await hosted.fetch('health');assert.equal(health.status,200)
 const body=await health.json();assert.equal(body.ok,true);assert.equal(body.storage,'available');assert.equal(body.target,'coordination');assert.equal(body.paging,'not-provided')
 assert.deepEqual(body.deployment,hosted.identity,'the built hosted Worker reports the exact supplied source, fingerprint and version identity')
 console.log('OC-010 hosted-mode production output: deployment identity matches; no provider deployment, delivery, drill or capacity result inferred')
 for(const link of links) {
  let path=link.slice(1),status
  for(let hop=0;hop<3;hop++){const r=await hosted.fetch(path);await r.arrayBuffer();status=r.status;const next=r.headers.get('location');if(status<300||status>=400||!next)break;path=next.replace(/^\//,'')}
  assert.equal(status,200,`${link} must answer 200 when hosted (ended at ${status})`)
 }
 const old=await hosted.fetch('move-in-guide');await old.arrayBuffer();assert.equal(old.headers.get('location'),'/docs/move-in','the old guide link leads to the docs page')
 const guide=await (await hosted.fetch('docs/move-in')).text();assert.match(guide,/Move in from Opsgenie or PagerDuty/)
 console.log(`Hosted links passed: ${links.size} linked page or file(s) answer 200 through the hosted Worker`)
}finally{await hosted.close()}
