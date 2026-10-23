import { cloneElement, useId, type ReactElement } from 'react';
import './tooltip.css';

export function Tooltip({label,children}:{label:string;children:ReactElement<{ 'aria-describedby'?:string }>}) {
  const id=useId();
  return <span className="oncall-tooltip">{cloneElement(children,{'aria-describedby':[children.props['aria-describedby'],id].filter(Boolean).join(' ')})}<span id={id} role="tooltip" className="oncall-tooltip-content">{label}</span></span>;
}
