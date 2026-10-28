import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'


const vendors = ['opsgenie', 'pagerduty']
const day = 86400000

async function question(label, hidden = false) {
 const silent = new Writable({ write(_chunk, _encoding, done) { done() } })
 const rl = createInterface({ input: process.stdin, output: hidden ? silent : process.stdout, terminal: true, historySize: 0 })
 // A closed prompt is never treated as Enter/default, including Ctrl-C during hidden input.
 let answered = false
 rl.on('SIGINT', () => { process.stderr.write('Export cancelled. No file was saved.\n'); process.exitCode = 1; rl.close() })
 if (hidden) process.stdout.write(label)
 try {
  const value = await rl.question(hidden ? '' : label)
  answered = true
  return value.trim()
 } finally {
  rl.close()
  if (hidden) process.stdout.write('\n')
  if (!answered) process.exitCode = 1
 }
}

async function main() {
 if (Number(process.versions.node.split('.')[0]) < 22) throw Error('Install Node.js 22 or later, then run this command again.')
 if (process.argv.length === 3 && ['--help', '-h'].includes(process.argv[2])) {
  console.log('Usage: node oncall-export.mjs opsgenie|pagerduty\nRequires Node 22+ and an interactive terminal. Prompts for us/eu region, UTC comparison dates (1–31 days), and a hidden read-only API key.\nGET requests only; no packages or uploads. Collects all accessible records, follows pagination and joins schedule details/overrides.\nSaves PROVIDER-export-DATE-TIME.json in the current folder only after collection, credential removal and the 512 KiB/500-object checks succeed.\nUpload that file under Settings → Move in → Other: from a file → Review. Paging stays OFF.');
  return
 }
 const vendor = process.argv[2]
 if (!vendors.includes(vendor) || process.argv.length !== 3) throw Error('Usage: node oncall-export.mjs opsgenie  OR  node oncall-export.mjs pagerduty')
 if (!process.stdin.isTTY || !process.stdout.isTTY) throw Error('Run in an interactive terminal so the key can be entered without echo. Do not pipe or redirect this command.')
 console.log(`Oncall ${vendor} export: GET requests only. The API key stays in this process.`)
 const region = (await question('Account region (us/eu) [us]: ')) || 'us'
 if (!['us', 'eu'].includes(region)) throw Error('Region must be us or eu. Run again.')
 const today = new Date().toISOString().slice(0, 10)
 const start = (await question(`Comparison start, UTC date [${today}]: `)) || today
 const defaultEnd = new Date(Date.parse(`${start}T00:00:00Z`) + 14 * day)
 if (!Number.isFinite(+defaultEnd)) throw Error('Use a valid YYYY-MM-DD start date. Run again.')
 const end = (await question(`Comparison end, UTC date [${defaultEnd.toISOString().slice(0, 10)}]: `)) || defaultEnd.toISOString().slice(0, 10)
 const window = exportWindow(start, end)
 const key = await question('Paste read-only API key (input hidden), then press Enter: ', true)
 const result = await collectExport({ vendor, region, key, window, progress: line => console.log(line) })
 const filename = resolve(`${vendor}-export-${new Date().toISOString().replaceAll(':', '-')}.json`)
 try { await writeFile(filename, result.json, { flag: 'wx', mode: 0o600 }) }
 catch { throw Error('Could not save the export. Check folder permissions and free disk space, then run again.') }
 console.log(`Saved ${filename}\n${result.count} objects; ${result.removed} credential fields omitted.\nCoverage comparison: ${window.since} to ${window.until}.`)
 console.log('Return to Settings → Move in. Choose Other: from a file and select this file to open Review. Review every rejection and difference; export success does not establish compatibility. Paging stays OFF.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
 main().catch(error => { console.error(`Export stopped: ${error.message}`); process.exitCode = 1 })
}
