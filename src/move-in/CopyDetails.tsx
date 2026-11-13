import { useEffect, useState } from 'react'

export function CopyDetails({value}:{value:unknown}) {
 const [status,setStatus]=useState(''),[show,setShow]=useState(false)
 const details=JSON.stringify(value,null,2)
 useEffect(()=>{setStatus('');setShow(false)},[details])
 return <div><button type="button" onClick={async()=>{
  try {await navigator.clipboard.writeText(details);setStatus('Details copied');setShow(false)}
  catch {setStatus('Copy was unavailable. Select and copy the details below.');setShow(true)}
 }}>Copy details</button>{status&&<p role="status">{status}</p>}
 {show&&<label className="scheduling-field">Support details<textarea readOnly rows={8} value={details} onFocus={event=>event.currentTarget.select()}/></label>}</div>
}
