import { useId, useState } from 'react';
import { Form } from '../forms';
import { useRecordPage } from '../useRecordPage';
import { RecordPager } from '../app/RecordPager';
import type { State } from '../family/response-operations/domain';
import type { IntakeRun } from '../intake/CompatibleTest';
import type { MonitoringProvider } from './types';
import { MonitoringTest } from './MonitoringTest';
import './monitoring.css';

export const monitoringNames={alertmanager:'Prometheus Alertmanager',grafana:'Grafana alerting',datadog:'Datadog webhooks'};
export function MonitoringWorkspace({state,admin,busy,run}:{state:State;admin:boolean;busy:boolean;run:IntakeRun}) {
  const uid=useId(),sources=(state.intakeSources??[]).filter(s=>s.provider in monitoringNames),[id,setId]=useState(''),[name,setName]=useState(''),[provider,setProvider]=useState<MonitoringProvider>('alertmanager'),[service,setService]=useState(''),[key,setKey]=useState(''),[copyStatus,setCopyStatus]=useState('');
  const previous=sources.find(s=>s.id===id),selectedService=previous?.service||service||state.services[0]?.id||'',selectedProvider=previous?.provider as MonitoringProvider||provider;
  const [receiptSource,setReceiptSource]=useState('');
  const receiptPager=useRecordPage('intakeReceipts',state.revision,{providerGroup:'monitoring',source:receiptSource});
  const receipts=receiptPager.data?.items??[];
  const rejections=state.audit.filter(a=>a.kind==='intake-rejected').slice(-10).reverse();
  return <section className="panel padded monitoring-workspace" aria-label="Monitoring providers">
    <h2>Monitoring provider receivers</h2><p>Receive Alertmanager groups, Grafana alerts and Datadog notifications on this installation. Each alert keeps its source generation, diagnostic context and routing explanation. Paging stays OFF.</p>
    {!sources.length?<p>No monitoring provider sources configured.</p>:<ul className="monitoring-sources">{sources.map(s=><li key={s.id}><strong>{s.name}</strong><p>{monitoringNames[s.provider as MonitoringProvider]} · {s.routing?'Routed key':state.services.find(v=>v.id===s.service)?.name} · {s.active?'Active local credential':'Inactive'}</p><p><code>{s.id}</code> · {receiptPager.data?.countsBySource ? `${receiptPager.data.countsBySource[s.id]??0} retained receipts` : receiptPager.error ? 'Receipt count unavailable' : 'Loading receipt count…'}</p>{admin&&(s.routing?<a href="#routing">Manage routed rules and credential</a>:<button disabled={busy} onClick={()=>{setId(s.id);setName(s.name);setProvider(s.provider as MonitoringProvider);setService(s.service);setKey('');}}>Configure {s.name}</button>)}{admin&&s.active&&<button disabled={busy} onClick={()=>run('/api/intake/sources/'+encodeURIComponent(s.id)+'/revoke',{revision:s.revision},'Provider credential revoked')}>Revoke {s.name}</button>}</li>)}</ul>}
    {admin&&<details className="monitoring-config" open={!!previous&&!previous.routing}><summary>{previous?'Configure provider source':'Create a monitoring provider source'}</summary>
      {previous?.routing?<p>Use <a href="#routing">Routing & replay</a> to rotate this routed credential.</p>:<Form busy={busy} label={previous?'Save and rotate provider key':'Save monitoring provider'} onSubmit={async()=>{const result=await run('/api/intake/sources',{id,name,provider:selectedProvider,service:selectedService,key,revision:previous?.revision??0},'Monitoring provider saved');if(result){setKey('');setCopyStatus('');}return false;}}>
        <label className="field">Provider source ID<input required maxLength={80} value={id} onChange={e=>{setId(e.target.value);setKey('');}}/></label>
        <label className="field">Provider integration name<input required maxLength={200} value={name} onChange={e=>setName(e.target.value)}/></label>
        <label className="field"><span id={uid+'provider'}>Monitoring provider</span><select aria-labelledby={uid+'provider'} disabled={!!previous} value={selectedProvider} onChange={e=>setProvider(e.target.value as MonitoringProvider)}>{Object.entries(monitoringNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
        <label className="field"><span id={uid+'service'}>Provider service</span><select aria-labelledby={uid+'service'} disabled={!!previous} value={selectedService} onChange={e=>setService(e.target.value)}>{state.services.map(s=><option key={s.id} value={s.id}>{s.name} · {s.environment}</option>)}</select></label>
        <label className="field">Private provider key<input type="password" autoComplete="new-password" required minLength={32} maxLength={200} value={key} onChange={e=>{setKey(e.target.value);setCopyStatus('');}}/><small>Copy this credential privately into the provider’s bearer Authorization header. Saving an existing source rotates its credential.</small></label>
        <div className="intake-actions"><button type="button" onClick={()=>{setKey(Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join(''));setCopyStatus('');}}>Generate provider key</button><button type="button" disabled={!key} onClick={async()=>{try{await navigator.clipboard.writeText(key);setCopyStatus('Key copied. Keep it privately in your provider.');}catch{setCopyStatus('Clipboard unavailable. Select and copy the private key field.');}}}>Copy provider key</button></div><p role="status">{copyStatus}</p>
      </Form>}{previous&&<button disabled={busy} onClick={()=>{setId('');setName('');setKey('');}}>Create another provider source</button>}
      <p>To route one provider across services, create a routed integration key under <a href="#routing">Routing & replay</a>, choose this provider and publish rules against each alert’s labels or tags.</p>
    </details>}
    <MonitoringTest sources={sources} busy={busy} run={run}/>
    <div className="monitoring-receipts"><h3>Provider receipts and incomplete intake</h3>
      <label className="field"><span id={uid+'receipts'}>Provider receipt source</span><select aria-labelledby={uid+'receipts'} value={receiptSource} onChange={e=>setReceiptSource(e.target.value)}><option value="">All monitoring providers</option>{sources.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <RecordPager pager={receiptPager} label="monitoring provider receipts" />
      {receiptPager.data?.total===0&&<p>No provider receipts{receiptSource?' for this source':''} yet. Configure the receiver in the provider and send its named test, then fire and recover a real rule.</p>}
      {receipts.map(r=><article className="service-card" key={r.id}><h4>{r.title}</h4><p>{r.provider} · {r.action} · {r.outcome} · {r.service?state.services.find(s=>s.id===r.service)?.name:'Unrouted'}</p><p>Accepted {new Date(r.acceptedAt).toLocaleString()} · {r.truncated?'Context truncated':'Structured context retained'}</p>
        {r.incomplete&&<div className="monitoring-incomplete"><strong>Incomplete intake</strong><p>{r.incomplete.bytes.toLocaleString()} request bytes · {r.incomplete.unreadBytes.toLocaleString()} bytes outside the readable prefix · {r.incomplete.dropped===null?'unknown':r.incomplete.dropped} alerts not read</p><p>A critical coordination alert and integration-owner audit notice are retained. No page or external notice was sent.</p></div>}
        <details><summary>Provider identity, evidence and routing</summary><dl><dt>Source generation</dt><dd>{r.monitoring?.sourceGeneration??r.generation??'No generation admitted'}</dd><dt>Receipt</dt><dd>{r.id}</dd><dt>Event / alert</dt><dd>{r.event??'None'} / {r.alert??'None'}</dd></dl><pre tabIndex={0}>{JSON.stringify({monitoring:r.monitoring,incomplete:r.incomplete,details:r.details,routing:r.routing},null,2)}</pre></details>
      </article>)}
    </div>
    <details><summary>Recent receiver rejection diagnostics ({rejections.length})</summary>{rejections.length?rejections.map(r=><p key={r.id}>{new Date(r.at).toLocaleString()} · {r.text}</p>):<p>No receiver rejections in the recent workspace page. Configuration audit contains the paged history.</p>}</details>
    <p className="muted">An Oncall receiver check proves this local admission path. It does not verify a provider account or delivery. <a href="/docs/monitoring-providers">Provider setup, schemas and current limits</a>.</p>
  </section>;
}
