import { spawnSync } from 'node:child_process'
import { access, readdir } from 'node:fs/promises'
import { constants } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

export const browserInstall = 'node node_modules/@playwright/test/cli.js install chromium'

// Ask the installed Playwright CLI for its platform/revision-specific location.
// This stays read-only, including when doctor runs in a fresh HOME.
export async function validateBrowser() {
  try {
    const require = createRequire(import.meta.url)
    const result = spawnSync(process.execPath, [require.resolve('@playwright/test/cli'), 'install', '--dry-run', 'chromium-headless-shell'], { encoding: 'utf8' })
    if (result.status !== 0) throw Error('Browser location unavailable')
    const location = result.stdout.match(/Install location:\s*([^\r\n]+)/)?.[1]?.trim()
    if (!location) throw Error('Browser location unavailable')
    const files = await readdir(location, { recursive: true, withFileTypes: true })
    const binary = files.find(file => file.isFile() && /^chrome-headless-shell(?:\.exe)?$/.test(file.name))
    if (!binary) throw Error('Browser executable missing')
    await access(join(binary.parentPath, binary.name), constants.X_OK)
  } catch {
    const message = `Verification browser missing. Run: ${browserInstall}`
    console.error(message)
    throw Error(message)
  }
}
