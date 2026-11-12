import { useId, type FormEvent, type ReactNode } from "react";
import {ValidationForm, useValidationField} from "./form-validation";

// The labelled field and the busy-aware form every app screen and the local sign-in door share.
export function Field({
  name,
  label,
  type = "text",
  required = true,
  value,
  children,
  help,
  multiple = false,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  value?: string;
  children?: ReactNode;
  help?: string;
  multiple?: boolean;
}) {
  const helpId = useId();
  const validation = useValidationField(helpId + "-control");
  const description = [help ? helpId : null, validation.control["aria-describedby"]].filter(Boolean).join(" ") || undefined;
  return (
    <label className="field">
      <span id={helpId + '-label'}>{label}</span>
      {children ? (
        <select {...validation.control} name={name} multiple={multiple} required={required} defaultValue={value} aria-labelledby={helpId + '-label'} aria-describedby={description}>
          {children}
        </select>
      ) : type === "textarea" ? (
        <textarea
          {...validation.control}
          name={name}
          required={required}
          defaultValue={value}
          rows={3}
          aria-labelledby={helpId + '-label'}
          aria-describedby={description}
        />
      ) : (
        <input
          {...validation.control}
          name={name}
          type={type}
          required={required}
          defaultValue={value}
          minLength={type === "password" ? 12 : undefined}
          aria-labelledby={helpId + '-label'}
          aria-describedby={description}
        />
      )}
      {help && <small id={helpId}>{help}</small>}
      {validation.error && <span id={validation.errorId} role="alert">{validation.error}</span>}
    </label>
  );
}
export function Form({
  children,
  onSubmit,
  label,
  busy,
  disabled = false,
  inlineValidation = false,
}: {
  children: ReactNode;
  onSubmit: (data: any) => Promise<any>;
  label: string;
  busy: boolean;
  disabled?: boolean;
  inlineValidation?: boolean;
}) {
  const Container = inlineValidation ? ValidationForm : "form";
  return (
    <Container
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const values = new FormData(form);
        const data = Object.fromEntries(values);
        for (const element of Array.from(form.elements)) {
          const select = element as unknown as HTMLSelectElement;
          if (select.tagName === "SELECT" && select.multiple) data[select.name] = values.getAll(select.name) as any;
        }
        if (await onSubmit(data)) form.reset();
      }}
    >
      <fieldset disabled={busy || disabled}>
        {children}
        <button className="primary" type="submit">
          {busy ? "Saving…" : label}
        </button>
      </fieldset>
    </Container>
  );
}
