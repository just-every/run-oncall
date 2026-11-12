import {cloneElement, useId, type ReactElement, type ReactNode} from 'react';
import {useValidationField} from '../form-validation';
export function RotaField({label, children}: {label: ReactNode; children: ReactElement<{'aria-labelledby'?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean | 'true' | 'false'; id?: string}>}) {
  const id = useId(), validation = useValidationField(children.props.id ?? id + '-control');
  const description = [children.props['aria-describedby'], validation.control['aria-describedby']].filter(Boolean).join(' ') || undefined;
  return <label className="field"><span id={id}>{label}</span>{cloneElement(children, {...validation.control, 'aria-invalid': validation.control['aria-invalid'] ?? children.props['aria-invalid'], 'aria-labelledby': id, 'aria-describedby': description})}{validation.error && <span id={validation.errorId} role="alert">{validation.error}</span>}</label>;
}
