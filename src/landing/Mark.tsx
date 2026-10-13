// Oncall's mark: a name badge on its lanyard and clip, the one on call now. Standalone on any ground;
// public/brand/mark.svg is the same drawing as a file.
export function Mark({ size = 30 }: { size?: number }) {
  return (
    <svg className="oc-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <g transform="rotate(-8 16 17)">
        <path d="M11 2.8 16 9.6 21 2.8" fill="none" stroke="var(--oc-now)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="6.5" y="9.4" width="19" height="21.2" rx="4" fill="var(--oc-ink)" />
        <rect x="12.8" y="7" width="6.4" height="4.8" rx="1.8" fill="var(--oc-brass)" />
        <rect x="10" y="17.4" width="12" height="2.8" rx="1.4" fill="var(--oc-paper)" />
        <rect x="10" y="22.8" width="7.4" height="2.8" rx="1.4" fill="var(--oc-paper)" />
      </g>
    </svg>
  );
}

export function Wordmark() {
  return (
    <a className="oc-wordmark" href="/" aria-label="Oncall home">
      <Mark />
      <span>Oncall</span>
    </a>
  );
}
