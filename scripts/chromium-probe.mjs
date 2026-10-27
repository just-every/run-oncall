import { chromium } from '@playwright/test'

// Use this checkout's bundled headless shell, default launch arguments and HOME.
const browser = await chromium.launch({
  headless: true,
  timeout: 15_000,
  args: ['--use-mock-keychain', '--password-store=basic'],
})
try {
  const page = await browser.newPage()
  await page.setContent('<title>Chromium launch probe</title>')
  if (await page.title() !== 'Chromium launch probe') throw Error('Chromium page probe failed')
} finally {
  await browser.close()
}
