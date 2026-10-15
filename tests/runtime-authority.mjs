import assert from 'node:assert/strict';
import http from 'node:http';

// Hold the last request byte on a real HTTP connection while another request
// removes authority. No Worker hooks or substitute storage are involved.
export async function heldMutation(origin, path, input, cookie, whileHeld) {
  const bytes = Buffer.from(JSON.stringify(input));
  let sent;
  const response = new Promise((resolve, reject) => {
    sent = http.request(origin + path, { method: 'POST', agent: false, headers: {
      origin, cookie, 'content-type': 'application/json', 'content-length': bytes.length,
    } }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('error', reject);
      res.on('end', () => {
        let value;
        try { value = JSON.parse(Buffer.concat(chunks).toString()); }
        catch { return reject(new Error('Held mutation returned a non-JSON response')); }
        resolve({ status: res.statusCode, value });
      });
    });
    sent.setTimeout(30000, () => sent.destroy(new Error('Held mutation timed out')));
    sent.on('error', reject);
  });
  // Attach a rejection handler immediately, including when the intervening
  // request fails and the held socket is destroyed during cleanup.
  response.catch(() => {});
  try {
    await new Promise((resolve, reject) => sent.write(bytes.subarray(0, -1), error => error ? reject(error) : resolve()));
    await whileHeld();
    sent.end(bytes.subarray(-1));
    return await response;
  } finally {
    sent.destroy();
  }
}

export async function awaitingCoordinationAuthority({ origin, request, cookie, incident }) {
  const ok = (r, status = 200) => { assert.equal(r.status, status, JSON.stringify(r.value)); return r.value; };
  const password = 'synthetic-held-request-fixture-password';
  const member = ok(await request('/api/members', { name: 'Held responder', role: 'responder', password }, cookie), 201);
  const login = async () => { const r = await request('/api/login', { name: member.name, password }); ok(r); return r.cookie; };
  const current = async () => ok(await request('/api/state', undefined, cookie));
  for (const change of ['downgrade', 'revoke']) {
    const actorCookie = await login();
    const before = await current();
    const item = before.incidents.find(row => row.id === incident);
    let afterAuthority;
    const result = await heldMutation(origin, '/api/command', {
      type: 'note', incident, revision: item.revision, text: `Must not publish after ${change}`,
    }, actorCookie, async () => {
      ok(await request('/api/state', undefined, actorCookie));
      if (change === 'downgrade') ok(await request('/api/command', { type: 'member', id: member.id, role: 'viewer', active: true }, cookie));
      else ok(await request('/api/logout', {}, actorCookie));
      afterAuthority = await current();
    });
    assert.ok([401, 403, 409].includes(result.status), `held ${change} mutation must be denied, got ${result.status}`);
    assert.deepEqual(await current(), afterAuthority, `held ${change} cannot publish any coordination state`);
    if (change === 'downgrade') ok(await request('/api/command', { type: 'member', id: member.id, role: 'responder', active: true }, cookie));
  }
}
