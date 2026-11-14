import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(join(process.cwd(), 'package.json'));
const { createServer } = await import(pathToFileURL(require.resolve('vite')));
const root = await mkdtemp(join(tmpdir(), 'oncall-vite-smoke-'));
let server;
try {
  await writeFile(join(root, 'index.html'), '<html><body><script type="module" src="/probe.ts"></script></body></html>');
  await writeFile(join(root, 'probe.ts'), 'const value: number = 42; export default value;');
  server = await createServer({ configFile: false, root, server: { host: '127.0.0.1', port: 0 }, logLevel: 'warn' });
  await server.listen();
  const origin = 'http://127.0.0.1:' + server.httpServer.address().port;
  const page = await fetch(origin, { signal: AbortSignal.timeout(20000) });
  assert.equal(page.status, 200);
  assert.match(await page.text(), /@vite\/client/);
  const module = await fetch(origin + '/probe.ts', { signal: AbortSignal.timeout(20000) });
  assert.equal(module.status, 200);
  const emitted = await module.text();
  assert.match(emitted, /42/);
  assert.doesNotMatch(emitted, /: number/);
  const editor = await fetch(origin + '/__open-in-editor', { signal: AbortSignal.timeout(20000) });
  assert.equal(editor.ok, false);
  assert.match(await editor.text(), /required query param.*file.*missing/);
  console.log('PASS Vite public HTTP smoke: injected client, TypeScript transformation and missing-file editor request refusal');
} finally {
  if (server) await server.close();
  await rm(root, { recursive: true, force: true });
}
