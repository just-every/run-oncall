import { cloneElement, useEffect, useId, useLayoutEffect, useRef, useState, type ReactElement } from 'react';
import './tooltip.css';

// The one tooltip for icon-only controls (H19). Its text is the control's accessible name; it shows
// about 300 ms after hover and at once on focus, names a disabled control on hover, Escape dismisses
// it, and it sits above the control inside the viewport without taking taps.
export function Tooltip({label,children}:{label:string;children:ReactElement<{'aria-label'?:string;'aria-labelledby'?:string}>}) {
  const id=useId();
  const tip=useRef<HTMLSpanElement>(null);
  const timer=useRef(0);
  const [hovered,setHovered]=useState(false);
  const [focused,setFocused]=useState(false);
  const [dismissed,setDismissed]=useState(false);
  const open=(hovered||focused)&&!dismissed;
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  useEffect(()=>{
    if(!open)return;
    const dismiss=(event:KeyboardEvent)=>{if(event.key==='Escape')setDismissed(true);};
    document.addEventListener('keydown',dismiss);
    return ()=>document.removeEventListener('keydown',dismiss);
  },[open]);
  useLayoutEffect(()=>{if(open&&tip.current)place(tip.current);},[open,label]);
  return <span className="oncall-tooltip"
    onPointerEnter={()=>{setDismissed(false);clearTimeout(timer.current);timer.current=window.setTimeout(()=>setHovered(true),300);}}
    onPointerLeave={()=>{clearTimeout(timer.current);setHovered(false);}}
    onFocus={()=>{setDismissed(false);setFocused(true);}}
    onBlur={()=>setFocused(false)}>
    {cloneElement(children,{'aria-label':undefined,'aria-labelledby':id})}
    <span ref={tip} id={id} role="tooltip" className="oncall-tooltip-content" hidden={!open}>{label}</span>
  </span>;
}

// Centred above the control; moved inward where the viewport edge would cut it, below where the top would.
function place(tip:HTMLElement) {
  tip.style.removeProperty('--tip-shift');
  delete tip.dataset.side;
  const edge=8,box=tip.getBoundingClientRect(),width=document.documentElement.clientWidth;
  const shift=box.left<edge?edge-box.left:box.right>width-edge?width-edge-box.right:0;
  if(shift)tip.style.setProperty('--tip-shift',`${shift}px`);
  if(box.top<edge)tip.dataset.side='below';
}
