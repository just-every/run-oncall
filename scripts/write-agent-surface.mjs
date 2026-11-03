import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Read production declarations inside an actual disposable Worker. There is no
// Node emulation of cloudflare:workers, fake D1 adapter or application fixture.
const root = process.cwd(), require = createRequire(join(root, 'package.json'));
const wrangler = require.resolve('wrangler/package.json');
const dependency = createRequire(wrangler);
const { build } = await import(pathToFileURL(dependency.resolve('esbuild')));
const { Miniflare, convertV4MiniflareOptions } = await import(pathToFileURL(dependency.resolve('miniflare')));
const directory = await mkdtemp(join(tmpdir(), 'oncall-agent-declaration-'));
let runtime;
try {
  const worker = join(directory, 'declaration.mjs');
  await build({ bundle: true, format: 'esm', platform: 'neutral', target: 'es2023', outfile: worker,
    external: ['cloudflare:*', 'node:*'], conditions: ['workerd', 'worker', 'browser'], logLevel: 'silent',
    stdin: { resolveDir: root, sourcefile: 'agent-declaration.worker.ts', contents: `
export default {async fetch(request,env){
 if(new URL(request.url).pathname!=='/declaration')return new Response(null,{status:404});
 const {oncallTools,oncallNotTools,oncallCapabilities}=await import('./src/agent-door/index.server.ts');
 const {oncallResources}=await import('./src/agent-door/resources.ts');
 // Both teammate-role and public-team edits require an active native admin.
 // That sponsor already has all native role/coverage authority; these edits
 // cannot widen it. Erasure only removes authority and cannot promote its sponsor.
 // Other-person widening and narrowing remain in the journey.
 const tools=oncallTools(env).map(({name,scope,readOnly,classes,clauses,widens,narrowing,inputSchema})=>({name,scope,readOnly,classes,clauses,...(widens===false?{widens,narrowing,inputSchema}:{}),...(['oncall.access.update','oncall.teams.update','oncall.privacy.erase'].includes(name)?{sponsorEscalation:false}:{})}));
 tools.push({name:'oncall.events.list',scope:'events:read',readOnly:true,classes:['standard'],clauses:['BASE-AGENT-010']});
 return Response.json({capabilities:oncallCapabilities,tools:tools.sort((a,b)=>a.name.localeCompare(b.name)),resources:oncallResources(env).map(resource=>resource.uriTemplate).sort(),notTools:oncallNotTools});
}};` } });
  runtime = new Miniflare(convertV4MiniflareOptions({ host: '127.0.0.1', port: 0, cf: false,
    workers:[{name:'declaration',modules:[{type:'ESModule',path:worker}],modulesRoot:directory,
      compatibilityDate:'2026-09-01',compatibilityFlags:['nodejs_compat'],bindings:{AUTH_ORIGIN:'https://agent-declaration.invalid'},
      d1Databases:{DB:'agent-declaration'},outboundService:()=>new Response(null,{status:502})}],
  }));
  const response = await runtime.dispatchFetch('https://agent-declaration.invalid/declaration');
  if (!response.ok) throw new Error('Native agent declarations did not load');
  const declarations = await response.json();
  const output = JSON.stringify(declarations, null, 2) + '\n';
  if (Buffer.byteLength(output) > 128 * 1024) throw new Error('Agent declaration output exceeds its bounded metadata size');
  if (process.argv.slice(2).includes('--stdout')) process.stdout.write(output);
  else {
    const target = resolve(root, 'agent-surface.json');
    const surface = JSON.parse(await readFile(target, 'utf8'));
    await writeFile(target, JSON.stringify({ ...surface, ...declarations }, null, 2) + '\n');
    const guidePath = resolve(root, 'docs/agents.md');
    const guide = await readFile(guidePath, 'utf8');
    const start = '<!-- native-resolution-classes:start -->', end = '<!-- native-resolution-classes:end -->';
    const resolution = declarations.tools.find(tool => tool.name === 'oncall.incidents.resolve');
    const update = declarations.tools.find(tool => tool.name === 'oncall.incidents.update');
    if (!resolution) throw new Error('Native resolution declaration is missing');
    const section = [start, '| Tool | Possible risk classes |', '| --- | --- |',
      '| ' + '\x60' + resolution.name + '\x60' + ' | ' + resolution.classes.map(cls => '\x60' + cls + '\x60').join(', ') + ' |',
      '| ' + '\x60' + update.name + '\x60' + ' | ' + update.classes.map(cls => '\x60' + cls + '\x60').join(', ') + ' |', end].join('\n');
    const before = guide.indexOf(start), after = guide.indexOf(end);
    if (before < 0 || after < before) throw new Error('Native resolution guide markers are missing');
    await writeFile(guidePath, guide.slice(0, before) + section + guide.slice(after + end.length));
    console.log('Updated agent-surface.json and native resolution guide from native Worker declarations');
  }
} finally {
  try { await runtime?.dispose(); } finally { await rm(directory, { recursive: true, force: true }); }
}
