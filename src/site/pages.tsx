import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { runPageHtml, siteNotFoundHtml, type SiteBuild, type SiteContext } from '../base/run-site'
import { fontLinks } from '../brand/font-head'
import { identity } from '../identity'
import { Home } from '../landing/Home'
import { DocsIndex } from '../docs/DocsIndex'
import { DocsArticle } from '../docs/DocsArticle'
import { docsHead, docsPages } from '../docs/pages'
import { run } from './run'
import '../brand/tokens.css'
// The approved homepage inherits these document defaults from the workspace route.
import '../app/shell.css'

export function sitePages({ styles }: SiteContext): SiteBuild {
  const document = (title: string, description: string | undefined, body: ReactElement) => '<!doctype html>' + renderToStaticMarkup(
    <html lang="en"><head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>{title}</title>
      {description && <meta name="description" content={description} />}
      <link rel="icon" href="/brand/mark.svg" type="image/svg+xml" />
      <link rel="stylesheet" href="/rer-theme.css" />
      {fontLinks.map((link, index) => <link key={index} {...link} />)}
      {styles.map(href => <link key={href} rel="stylesheet" href={href} />)}
    </head><body>{body}</body></html>)
  const head = (slug?: string) => {
    const meta = docsHead(slug).meta
    return [meta.find(row => 'title' in row)?.title ?? 'Docs · Oncall', meta.find(row => 'content' in row)?.content] as const
  }
  return {
    pages: [
      { path: '/', html: document("Oncall — who's on call, now and next", identity.tagline, <Home variant="site" />) },
      { path: '/run', html: runPageHtml(identity, run) },
      { path: '/docs', html: document(...head(), <DocsIndex variant="site" />) },
      ...docsPages.map(page => ({ path: `/docs/${page.slug}`, html: document(...head(page.slug), <DocsArticle slug={page.slug} variant="site" />) })),
      { path: '/404', html: siteNotFoundHtml(identity, run) },
    ],
    assets: ['rer-theme.css', 'fonts', 'brand'],
  }
}
