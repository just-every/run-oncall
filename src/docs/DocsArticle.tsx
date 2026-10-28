import { HydrationUnit } from "../base/hydration/unit";
import type { SiteVariant } from "../landing/Site";
import { DocsLayout } from './DocsLayout';
import { docsNeighbours, getDocsPage } from './pages';

// One docs page: section, title, the rendered Markdown (its first paragraph is the lead), then the previous and next pages.
export function DocsArticle({ slug, variant }: { slug: string; variant?: SiteVariant }) {
  const page = getDocsPage(slug)!;
  const { previous, next } = docsNeighbours(slug);
  const toc = page.toc.filter(entry => entry.depth === 2);
  return (
    <DocsLayout
      current={slug}
      variant={variant}
      aside={toc.length > 1 && (
        <nav className="docs-toc" aria-label="On this page">
          <p>On this page</p>
          <ul>{toc.map(entry => <li key={entry.id}><a href={`#${entry.id}`}>{entry.text}</a></li>)}</ul>
        </nav>
      )}
    >
      <HydrationUnit><article className="docs-article" data-doc={slug}>
        <p className="docs-eyebrow">{page.section}</p>
        <h1>{page.title}</h1>
        <div className="docs-body" dangerouslySetInnerHTML={{ __html: page.html }} />
      </article></HydrationUnit>
      <HydrationUnit><nav className="docs-pager" aria-label="Previous and next">
        {previous ? <a href={`/docs/${previous.slug}`} rel="prev"><small>Previous</small>{previous.title}</a> : <span />}
        {next && <a className="docs-pager-next" href={`/docs/${next.slug}`} rel="next"><small>Next</small>{next.title}</a>}
      </nav></HydrationUnit>
      <HydrationUnit><p className="docs-source"><a href={`https://github.com/just-every/run-oncall/blob/main/${page.source}`}>Edit this page on GitHub</a></p></HydrationUnit>
    </DocsLayout>
  );
}
