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
import {oncallTools,oncallNotTools} from './src/agent-door/index.server.ts';
import {oncallResources} from './src/agent-door/resources.ts';
export default {fetch(request,env){
 if(new URL(request.url).pathname!=='/declaration')return new Response(null,{status:404});
 const tools=oncallTools(env).map(({name,scope,readOnly,classes,clauses,widens,narrowing,inputSchema})=>({name,scope,readOnly,classes,clauses,...(widens===false?{widens,narrowing,inputSchema}:{})}));
 tools.push({name:'oncall.events.list',scope:'events:read',readOnly:true,classes:['standard'],clauses:['BASE-AGENT-010']});
 return Response.json({tools:tools.sort((a,b)=>a.name.localeCompare(b.name)),resources:oncallResources(env).map(resource=>resource.uriTemplate).sort(),notTools:oncallNotTools});
}};` } });
  runtime = new Miniflare(convertV4MiniflareOptions({ host: '127.0.0.1', port: 0, cf: false,
    modules: true, scriptPath: worker, compatibilityDate: '2026-09-01', compatibilityFlags: ['nodejs_compat'],
    d1Databases: { DB: 'agent-declaration' }, outboundService: () => new Response(null, { status: 502 }) }));
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
    console.log('Updated agent-surface.json from native Worker declarations');
  }
} finally {
  try { await runtime?.dispose(); } finally { await rm(directory, { recursive: true, force: true }); }
}
