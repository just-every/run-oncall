import { useId, type FormEvent, type ReactNode } from "react";

// The labelled field and the busy-aware form every app screen and the local sign-in door share.
export function Field({
  name,
  label,
  type = "text",
  required = true,
  value,
  children,
  help,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  value?: string;
  children?: ReactNode;
  help?: string;
}) {
  const helpId = useId();
  return (
    <label className="field">
      <span id={helpId + '-label'}>{label}</span>
      {children ? (
        <select name={name} required={required} defaultValue={value} aria-labelledby={helpId + '-label'} aria-describedby={help ? helpId : undefined}>
          {children}
        </select>
      ) : type === "textarea" ? (
        <textarea
          name={name}
          required={required}
          defaultValue={value}
          rows={3}
          aria-labelledby={helpId + '-label'}
          aria-describedby={help ? helpId : undefined}
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          defaultValue={value}
          minLength={type === "password" ? 12 : undefined}
          aria-labelledby={helpId + '-label'}
          aria-describedby={help ? helpId : undefined}
        />
      )}
      {help && <small id={helpId}>{help}</small>}
    </label>
  );
}
export function Form({
  children,
  onSubmit,
  label,
  busy,
  disabled = false,
}: {
  children: ReactNode;
  onSubmit: (data: any) => Promise<any>;
  label: string;
  busy: boolean;
  disabled?: boolean;
}) {
  return (
    <form
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = Object.fromEntries(new FormData(form));
        if (await onSubmit(data)) form.reset();
      }}
    >
      <fieldset disabled={busy || disabled}>
        {children}
        <button className="primary" type="submit">
          {busy ? "Saving…" : label}
        </button>
      </fieldset>
    </form>
  );
}
