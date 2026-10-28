import {cloneElement, useId, type ReactElement, type ReactNode} from 'react';
export function RotaField({label, children}: {label: ReactNode; children: ReactElement<{'aria-labelledby'?: string}>}) {
  const id = useId();
  return <label className="field"><span id={id}>{label}</span>{cloneElement(children, {'aria-labelledby': id})}</label>;
}
