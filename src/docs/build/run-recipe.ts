import { PATHS } from '../../base/run-site'
import { releaseInstall, releaseNodeStart } from '../../site/run'

// The marked Markdown block stays readable on GitHub. Site builds derive its
// commands and requirements from the same release recipe as /run.
export function runRecipe(markdown: string): string {
  const block = /<!-- rer:local-recipe -->[\s\S]*?<!-- \/rer:local-recipe -->/g
  if ([...markdown.matchAll(block)].length !== 1) throw new Error('Getting started needs one local recipe block.')
  const recipe = `\`\`\`sh\n${releaseInstall}\n\`\`\`\n\n`
    + `Already have Node 22 or later?\n\n\`\`\`sh\n${releaseNodeStart}\n\`\`\`\n\n${PATHS.self.requirements}`
  return markdown.replace(block, () => recipe)
}
