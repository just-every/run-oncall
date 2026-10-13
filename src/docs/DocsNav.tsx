import { docsSections } from './pages';

// Every published page by section; the current one is marked. On phones it folds into "All docs".
export function DocsNav({ current }: { current?: string }) {
  const list = (
    <nav className="docs-nav" aria-label="Docs">
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
    </nav>
  );
  return (
    <>
      <div className="docs-sidebar">{list}</div>
      <details className="docs-menu">
        <summary>All docs</summary>
        {list}
      </details>
    </>
  );
}
