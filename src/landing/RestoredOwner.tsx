import { useEffect, useRef, useState } from "react";
import { Form } from "../forms";
import { request } from "../useWorkspace";

type Administrator = { id: string; name: string };

export function RestoredOwner({ onLinked, autoOpen = false }: { onLinked: () => Promise<void>; autoOpen?: boolean }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (detailsRef.current) setOpen(detailsRef.current.open);
  }, []);
  useEffect(() => { if (autoOpen && detailsRef.current) detailsRef.current.open = true; }, [autoOpen]);
  return (
    <details ref={detailsRef} className="oc-door-restore" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Map an archived administrator after restore</summary>
      <p>Restoring brings back your team identities, but no passwords or sign-in sessions. Link the new installation owner to your own archived administrator to open the restored workspace. This requires an archive restored into an empty installation; existing workspaces with password accounts keep their usual sign-in.</p>
      {!autoOpen && <p>First use the private owner entry from <code>rer dev</code>, or <a href="/signin">sign in with the owner's email</a> if email delivery is configured. Then return here, choose your administrator, and confirm that identity.</p>}
      {open && <AdministratorPicker onLinked={onLinked} />}
    </details>
  );
}

function AdministratorPicker({ onLinked }: { onLinked: () => Promise<void> }) {
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    setSelected("");
    setConfirmed(false);
    request("/api/identity-link/administrators").then((value) => {
      if (current) setAdministrators(value.administrators);
    }).catch((cause) => {
      if (current) { setAdministrators([]); setError(cause.message); }
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [attempt]);

  async function link() {
    if (!selected || !confirmed) return;
    setBusy(true);
    setError("");
    try {
      await request("/api/identity-link", { adminMapping: selected, confirm: confirmed });
      await onLinked();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Mapping failed. Try again.");
      setConfirmed(false);
    } finally { setBusy(false); }
  }

  return (
    <div aria-busy={loading || busy}>
      {loading ? <p role="status">Loading archived administrators…</p> : <>
        {error && <p className="oc-door-error" role="alert">{error}</p>}
        {!error && administrators.length === 0 && <p role="status">No active archived administrators are available to map.</p>}
        {administrators.length > 0 && <Form busy={busy} label="Confirm restored owner mapping" onSubmit={link}>
          <label className="field">
            <span>Archived administrator</span>
            <select name="adminMapping" required value={selected} onChange={(event) => {
              setSelected(event.target.value);
              setConfirmed(false);
            }}>
              <option value="" disabled>Choose your archived administrator</option>
              {administrators.map((admin) => <option key={admin.id} value={admin.id}>
                {admin.name} — email not recorded — {admin.id}
              </option>)}
            </select>
          </label>
          {selected && <p className="oc-door-identity">Archived ID: <code>{selected}</code>. Email not recorded in the archived member record.</p>}
          <label className="oc-door-confirm">
            <input type="checkbox" name="confirm" required checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            <span>I confirm this is my archived administrator identity.</span>
          </label>
        </Form>}
        <button type="button" className="oc-door-reload" disabled={busy} onClick={() => setAttempt((value) => value + 1)}>Reload administrators</button>
      </>}
    </div>
  );
}
