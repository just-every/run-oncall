import { cloneElement, useId, useState, type ReactElement } from 'react';
import './tooltip.css';

export function Tooltip({label,children,dismissOnEscape=false}:{label:string;dismissOnEscape?:boolean;children:ReactElement<{ 'aria-describedby'?:string }>}) {
  const id=useId(),[dismissed,setDismissed]=useState(false);
  return <span className="oncall-tooltip" data-dismissed={dismissOnEscape&&dismissed?true:undefined} onKeyDown={event=>{if(dismissOnEscape&&event.key==='Escape')setDismissed(true);}} onMouseEnter={()=>setDismissed(false)} onBlur={()=>setDismissed(false)}>{cloneElement(children,{'aria-describedby':[children.props['aria-describedby'],id].filter(Boolean).join(' ')})}<span id={id} role="tooltip" className="oncall-tooltip-content">{label}</span></span>;
}
