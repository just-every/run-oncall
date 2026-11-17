import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

// Exercise the real CLI and HTTP client; malformed cookies must never reach HTTP.
const directory = await mkdtemp(join(tmpdir(), 'oncall-portability-cli-'));
const session = join(directory, 'session.cookie');
const requests = [];
const status = {phase:'complete'};
const server = createServer((request, response) => {
  requests.push({path:request.url, cookie:request.headers.cookie});
  response.writeHead(200, {'Content-Type':'application/json'});
  response.end(JSON.stringify(status));
});
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const run = () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['src/modules/portability/cli.mjs', 'status',
      '--origin', origin, '--session-file', session, '--resume', 'synthetic-oncall-1'],
    {stdio:['ignore','pipe','pipe'], timeout:5000});
    let stdout = '', stderr = '';
    child.stdout.on('data', value => { stdout += value; });
    child.stderr.on('data', value => { stderr += value; });
    child.once('error', reject);
    child.once('close', (code, signal) => resolve({code, signal, stdout, stderr}));
  });
  for (const value of ['synthetic-oncall-1', 'AZaz09-_.~+/==', "!#$%&'()*+-./0123456789:<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~"]) {
    const cookie = 'synthetic_session=' + value;
    await writeFile(session, cookie + '\n', {mode:0o600});
    const before = requests.length, result = await run();
    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.deepEqual(JSON.parse(result.stdout), status);
    assert.deepEqual(requests.slice(before), [{path:'/api/portability/exports/synthetic-oncall-1', cookie}]);
  }
  for (const value of ['left,right', 'left\\right', 'left;right', 'left"right', 'left right', 'left\tright', 'left\nright', 'left\rright', 'left\x00right', 'left\x7fright', 'leftéright', '']) {
    await writeFile(session, 'synthetic_session=' + value, {mode:0o600});
    const before = requests.length, result = await run();
    assert.equal(result.signal, null);
    assert.equal(result.code, 1, 'malformed session cookie must refuse');
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /^Transfer failed: /);
    assert.equal(requests.length, before, 'invalid session cookie must refuse before HTTP');
    assert.ok(!result.stderr.includes('synthetic_session='), 'diagnostics keep session content private');
  }
  console.log('Portability CLI forwards valid cookie octets unchanged and refuses malformed cookies before HTTP');
} finally {
  await new Promise(resolve => server.close(resolve));
  await rm(directory, {recursive:true, force:true});
}
