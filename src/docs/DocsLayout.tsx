import { HydrationUnit } from "../base/hydration/unit";
import type { SiteVariant } from "../landing/Site";
import type { ReactNode } from 'react';
import { Site } from '../landing/Site';
import { DocsNav } from './DocsNav';
import '@fontsource/ibm-plex-mono/latin-400.css';
import './docs.css';

// The docs in the homepage's header, footer and type: the page list, the reading column and, on a page, its contents.
export function DocsLayout({ current, aside, children, variant }: { current?: string; aside?: ReactNode; children: ReactNode; variant?: SiteVariant }) {
  return (
    <Site current="docs" className="docs-site" variant={variant}>
      <div className="docs-grid">
        <DocsNav current={current} />
        <main id="main" className="docs-main">{children}</main>
        <HydrationUnit><aside className="docs-aside">{aside}</aside></HydrationUnit>
      </div>
    </Site>
  );
}
