import {shortTime,browserZone} from './time';
import type { ReactNode } from 'react';
import type { ResponseDuration } from './report';

export const incidentStateLabel = (value: string) => ({declared:'Declared',acknowledged:'Acknowledged',mitigating:'Mitigating',recovered:'Recovered',resolved:'Resolved',erased:'Erased incident',active:'Active'}[value] ?? value);
export const severityLabel = (value: string) => ({critical:'Critical',warning:'Warning',info:'Information'}[value] ?? value);
export const urgencyLabel = (value: string) => ({high:'High',low:'Low'}[value] ?? value);
export const completionLabel = (value: string | undefined) => value === 'human-review' ? 'Human review' : 'Completes with evidence';

export const utc = (value: string) => shortTime(value);
export const duration = (seconds: number | null) => seconds === null ? 'No samples' : seconds < 3600 ? `${new Intl.NumberFormat('en', {maximumFractionDigits: 1}).format(seconds / 60)} min` : `${new Intl.NumberFormat('en', {maximumFractionDigits: 1}).format(seconds / 3600)} h`;
export function EvidenceLink({url, children}: {url: string | null | undefined; children?: ReactNode}) {
  let safe = false;
  try { safe = !!url && ['https:', 'http:'].includes(new URL(url).protocol); } catch { /* Retained invalid links remain visible as text. */ }
  return safe ? <a href={url!} target="_blank" rel="noreferrer">{children ?? url} ↗</a> : url ? <span>{url} (not an HTTP(S) link)</span> : null;
}
export function DurationSource({value,zone=browserZone()}: {value: ResponseDuration;zone?:string}) {
  return <div className="response-source">
    <strong>{value.status === 'unknown' ? 'Unknown duration' : value.status === 'censored' ? `At least ${duration(value.seconds)} · censored` : `${duration(value.seconds)} · measured`}</strong>
    <p>{value.reason.replace(/\bgeneratedAt\b/g, 'the report time').replace(/\bseconds is a lower bound\b/g, 'the duration is a lower bound')}</p>
    <p className="review-meta">Source time: {value.sourceAt ? shortTime(value.sourceAt,zone) : 'Unavailable'}<br />
      Record: {value.sourceKind === 'structured' ? 'Recorded timeline entry' : value.sourceKind === 'legacy-derived' ? 'Earlier timeline entry' : value.sourceKind === 'source-event' ? 'Source event' : 'Unavailable'}</p>
    {value.evidence && <EvidenceLink url={value.evidence}>Recorded attestation</EvidenceLink>}
  </div>;
}
