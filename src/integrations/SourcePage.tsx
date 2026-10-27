import {InlineConfirm} from '../app/autosave/InlineConfirm';
import {OneTimeSecret} from './OneTimeSecret';
import {privateKey} from './catalog';
import { useState } from 'react';
import { SourceTest } from './SourceTest';
import { integrationKinds, shortTime, type IntegrationProps, type SourceRecord } from './catalog';
import './integrations.css';
import {GrafanaSigning} from '../monitoring/GrafanaSigning';
import { ChangeSourceTest } from '../changes/ChangeSourceTest';

const references = { email: ['/docs/compatible-intake#integration-email', 'Set up email routing'], events: ['/docs/incidents#send-an-alert-event', 'Events API reference'], changes: ['/docs/changes', 'Change events reference'], pagerduty: ['/docs/compatible-intake', 'Provider setup'], opsgenie: ['/docs/compatible-intake', 'Provider setup'], splunk: ['/docs/compatible-intake', 'Provider setup'], alertmanager: ['/docs/monitoring-providers', 'Provider setup'], grafana: ['/docs/monitoring-providers', 'Provider setup'], datadog: ['/docs/monitoring-providers', 'Provider setup'] } as const;

export function SourcePage({ source, state, admin, busy, run, children }: IntegrationProps & { source?: SourceRecord; children?: React.ReactNode }) {
  const [confirm, setConfirm] = useState<'rotate'|'revoke'>(),[revealed,setRevealed]=useState('');
  if (!source) return <section className="panel padded integrations"><a className="integration-link" href="/settings/integrations">‹ Integrations</a><h2>Source not found</h2><p>Choose an integration from the list.</p></section>;
  const id = source.id.slice(source.id.indexOf(':') + 1), service = state.services.find(s => s.id === source.service);
  const intake = (state.intakeReceipts ?? []).filter(r => r.source === id).slice().reverse();
  const events = state.events.filter(e => e.source === id || e.source === 'intake:' + id).slice().reverse();
  const changes = (state.changes ?? []).filter(c => c.source === id).slice().reverse();
  const rejections = state.audit.filter(a => a.kind === 'intake-rejected' && a.text.includes(' for integration ' + id + ';'));
  const [reference, referenceName] = references[source.kind];
  const existing = source.id.startsWith('intake:') ? state.intakeSources?.find(s => s.id === id) : source.id.startsWith('change:') ? state.changeSources?.find(s => s.id === id) : undefined;
  return <section className="panel padded integrations" aria-label="Integration source">
    <a className="integration-link" href="/settings/integrations">‹ Integrations</a><h2>{source.name}</h2><p>{integrationKinds[source.kind]}{service ? ' · ' + service.name : ''}{!source.active ? ' · Inactive' : ''}</p>
    {children}
    {admin&&source.kind==='grafana'&&<GrafanaSigning sources={state.intakeSources!.filter(s=>s.id===id)} busy={busy} run={run} revision={state.revision}/>}
    {source.kind === 'changes' && <ChangeSourceTest source={state.changeSources!.find(s => s.id === id)!} busy={busy} run={run} />}
    {service && <SourceTest source={source} service={service} busy={busy} run={run} />}
    {source.kind !== 'email' && <><h3>Receipts</h3><ol className="integration-receipts">{(source.kind === 'changes' ? changes : source.kind === 'events' ? events : intake).map((r: any) => <li key={r.id}><strong>{r.title ?? r.summary ?? 'Received event'}</strong><p>{r.outcome ?? r.intent ?? 'Accepted'} · {shortTime(r.acceptedAt ?? r.timestamp ?? r.observedAt)}</p>{r.incomplete && <p>Incomplete intake · {r.incomplete.bytes.toLocaleString()} bytes · {r.incomplete.dropped ?? 'Some'} alerts unread</p>}</li>)}</ol>{!(source.kind === 'changes' ? changes : source.kind === 'events' ? events : intake).length && <p>No accepted requests yet.</p>}</>}
    <details><summary>Rejected requests ({rejections.length})</summary>{rejections.length ? <ul>{rejections.map(r => <li key={r.id}>Request refused · {shortTime(r.at)}</li>)}</ul> : <p>No rejected requests retained for this source.</p>}</details>
    {admin&&source.kind!=='email'&&<details><summary>Source actions</summary><button type="button" disabled={busy} onClick={()=>setConfirm('rotate')}>Rotate key</button><button type="button" disabled={busy||!source.active} onClick={()=>setConfirm('revoke')}>Revoke key</button>
     {confirm&&<InlineConfirm action={confirm==='rotate'?'Rotate key now':'Revoke key now'} keep="Cancel" busy={busy} onCancel={()=>setConfirm(undefined)} onConfirm={async()=>{
      let key=privateKey(source.kind==='changes'&&existing&&'provider' in existing&&existing.provider==='pagerduty'?16:32);
      if(source.kind==='changes'&&existing&&'provider' in existing&&existing.provider==='gitlab')key='whsec_'+btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
      const path=confirm==='rotate'?source.kind==='events'?'/api/sources':source.kind==='changes'?'/api/changes/sources':'/api/intake/sources':source.kind==='events'?'/api/sources/'+encodeURIComponent(id)+'/revoke':source.kind==='changes'?'/api/changes/sources/'+encodeURIComponent(id)+'/revoke':'/api/intake/sources/'+encodeURIComponent(id)+'/revoke';
      const data=confirm==='rotate'?source.kind==='events'?{id,key,mode:source.native?.authentication,scopes:source.native?.scopes}:{...existing,key,revision:existing?.revision}:existing?{revision:existing.revision}:{};
      if(await run(path,data,confirm==='rotate'?'Source key rotated':'Source revoked')){if(confirm==='rotate')setRevealed(key);setConfirm(undefined);}
     }}>Stop the old key from sending new events? Accepted records stay.</InlineConfirm>}
    </details>}{revealed&&<OneTimeSecret value={revealed} onDone={()=>setRevealed('')}/>}

    <a className="integration-link" href={reference}>{referenceName}</a>
  </section>;
}
