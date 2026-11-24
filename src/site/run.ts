import { hostingPageHtml, type SiteHosting } from '../base/hosting-page'
import { runPricing } from '../base/run-pricing'
import { escape, PATHS, pipelines, runPageHtml, startLine, type HomepageHeader, type RunData } from '../base/run-site'
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
const installedRer = '"$HOME/.local/bin/rer"'
const restart = `${installedRer} dev --host localhost`

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
    .replaceAll(escape(PATHS.self.note), 'On a busy Mac, the first local start can take several minutes. rer dev prints progress every 20 seconds and tells you how long to allow.')
    .replaceAll('>rer installs itself<', '>Clones Oncall<')
    .replaceAll('>Gets Oncall<', '>Installs rer<')
    .replace(escape('$HOME/.local/bin/rer dev just-every/run-oncall'),
      () => escape(`${cloneRelease} && ${restart}`))
    .replace('<p class="alt"><span>For later terminals:',
      `<p class="alt"><span>To start it again:</span><code>${escape(`cd run-oncall && ${restart}`)}</code></p><p class="alt"><span>For later terminals:`)
}

export function oncallHostingPage(hosting: SiteHosting | null, contract: SeedContract | undefined, homepage: HomepageHeader) {
  const launcher = escape(installedRer)
  // Oncall prepares its owner in a separate checkout and deploys with email off first.
  const cloudflare = hosting && { ...hosting, ownerEmail: undefined, mail: undefined }
  return publishedCommands(hostingPageHtml(identity, run, cloudflare, contract, homepage))
    .replaceAll('run the same line from the same folder', `inside <code>run-oncall</code>, run <code>${escape(restart)}</code> if you used the installer or <code>npx -y @runeditrun/rer dev --host localhost</code> if you used the Node alternative`)
    .replace(/(<h3 class="need" id="need">What you need<\/h3><ul><li>).*?(<\/li>)/,
      (_, start, end) => `${start}<a href="/docs/getting-started#host-for-your-team">Prepare your owner in a hosting checkout</a>. Use that checkout for the steps below. If you installed with Node, use <code>npx -y @runeditrun/rer</code> in place of <code>${launcher}</code>.${end}`)
    .replace('from the <code><span class="code-word">run-oncall</span></code> folder on your computer.', 'from your hosting checkout.')
    .replace(/(<h3 id="deploy-file">Write the deploy file<\/h3>).*?(?=<div class="code">)/,
      '$1<p>In your hosting checkout, create <code>.env.oncall</code> with the lines below. Replace the two Cloudflare placeholders and keep <code>MAIL_PROVIDER=none</code>. Leave the sender and mail credentials unset.</p>')
    .replaceAll('CLOUDFLARE_API_TOKEN=the token', 'CLOUDFLARE_API_TOKEN=replace-with-token-secret\nMAIL_PROVIDER=none')
    .replaceAll('CLOUDFLARE_ACCOUNT_ID=your account ID', 'CLOUDFLARE_ACCOUNT_ID=replace-with-account-id')
    .replace(/(<h3 id="deploy">Deploy<\/h3>).*?(?=<div class="code">)/,
      (_, heading) => `${heading}<p>If a server is running in this checkout, stop it with <code>${launcher} dev --stop</code> or <code>${launcher} preview --stop</code>.</p><p>If your shell already has Cloudflare credentials, run <code>unset CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_API_TOKEN</code> before using the private file.</p>`)
    .replaceAll('rer dev --stop\nrer deploy --env-file .env.oncall',
      () => `${launcher} deploy --env-file .env.oncall --dry-run\n${launcher} deploy --env-file .env.oncall`)
    .replace(/<p>rer deploy builds .*?(?=<\/li><\/ol>)/,
      () => `<p>The dry run checks the local build and deploy plan without contacting Cloudflare. The real deploy prints the app’s HTTPS address, claims the owner and reports that email is off. The hosted database starts empty.</p><p>From the same checkout, run <code>${launcher} signin --env-file .env.oncall</code>. Open the private URL it prints within 15 minutes, press <strong>Confirm</strong> and complete <strong>Finish setup</strong> if shown.</p><p>To enable email links, follow the <a href="/docs/getting-started#get-a-sendgrid-key-and-verified-sender-for-email-links">optional SendGrid setup</a> and use your existing deploy file when updating the mail settings.</p>`)
    .replace(/<strong>Update Oncall:<\/strong>.*?(?=<\/li>)/,
      '<strong>Update Oncall.</strong> Follow the <a href="/docs/getting-started#update-a-hosted-installation">release update steps</a> with your existing deploy file.')
    .replaceAll(/(<span class="code-word">)rer(<\/span> <span class="code-word">deploy<\/span>)/g, (_, before, after) => `${before}${launcher}${after}`)
}
