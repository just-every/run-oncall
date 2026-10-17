import { HydrationUnit } from "../base/hydration/unit";
import type { SiteVariant } from "../landing/Site";
import { contractUrl } from "../landing/links";
import { docsSections } from './pages';

// Every published page by section; the current one is marked. On phones it folds into "All docs".
export function DocsNav({ current, variant }: { current?: string; variant?: SiteVariant }) {
  const list = (
    <HydrationUnit><nav className="docs-nav" aria-label="Docs">
      <a className="docs-nav-home" href="/docs" aria-current={current === undefined ? 'page' : undefined}>All docs</a>
      {docsSections.map(section => (
        <div className="docs-nav-section" key={section.title}>
          <p>{section.title}</p>
          <ul>
            {section.pages.map(page => (
              <li key={page.slug}>
                <a href={`/docs/${page.slug}`} aria-current={page.slug === current ? 'page' : undefined}>{page.title}</a>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {variant === 'site' && <div className="docs-nav-section"><ul><li><a href={contractUrl}>Contract</a></li></ul></div>}
    </nav></HydrationUnit>
  );
  return (
    <>
      <div className="docs-sidebar">{list}</div>
      <details className="docs-menu">
        <HydrationUnit><summary>All docs</summary></HydrationUnit>
        {list}
      </details>
    </>
  );
}
