import { CopyDetails } from './CopyDetails'
import { reviewCopy } from './review-copy'

export function CompatibilityReview({preview,busy,hasJob,confirm}:{preview:any;busy:boolean;hasJob:boolean;confirm?:()=>void}) {
 const represented=preview.items.filter((item:any)=>item.kind==='overrides'&&!item.rejection).length
 const copy=reviewCopy(preview.items)
 const fields=preview.items.flatMap((item:any)=>item.unmapped.filter((note:any)=>note.disposition))
 const fieldCount=(disposition:string)=>fields.filter((note:any)=>note.disposition===disposition).length
 return <><h3>Compatibility review</h3>
 <p>{preview.counts.unique} source objects · {preview.counts.mapped} mapped directly · {preview.counts.rejected} rejected · {preview.counts.unmapped} with differences or retained-only fields</p>
 <p>These counts overlap: mapped or rejected objects can also have differences or fields kept only as evidence. “Mapped directly” counts objects that create a paused user, schedule, policy or inactive integration.{represented>0&&` ${represented} ${represented===1?'override is':'overrides are'} represented inside the paused schedule, so ${represented===1?'it does':'they do'} not add to the directly mapped count.`} Review the details below before confirming.</p>
 {fields.length>0&&<p aria-label="Source field accounting">{fields.length} {preview.summary?.unchanged?'changed-source':'source'} fields accounted for: {fieldCount('mapped')} mapped, {fieldCount('lossy')} changed in conversion, {fieldCount('retained-only')} kept only for review, {fieldCount('refused')} refused. Copy or download the details below for source IDs, original field locations, values, decisions and receiving places. {preview.summary?.unchanged?'Unchanged objects keep their previous reviewed details in the saved import.':'Response metadata and parent bindings are included; nothing is truncated.'}</p>}
 <details open={preview.items.length<=100}><summary>Source object decisions ({preview.items.length})</summary><ul className="move-in-review">{preview.items.map((item:any,index:number)=><li key={index}>
  <strong>{copy.title(item)}</strong>
  {copy.effect(item)&&<p>{copy.effect(item)}</p>}
  {item.rejection&&<p>{copy.rejection(item)}</p>}
  {item.effects?.filter((effect:any)=>effect.targetKind==='schedule').flatMap((effect:any)=>copy.comparison(item,effect.value.equivalence)).map((text:string,i:number)=><p key={'comparison-'+i}>{text}</p>)}
  {item.effects?.filter((effect:any)=>effect.value.emailSettings).map((effect:any)=><p key={effect.targetId}>Inactive email settings: {effect.value.emailSettings.draft.mode} mode, {effect.value.emailSettings.draft.rules.length} converted rules. No address or intake. {effect.value.emailSettings.blocked?'Unconverted rules must be resolved before activation.':'An administrator must explicitly activate these settings.'}</p>)}
  {copy.differences(item).map(({text,originals}:{text:string;originals:any[]},i:number)=><div key={i}>{text}{originals.length>0&&<details><summary>Original settings</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(originals.length===1?originals[0]:originals,null,2)}</pre></details>}</div>)}
 </li>)}</ul></details>
 <CopyDetails value={preview}/>
 {confirm&&<button disabled={busy||hasJob} onClick={confirm}>Confirm paused import</button>}</>
}
