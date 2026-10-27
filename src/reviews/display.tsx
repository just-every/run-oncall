import {shortTime} from './time';
import type { ReactNode } from 'react';
import type { ResponseDuration } from './report';

export const utc = (value: string) => shortTime(value);
export const duration = (seconds: number | null) => seconds === null ? 'No samples' : seconds < 3600 ? `${new Intl.NumberFormat('en', {maximumFractionDigits: 1}).format(seconds / 60)} min` : `${new Intl.NumberFormat('en', {maximumFractionDigits: 1}).format(seconds / 3600)} h`;
export function EvidenceLink({url, children}: {url: string | null | undefined; children?: ReactNode}) {
  let safe = false;
  try { safe = !!url && ['https:', 'http:'].includes(new URL(url).protocol); } catch { /* Retained invalid links remain visible as text. */ }
  return safe ? <a href={url!} target="_blank" rel="noreferrer">{children ?? url} ↗</a> : url ? <span>{url} (not an HTTP(S) link)</span> : null;
}
export function DurationSource({value}: {value: ResponseDuration}) {
  return <div className="response-source">
    <strong>{value.status === 'unknown' ? 'Unknown duration' : value.status === 'censored' ? `At least ${duration(value.seconds)} · censored` : `${duration(value.seconds)} · measured`}</strong>
    <p>{value.reason}</p>
    <p className="review-meta">Source time: {value.sourceAt ? utc(value.sourceAt) : 'Unavailable'}<br />
      Representation: {value.sourceKind ?? 'Unavailable'}</p>
    {value.evidence && <EvidenceLink url={value.evidence}>Recorded attestation</EvidenceLink>}
  </div>;
}
