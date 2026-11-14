import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const { automationRuntime } = await import(pathToFileURL(resolve('tests/worker.mjs')));
const app = await automationRuntime();
try {
  for (const path of ['/', '/health', '/signin']) {
    const response = await fetch(app.origin + path, { signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200, path);
    assert.ok((await response.text()).length > 0, path);
  }
  console.log('PASS Emitted Worker homepage, health and sign-in HTTP smoke');
} finally {
  await app.close();
}
