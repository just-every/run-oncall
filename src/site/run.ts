import type { RunData } from '../base/run-site'

export const run: RunData = {
  name: 'Oncall',
  repository: 'https://github.com/just-every/run-oncall',
  clone: 'npx -y @runeditrun/rer dev just-every/run-oncall',
  folder: 'run-oncall',
  requirements: 'Needs Git and Node 22 or later, on macOS, Linux or Windows with WSL2. rer provides the pinned tooling.',
  licence: 'MIT',
  docs: true,
  hosted: [],
}
