import { useState } from 'react'
import { ExportHelp } from './ExportHelp'
import { vendorNames } from './vendor-formats'
import type { Provider, Region } from './collect/bundle'

export function ConnectStep({ source, vendor, choose, fileVendor, connect, busy, read, file }: {
 source: string; vendor: string; choose: (value: string) => void; fileVendor: (value: string) => void; connect: boolean; busy: boolean;
 read: (source: Provider, region: Region, key?: string) => Promise<void>; file: (file: File) => void
}) {
 const [key, setKey] = useState(''), [region, setRegion] = useState<Region>('us'), [useKey, setUseKey] = useState(false)
 const upload = <label className="scheduling-field">Export JSON<input type="file" accept="application/json,.json" disabled={busy} onChange={event => { const chosen = event.target.files?.[0]; if (chosen) { file(chosen); event.target.value = '' } }} /></label>
 const keyPath = source === 'opsgenie' || !connect || useKey
 return <section className="scheduling-panel move-in-step" aria-labelledby="move-in-connect-title">
  <h2 id="move-in-connect-title">1 · Connect</h2>
  <p>Bring your schedules across. Your existing pager stays in charge.</p>
  <label className="scheduling-field"><span id="move-in-source">Source</span><select aria-labelledby="move-in-source" value={source} disabled={busy} onChange={event => { setKey(''); setUseKey(false); choose(event.target.value) }}>
   <option value="pagerduty">PagerDuty</option><option value="opsgenie">Opsgenie</option><option value="file">Other: from a file</option>
  </select></label>
  {source === 'file' ? <>
   <label className="scheduling-field"><span id="move-in-file-source">File source</span><select aria-labelledby="move-in-file-source" value={vendor} disabled={busy} onChange={event => fileVendor(event.target.value)}>{Object.entries(vendorNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
   {upload}
   <details className="move-in-fallback"><summary>No key? Use the exporter on your computer</summary><ExportHelp vendor={vendor} /></details>
  </> : <>
   <label className="scheduling-field"><span id="move-in-region">Region</span><select aria-labelledby="move-in-region" value={region} disabled={busy} onChange={event => setRegion(event.target.value as Region)}><option value="us">United States</option><option value="eu">Europe</option></select></label>
   {keyPath ? <form onSubmit={event => { event.preventDefault(); const credential = key; void read(source as Provider, region, credential).finally(() => setKey('')) }}>
    <label className="scheduling-field">Read-only key<input type="password" value={key} onChange={event => setKey(event.target.value)} disabled={busy} autoComplete="off" autoCapitalize="none" spellCheck={false} required maxLength={4096} /></label>
    <button className="scheduling-primary" disabled={busy || !key.trim()}>Read schedules</button>
    {source==='pagerduty'&&connect&&useKey&&<button type="button" className="move-in-quiet" disabled={busy} onClick={()=>{setKey('');setUseKey(false)}}>Use PagerDuty sign-in</button>}
   </form> : <>
    <a className="move-in-primary" href={'/api/move-in/pagerduty/start?region=' + region}>Connect PagerDuty</a>
    <button type="button" className="move-in-quiet" disabled={busy} onClick={() => setUseKey(true)}>Use a read-only key instead</button>
   </>}
   {source === 'pagerduty' && !connect && <details className="move-in-install"><summary>Sign in with PagerDuty needs this install’s PagerDuty app</summary>
    <p>Register a PagerDuty app with this redirect address:</p><code>{typeof location === 'undefined' ? '<app address>' : location.origin}/api/move-in/pagerduty/callback</code>
    <pre><code>rer secret set PAGERDUTY_OAUTH_CLIENT_ID{'\n'}rer secret set PAGERDUTY_OAUTH_CLIENT_SECRET</code></pre>
   </details>}
   <details className="move-in-fallback"><summary>No key? Use the exporter on your computer</summary><ExportHelp vendor={source} />{upload}</details>
  </>}
 </section>
}
