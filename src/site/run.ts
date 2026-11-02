import type { RunData } from '../base/run-site'
import { runPricing } from '../base/run-pricing'

export const run: RunData = {
  name: 'Oncall',
  repository: 'https://github.com/just-every/run-oncall',
  clone: 'npx -y @runeditrun/rer dev just-every/run-oncall',
  licence: 'MIT',
  docs: true,
  paths: { product: 'oncall' },
  pricing: runPricing,
}
