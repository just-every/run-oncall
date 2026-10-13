import { HydrationUnit } from "../base/hydration/unit";
import type { SiteVariant } from "../landing/Site";
import { DocsLayout } from './DocsLayout';
import { docsLead, docsSections } from './pages';

// /docs: every section and page with its one-line summary.
export function DocsIndex({ variant }: { variant?: SiteVariant }) {
  return (
    <DocsLayout variant={variant}>
      <HydrationUnit><article className="docs-article">
        <p className="docs-eyebrow">Docs</p>
        <h1>Oncall docs</h1>
        <p className="docs-summary">{docsLead}</p>
        {docsSections.map(section => {
          const id = `docs-${section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
          return (
          <section className="docs-index-section" key={section.title} aria-labelledby={id}>
            <h2 id={id}>{section.title}</h2>
            <ul className="docs-index-list">
              {section.pages.map(page => (
                <li key={page.slug}>
                  <a href={`/docs/${page.slug}`}>
                    <b>{page.title}</b>
                    <span>{page.summary}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
          );
        })}
      </article></HydrationUnit>
    </DocsLayout>
  );
}
