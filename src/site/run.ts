import { hostingPageHtml, type SiteHosting } from '../base/hosting-page'
import { runPricing } from '../base/run-pricing'
import { escape, pipelines, runPageHtml, startLine, type HomepageHeader, type RunData } from '../base/run-site'
import type { SeedContract } from '../base/seed-contract.mjs'
import { identity } from '../identity'

export const run: RunData = {
  name: 'Oncall',
  repository: 'https://github.com/just-every/run-oncall',
  clone: 'npx -y @runeditrun/rer dev just-every/run-oncall',
  licence: 'MIT',
  docs: true,
  paths: { product: 'oncall' },
  pricing: runPricing,
}

// Resolve GitHub's published release redirect without downloading the release page.
const findRelease = String.raw`ONCALL_TAG=$(curl -fsS -o /dev/null -w '%{redirect_url}\n' ${run.repository}/releases/latest | sed -nE 's|^.*/releases/tag/(v[0-9]+\.[0-9]+\.[0-9]+)$|\1|p') && test -n "$ONCALL_TAG"`
const cloneRelease = `${findRelease} && mkdir run-oncall && cd run-oncall && git init -q && git remote add origin ${run.repository} && git fetch --quiet --depth 1 origin tag "$ONCALL_TAG" && git checkout --quiet --detach "refs/tags/$ONCALL_TAG"`
export const releaseInstall = `${cloneRelease} && curl -fsSL https://runeditrun.com/install.sh | sh -s -- dev --host localhost`
export const releaseNodeStart = `${cloneRelease} && npx -y @runeditrun/rer dev --host localhost`
const restart = '"$HOME/.local/bin/rer" dev --host localhost'

// Keep Base's chooser, copy button and hosting cards. Replace their branch
// recipes with this site's published-release commands.
function publishedCommands(html: string) {
  const original = startLine(run)
  return html
    .replace(pipelines(original), () => pipelines(releaseInstall))
    .replace(`data-copy="${escape(original)}"`, () => `data-copy="${escape(releaseInstall)}"`)
    .replace(/(<p class="alt"><span>(?:Already have|Have) Node 22 or later\?<\/span>)<code>.*?<\/code>/,
      (_, label: string) => `${label}<code>${escape(releaseNodeStart)}</code>`)
    .replace('with you as its owner.', 'with you as its owner. The command installs the latest published release.')
}

export function oncallRunPage(contract: SeedContract | undefined, homepage: HomepageHeader) {
  return publishedCommands(runPageHtml(identity, run, contract, homepage))
    .replaceAll('>rer installs itself<', '>Clones Oncall<')
    .replaceAll('>Gets Oncall<', '>Installs rer<')
    .replace(escape('$HOME/.local/bin/rer dev just-every/run-oncall'),
      () => escape(`${cloneRelease} && "$HOME/.local/bin/rer" dev --host localhost`))
    .replace('<p class="alt"><span>For later terminals:',
      `<p class="alt"><span>To start it again:</span><code>${escape(`cd run-oncall && ${restart}`)}</code></p><p class="alt"><span>For later terminals:`)
}

export function oncallHostingPage(hosting: SiteHosting | null, contract: SeedContract | undefined, homepage: HomepageHeader) {
  return publishedCommands(hostingPageHtml(identity, run, hosting, contract, homepage))
    .replaceAll('run the same line from the same folder', `inside <code>run-oncall</code>, run <code>${escape(restart)}</code> if you used the installer or <code>npx -y @runeditrun/rer dev --host localhost</code> if you used the Node alternative`)
    .replace(/run <code><span class="code-word">git<\/span> <span class="code-word">pull<\/span><\/code>, then .*?\. The hosted data stays\./,
      'follow the <a href="/docs/getting-started#update-a-hosted-installation">release update steps</a>.')
}
