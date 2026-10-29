import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

export default async function initialize({ request, origin, owner }) {
  const password = randomBytes(32).toString('hex');
  const response = await request(new URL('/api/members', origin).href, {
    method: 'POST', headers: { Origin: origin, Cookie: owner.cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Sam Ortega', role: 'responder', password }),
  });
  assert.equal(response.status, 201);
  const member = await response.json();
  const login = await request(new URL('/api/login', origin).href, {
    method: 'POST', redirect: 'manual', headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: member.name, password }),
  });
  assert.equal(login.status, 200, 'The native password lifecycle returns a JSON session response');
  return login;
}
