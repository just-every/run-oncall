import {useEffect, useState} from 'react';
import {request} from '../useWorkspace';
import type {Delivery} from './deliveries';
import {shortTime} from '../reviews/time';

const words = (page: Delivery) => ({
  sent: 'Sent', sending: 'Sending', retry: `Will retry (attempt ${page.attempts} of 3 failed)`,
  failed: `Failed: ${page.detail}`, skipped: `Not sent: ${page.detail}`,
})[page.status];
/** One log line per page Oncall sent, tried or could not send for this alert. */
export function PageLog({alert, step, names, onPages}: {alert: string; step: number; names: Record<string, string>; onPages?: (count: number) => void}) {
  const [pages, setPages] = useState<Delivery[]>([]);
  useEffect(() => {
    let live = true;
    request('/api/paging/sms/deliveries?alert=' + encodeURIComponent(alert)).then(value => {if (live) {setPages(value.deliveries);onPages?.(value.deliveries.length);}}, () => {});
    return () => {live = false;};
  }, [alert, step]);
  if (!pages.length) return null;
  return <ul className="alert-page-log" aria-label="Pages sent by text message">
    {[...pages].reverse().map(page => <li key={page.id}>Page · step {page.step} · {page.member ? names[page.member] ?? 'Responder' : 'Nobody'}{page.toHint && ` · text ending ${page.toHint}`} · {words(page)} · <time dateTime={new Date(page.updatedAt).toISOString()}>{shortTime(new Date(page.updatedAt).toISOString())}</time></li>)}
  </ul>;
}
