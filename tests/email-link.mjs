import {queuedEntrypoint} from '@runeditrun/rer/queued-entry';
const queued=await queuedEntrypoint(import.meta.url,'verify:email-link');if(queued!==null)process.exit(queued);
// The foundation's one end-to-end email-link test: the emitted Worker claims
// the owner, mails a sign-in link to the key-gated development outbox, and the
// link signs in through confirmation. Dev identity never replaces this path.
import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { createServer } from 'node:net'
import { randomBytes } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from '@playwright/test'

// Each request closes its connection: a pooled one the local Worker closed while the test read D1 through wrangler would fail the next request before it is sent.
const fetch = (url, init = {}) => globalThis.fetch(url, { ...init, headers: { ...init.headers, connection: 'close' } })

const socket = createServer()
await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve))
const port = socket.address().port
await new Promise(resolve => socket.close(resolve))
const origin = `http://127.0.0.1:${port}`, directory = await mkdtemp(join(tmpdir(), 'foundation-email-link-'))
const secret = () => randomBytes(32).toString('base64url'), owner = 'owner@example.test'
const vars = { AUTH_LOCAL: 'true', AUTH_ORIGIN: origin, OWNER_EMAIL: owner, SESSION_SECRET: secret(), SETUP_TOKEN: secret(), MAIL_PROVIDER: 'development', MAIL_FROM: 'auth@localhost.test', RER_DEV_KEY: secret() }
await writeFile(join(directory, 'local.env'), Object.entries(vars).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', { mode: 0o600 })
const wrangler = ['node_modules/wrangler/bin/wrangler.js', '--config', 'dist/server/wrangler.json']
execFileSync(process.execPath, [wrangler[0], 'd1', 'migrations', 'apply', 'DB', '--local', '--persist-to', directory, ...wrangler.slice(1)], { stdio: 'ignore', env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' } })
const launch = () => spawn(process.execPath, [wrangler[0], 'dev', ...wrangler.slice(1), '--inspector-port', '0', '--local', '--persist-to', directory, '--ip', '127.0.0.1', '--port', String(port), '--env-file', join(directory, 'local.env')], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_INCLUDE_PROCESS_ENV: 'false', CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'true' } })
let worker = launch(), browser
let output = ''
const listen = () => { for (const stream of [worker.stdout, worker.stderr]) stream.on('data', chunk => { output += chunk }) }
listen()
const post = (path, body, cookie) => fetch(origin + path, { method: 'POST', redirect: 'manual', headers: { origin, 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) })
const healthy = async () => {
  let ready = false
  for (let attempt = 0; attempt < 240 && !ready; attempt++) {
    if (worker.exitCode !== null) throw new Error('emitted Worker exited')
    try { ready = (await fetch(`${origin}/health`)).ok } catch { await new Promise(resolve => setTimeout(resolve, 250)) }
  }
  assert.ok(ready, 'emitted Worker became healthy')
}
const key = { 'x-rer-dev-key': vars.RER_DEV_KEY }
try {
  await healthy()
  assert.deepEqual(await (await fetch(origin+'/setup/state')).json(), {state:'unclaimed'});
  assert.equal((await post('/auth/bootstrap', { token: vars.SETUP_TOKEN, displayName: 'Owner' })).status, 303, 'owner claimed')
  assert.deepEqual(await (await fetch(origin+'/setup/state')).json(), {state:'unclaimed'}, 'bootstrap alone does not confirm first run');
  assert.equal((await post('/auth/magic-link', { email: owner })).status, 202, 'sign-in link mailed')
  assert.equal((await fetch(`${origin}/__dev/outbox`)).status, 404, 'the outbox needs the key gate')
  const listing = await (await fetch(`${origin}/__dev/outbox`, { headers: key })).text()
  const message = listing.match(/href="(\/__dev\/outbox\?message=[^"]+)"/)?.[1]
  assert.ok(message, 'the outbox lists the sign-in message')
  const detail = await (await fetch(origin + message.replaceAll('&amp;', '&'), { headers: key })).text()
  const link = new URL(detail.match(/href="([^"]*\/auth\/confirm\?token=[^"]+)"/)[1].replaceAll('&amp;', '&'), origin)
  assert.equal(link.origin, origin)
  assert.equal((await fetch(link)).status, 200, 'confirmation page')
  const staleCookie = 'oncall_session=' + secret()
  assert.equal((await (await fetch(origin+'/api/session',{headers:{cookie:staleCookie}})).json()).member,null,'an unknown installation cookie grants no identity')
  const failedConfirmation = await post('/auth/confirm', { token: 'invalid' }, staleCookie)
  assert.equal(failedConfirmation.status, 400)
  assert.equal(failedConfirmation.headers.getSetCookie().some(line => line.startsWith('oncall_session=')), false, 'failed confirmation cannot clear a held workspace session')
  const confirmed = await post('/auth/confirm', { token: link.searchParams.get('token') }, staleCookie)
  assert.equal(confirmed.status, 303)
  assert.ok(confirmed.headers.getSetCookie().some(line => line.startsWith('oncall_session=;') && /Max-Age=0(?:;|$)/.test(line)), 'successful confirmation expires the old workspace cookie')
  const cookie = confirmed.headers.getSetCookie().filter(line => !/Max-Age=0(?:;|$)/.test(line)).map(line => line.split(';')[0]).join('; ')
  const session = await fetch(`${origin}/auth/session`, { headers: { cookie } })
  assert.equal(session.status, 200)
  assert.equal((await session.json()).operator.email, owner)
  assert.equal((await fetch(origin+'/setup',{headers:{cookie}})).status,200);
  const finish=await fetch(origin+'/setup',{method:'POST',redirect:'manual',headers:{cookie,origin,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes'});
  assert.equal(finish.status,303);
  assert.equal(finish.headers.get('location'),'/app');
  assert.deepEqual(await (await fetch(origin+'/setup/state')).json(),{state:'claimed'});
  assert.match(await (await fetch(origin)).text(),/href="\/signin"/,'confirmed installation gives guests a sign-in door');
  assert.match(await (await fetch(origin,{headers:{cookie}})).text(),/class="access"/,'validated native member opens the workspace');
  const oncallSession=await fetch(`${origin}/api/session`,{headers:{cookie}});assert.equal((await oncallSession.json()).member.role,'admin');assert.equal((await fetch(`${origin}/api/state`,{headers:{cookie}})).status,200);
  const checkpoint=await (await fetch(origin+'/api/recovery/checkpoint',{headers:{cookie}})).json(),restored=await post('/api/recovery/restore',{mode:'replace',checkpoint},cookie);assert.equal(restored.status,200)
  const derived=restored.headers.getSetCookie().map(line=>line.split(';')[0]).join('; '),combined=cookie+'; '+derived
  assert.equal((await fetch(origin+'/api/state',{headers:{cookie:combined}})).status,200)
  assert.equal((await fetch(origin+'/api/state',{headers:{cookie:derived}})).status,401,'derived native session requires its native identity cookie')
  const query=sql=>JSON.parse(execFileSync(process.execPath,[wrangler[0],'d1','execute','DB','--local','--persist-to',directory,...wrangler.slice(1),'--command',sql,'--json'],{encoding:'utf8',env:{...process.env,WRANGLER_SEND_METRICS:'false'},stdio:['ignore','pipe','pipe']}))[0].results
  const expires=query('SELECT MAX(expires_at) AS expires FROM oa_sessions')[0].expires;query('UPDATE oa_sessions SET expires_at=0')
  assert.equal((await fetch(origin+'/api/state',{headers:{cookie:combined}})).status,401,'restored session retains native expiry')
  assert.match(await (await fetch(origin,{headers:{cookie:combined}})).text(),/href="\/signin"/,'expired native session receives the guest Lobby');
  query('UPDATE oa_sessions SET expires_at='+expires)
  assert.equal((await post('/auth/signout',{},cookie)).status,204);assert.equal((await fetch(`${origin}/api/state`,{headers:{cookie:combined}})).status,401,'revoked native session cannot read restored Oncall');
  assert.match(await (await fetch(origin,{headers:{cookie:combined}})).text(),/href="\/signin"/,'revoked native session receives the guest Lobby');
  // rer retires SETUP_TOKEN once the owner is claimed: the claimed installation keeps serving without it.
  worker.kill('SIGTERM')
  await new Promise(resolve => worker.exitCode !== null ? resolve() : worker.once('exit', resolve))
  delete vars.SETUP_TOKEN
  await writeFile(join(directory, 'local.env'), Object.entries(vars).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', { mode: 0o600 })
  worker = launch()
  listen()
  await healthy()
  assert.match(await (await fetch(origin)).text(), /href="\/signin"/, 'a claimed installation serves guests without SETUP_TOKEN')
  assert.equal((await post('/auth/magic-link', { email: owner })).status, 202, 'sign-in still works without SETUP_TOKEN')
  assert.equal((await post('/auth/bootstrap', { token: 'x'.repeat(64), displayName: 'Owner' })).status, 403, 'no token claims a claimed installation')
  // Exercise the actual owner button: the route test above cannot catch a
  // browser forgetting the auth endpoint's required JSON content type/body.
  browser = await chromium.launch({ headless: true })
  for (const width of [1440, 390]) {
    if (width === 390) await post('/auth/magic-link', { email: owner })
    const messages = await (await fetch(origin + '/__dev/outbox', { headers: key })).text()
    const messagePath = messages.match(/href="(\/__dev\/outbox\?message=[^"]+)"/)[1].replaceAll('&amp;', '&')
    const mail = await (await fetch(origin + messagePath, { headers: key })).text()
    const confirmation = new URL(mail.match(/href="([^"]*\/auth\/confirm\?token=[^"]+)"/)[1].replaceAll('&amp;', '&'), origin)
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    try {
      // Keep the real derived cookie from the now-revoked earlier login. A
      // fresh email confirmation must still open the workspace in this browser.
      await context.addCookies(derived.split('; ').map(line => {
        const pair = line.split(';')[0], index = pair.indexOf('=')
        return { name: pair.slice(0, index), value: pair.slice(index + 1), url: origin }
      }))
      const page = await context.newPage()
      await page.goto(confirmation.href)
      assert.ok((await context.cookies()).some(cookie => cookie.name === 'oncall_session'), 'previewing a sign-in link preserves the held workspace cookie')
      await page.getByRole('button', { name: 'Confirm', exact: true }).click()
      await page.waitForURL(origin + '/')
      assert.equal((await context.cookies()).some(cookie => cookie.name === 'oncall_session'), false, 'browser confirmation clears the earlier installation cookie')
      assert.equal((await context.request.get(origin + '/api/state')).status(), 200)
      if (width === 1440) {
        assert.equal((await context.request.post(origin + '/api/members', { headers: { origin }, data: { name: 'Password Member', password: 'member-testing-password', role: 'responder' } })).status(), 201)
      }
      const authSignout = page.waitForResponse(response => new URL(response.url()).pathname === '/auth/signout')
      await page.getByRole('button', { name: 'Sign out', exact: true }).click()
      assert.equal((await authSignout).status(), 204)
      await page.waitForURL(origin + '/signin')
      await page.getByLabel('Email', { exact: true }).waitFor()
      await page.reload()
      await page.getByLabel('Email', { exact: true }).waitFor()
      assert.equal((await context.request.get(origin + '/api/state')).status(), 401)
      await page.getByRole('link', { name: 'Sign in with a workspace password' }).click()
      await page.getByLabel('Name', { exact: true }).fill('Password Member')
      await page.getByLabel('Password', { exact: true }).fill('member-testing-password')
      await page.getByRole('button', { name: 'Sign in', exact: true }).click()
      await page.waitForURL(origin + '/')
      assert.equal((await (await context.request.get(origin + '/api/session')).json()).member.name, 'Password Member')
      await page.getByRole('button', { name: 'Sign out', exact: true }).click()
      await page.waitForURL(origin + '/signin')
      await page.getByLabel('Email', { exact: true }).waitFor()
      assert.equal((await context.request.get(origin + '/api/state')).status(), 401)
    } finally { await context.close() }
  }
  await browser.close(); browser = null
  console.log('Email-link sign-in passed against the emitted Worker: claim, key-gated outbox, confirmation, session')
} catch (error) {
  for (const value of Object.values(vars)) output = output.replaceAll(value, '[redacted]')
  console.error(output.slice(-4000))
  throw error
} finally {
  await browser?.close()
  worker.kill('SIGTERM')
  await new Promise(resolve => worker.exitCode !== null ? resolve() : worker.once('exit', resolve))
  await rm(directory, { recursive: true, force: true })
}
