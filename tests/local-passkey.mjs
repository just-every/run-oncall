import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function localPasskey(browser, openLink, { width = 1440, capture = async () => {} } = {}) {
 const origin = new URL(openLink).origin
 assert.equal(new URL(origin).hostname, 'localhost')
 const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : 844 } })
 const page = await context.newPage()
 let authenticator
 const addAuthenticator = async page => {
  const cdp = await context.newCDPSession(page)
  await cdp.send('WebAuthn.enable')
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
   options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true,
    isUserVerified: true, automaticPresenceSimulation: true },
  })
  return { cdp, authenticatorId }
 }

 try {
  await page.goto(openLink)
  await page.waitForURL(url => ['/setup', '/on-call'].includes(url.pathname))
  const finish = page.getByRole('button', { name: 'Finish setup' })
  if (await finish.isVisible()) {
   await page.getByRole('checkbox').check()
   await finish.click()
  }
  const openMenu = async () => {
   if (width === 390 && !await page.getByRole('dialog', { name: 'Menu' }).isVisible())
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
   await page.locator('.owner-button:visible').click()
  }
  await openMenu()
  const settings = page.getByRole('menuitem', { name: 'Sign-in settings' })
  await expect(settings).toBeVisible()
  await capture(page, 'account-menu')
  await settings.click()
  await expect(page.getByRole('heading', { name: 'Sign-in settings' })).toBeVisible()
  await capture(page, 'enrollment')
  const numeric = origin.replace('localhost', '127.0.0.1')

  const owner = await (await context.request.get(origin + '/api/session')).json()
  authenticator = await addAuthenticator(page)
  const enroll = page.getByRole('button', { name: 'Enroll passkey' })
  await expect(enroll).toBeEnabled()
  await enroll.click()
  await expect(page.getByRole('status').filter({ hasText: 'Passkey enrolled' })).toBeVisible()
  await capture(page, 'enrolled')
  const { credentials } = await authenticator.cdp.send('WebAuthn.getCredentials', { authenticatorId: authenticator.authenticatorId })
  assert.equal(credentials.length, 1, 'browser created a passkey on its authenticator')

  await page.goto(origin)
  await openMenu()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page.getByRole('button', { name: 'Sign in with a passkey' })).toBeVisible()
  await context.clearCookies()
  const api = origin + '/auth/local/passkey'
  const enrollAnonymously = await context.request.post(api, { headers: { origin }, data: { operation: 'enroll' } })
  assert.equal(enrollAnonymously.status(), 403, 'signed-out callers cannot enroll')
  await page.goto(origin)
  await capture(page, 'lobby')
  await page.getByRole('link', { name: 'Sign in', exact: true }).first().click()
  const signIn = page.getByRole('button', { name: 'Sign in with a passkey' })
  await expect(signIn).toBeEnabled()
  await capture(page, 'signin')
  const signed = page.waitForResponse(response => response.url() === api && response.request().postDataJSON().credential)
  await signIn.click()
  const proof = await signed
  assert.equal(proof.status(), 200)
  await page.waitForURL(url => url.pathname === '/on-call')
  const signedIn = await (await context.request.get(origin + '/api/session')).json()
  assert.ok(owner.member?.id)
  assert.equal(signedIn.member?.id, owner.member.id, 'the passkey opened the same owner account')
  await page.locator('.oncall-frame').waitFor()
  await capture(page, 'signed-in')
  const replay = await context.request.post(api, { headers: { origin }, data: proof.request().postDataJSON() })
  assert.equal(replay.status(), 400, 'a WebAuthn assertion is single-use')
  const crossOrigin = await context.request.post(api, { headers: { origin: numeric }, data: { operation: 'signin' } })
  assert.equal(crossOrigin.status(), 403, 'a different origin cannot request a WebAuthn challenge')
 } finally {
  await context.close()
 }
}
