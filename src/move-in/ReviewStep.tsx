import { useEffect, useState } from 'react'
import { CompatibilityReview } from './CompatibilityReview'
export function ReviewStep({ preview, bytes, filename, busy, back, next }: { preview: any; bytes: Uint8Array | null; filename: string; busy: boolean; back: () => void; next: () => void }) {
 const [download,setDownload]=useState('')
 useEffect(()=>{if(!bytes)return;const url=URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer],{type:'application/json'}));setDownload(url);return()=>URL.revokeObjectURL(url)},[bytes])
 return <section className="scheduling-panel move-in-step" aria-labelledby="move-in-review-title">
  <h2 id="move-in-review-title">2 · Review</h2><p>Nothing has been imported. Review what will arrive paused.</p>
  <CompatibilityReview preview={preview} busy={busy} hasJob={false} />
  {download&&<a className="move-in-footer" href={download} download={filename}>Download read data</a>}
  <div className="move-in-actions"><button disabled={busy} onClick={back}>Back to connection</button><button className="scheduling-primary" disabled={busy} onClick={next}>Import paused</button></div>
 </section>
}
