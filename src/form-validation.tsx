import {createContext, forwardRef, useContext, useState, type ComponentPropsWithoutRef} from 'react';

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
const Errors = createContext<Record<string, string>>({});

/** Keep native field constraints, with persistent feedback instead of a browser popup. */
export const ValidationForm = forwardRef<HTMLFormElement, ComponentPropsWithoutRef<'form'>>(function ValidationForm({children, onSubmit, ...props}, ref) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  return <Errors.Provider value={errors}><form {...props} ref={ref} noValidate
    onInvalidCapture={event => {
      event.preventDefault();
      const field = event.target as unknown as Control;
      const label = field.getAttribute('aria-labelledby')?.split(' ').map(id => document.getElementById(id)?.textContent).join(' ') || field.getAttribute('aria-label') || field.name;
      const message = field.validity.valueMissing ? `${label} is required.` : `${label}: ${field.validationMessage}`;
      setErrors(current => ({...current, [field.id]: message}));
    }}
    onChange={event => {
      props.onChange?.(event);
      const field = event.target as unknown as Control;
      if (errors[field.id] && field.validity?.valid) setErrors(current => {const next = {...current};delete next[field.id];return next;});
    }}
    onSubmit={event => {
      setErrors({});
      if (!event.currentTarget.checkValidity()) {
        event.preventDefault();
        const first = event.currentTarget.querySelector('input:invalid,select:invalid,textarea:invalid') as HTMLElement | null;
        first?.focus();
        return;
      }
      onSubmit?.(event);
    }}>{children}</form></Errors.Provider>;
});

export function useValidationField(id: string) {
  const error = useContext(Errors)[id];
  return {error, errorId: id + '-error', control: {id, 'aria-invalid': error ? true as const : undefined, 'aria-describedby': error ? id + '-error' : undefined}};
}
