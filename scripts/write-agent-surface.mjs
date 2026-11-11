import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { scopedSurface } from '../src/modules/agent-door/conformance/subset.mjs';
import { validateAgentSurface } from '../src/modules/agent-door/conformance/surface.mjs';

const start = '[native-tool-inventory-start]: #', end = '[native-tool-inventory-end]: #';
const code = text => '`' + text + '`';

function inventory(surface) {
  const exposed = scopedSurface(surface);
  const validation = validateAgentSurface(surface);
  if (!validation.ok) throw new Error(validation.points.filter(point => !point.ok).map(point => point.detail).join('\n'));
  const test = 'tests/agent-door.mjs';
  let previousJob;
  const rows = exposed.tools.flatMap(tool => {
    const job = tool.name.split('.')[1];
    const heading = job === previousJob ? [] : ['', `### ${job[0].toUpperCase() + job.slice(1)}`, '',
      '| Tool | Scope | Possible risk classes | Computed class checks |', '| --- | --- | --- | --- |'];
    previousJob = job;
    const checks = tool.classes.map(cls => {
      const steps = exposed.journey.filter(step => step.tool === tool.name && step.expect.some(item => item.class === cls));
      if (!steps.length) throw new Error(`${tool.name} has no maintained fixture for ${cls}`);
      return `${code(cls)}: ${code(test)} (${steps.map(step => code(step.id)).join(', ')})`;
    });
    return [...heading, `| ${code(tool.name)} | ${code(tool.scope)} | ${tool.classes.map(code).join(', ')} | ${checks.join('; ')} |`];
  });
  const withheld = surface.tools.filter(tool => !exposed.tools.some(item => item.name === tool.name));
  return [start, '## Current tool inventory', '',
    'This inventory is generated from the native registry with the current capability filter. Each row names the required scope and every possible class. Company policy still decides each call.', '',
    'The fixture IDs below belong to `agent-surface.json`. `tests/agent-door.mjs` executes them through emitted Worker MCP under autonomous and held policies; `src/modules/agent-door/conformance/journey.mjs` checks the returned computed classes in `checkClasses`. A fixture reference describes coverage to run, not a passing receipt.', '',
    ...rows, '',
    '## Current resource templates', '',
    ...(exposed.resources.length ? exposed.resources.map(uri => `- ${code(uri)}`) : ['No resource templates are exposed. The template listing is empty because resources are undeclared.']), '',
    '## Target capabilities', '',
    ...withheld.map(tool => `${code(tool.name)} is retained in the source manifest with scope ${code(tool.scope)} and possible classes ${tool.classes.map(code).join(', ')}, but is withheld from the current tool listing. Its target fixture is not current execution evidence.`), '',
    'The source manifest retains native resource targets; they are not exposed templates. Events are declared for retained cursor reads. Resources, prompts and subscriptions remain undeclared. Unshipped target tools and their class documentation remain contract work. This inventory does not claim complete discovery instructions, the full harness rejection matrix, every acceptance point under both policies, or stranger-agent completion.', end].join('\n');
}

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
    const nextSurface = { ...surface, ...declarations };
    const manifest = JSON.stringify(nextSurface, null, 2) + '\n';
    const guidePath = resolve(root, 'docs/agents.md');
    const guide = await readFile(guidePath, 'utf8');
    const section = inventory(nextSurface);
    const before = guide.indexOf(start), after = guide.indexOf(end);
    if (before < 0 || after < before) throw new Error('Native tool inventory guide markers are missing');
    const nextGuide = guide.slice(0, before) + section + guide.slice(after + end.length);
    if (process.argv.slice(2).includes('--check')) {
      if (manifest !== await readFile(target, 'utf8') || guide !== nextGuide) throw new Error('Agent manifest or guide is stale; run node scripts/write-agent-surface.mjs');
      console.log('Native agent manifest and complete exposed guide inventory are fresh');
    } else {
      await writeFile(target, manifest);
      await writeFile(guidePath, nextGuide);
      console.log('Updated agent-surface.json and complete exposed guide inventory from native Worker declarations');
    }
  }
} finally {
  try { await runtime?.dispose(); } finally { await rm(directory, { recursive: true, force: true }); }
}
