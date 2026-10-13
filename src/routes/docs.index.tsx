import { createFileRoute } from '@tanstack/react-router'
import { DocsIndex } from '../docs/DocsIndex'
import { docsHead } from '../docs/pages'

export const Route = createFileRoute('/docs/')({ head: () => docsHead(), component: DocsIndex })
