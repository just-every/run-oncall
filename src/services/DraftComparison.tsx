import type {ReactNode} from 'react';
export function DraftComparison({stale, baseVersion, currentVersion, children, useMine}: {stale: boolean; baseVersion: number; currentVersion: number; children: ReactNode; useMine: () => void}) {
  if (!stale) return null;
  return <div className="service-draft-notice" role="status"><p>Your draft began on version {baseVersion}. Version {currentVersion} is now published.</p><details><summary>Published version {currentVersion}</summary>{children}</details><button type="button" onClick={useMine}>Use mine</button></div>;
}
