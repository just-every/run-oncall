import { ReviewedChange } from './schedule-coverage/ReviewedChange';
import type { ScheduleReview } from './schedule-coverage/review';
import { Tooltip } from './app/Tooltip';
import { ScheduleNowNext, ScheduleSummary } from './ScheduleSummary';
import { cloneElement, isValidElement, useCallback, useEffect, useId, useRef, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import type { Member, State } from "./family/response-operations/domain";
import type { Schedule, Rotation, Coverage, Override } from "./family/response-operations/schedules";
import type { EscalationPolicy, EscalationJob, SyntheticBehavior } from "./family/response-operations/escalation";
import type { PagingArchive } from "./family/response-operations/paging-archive";
import "./scheduling.css";

type ModuleState = PagingArchive & { revision: number; workspaceRevision: number };
type Props = {
  page: "schedules";
  demo?: boolean;
  actor: Member;
  state: State;
  request: (path: string, data?: unknown) => Promise<any>;
  refreshWorkspace?: () => Promise<void>;
};
type PreviewResult = { scheduleId: string; timezone: string; revision: number; from: number; to: number; windows: Coverage[] };
type ReplayResult = { job: string; data: unknown };
const titleCase = (value: string) => value[0].toUpperCase() + value.slice(1);
const iso = (at: number) => new Date(at).toISOString();
const utcDay = () => Math.floor(Date.now() / 86400000) * 86400000;
const formatClock = (at: number | null) => at === null ? "None" : iso(at);
const explain = (error: unknown) => error instanceof Error ? error.message : "Request failed; no success confirmed";
const utcHint = "Enter UTC date and time. Your device timezone is not used; seconds and milliseconds are preserved.";
function UtcInput({ value, onChange, ...props }: Omit<ComponentProps<"input">, "value" | "onChange" | "type" | "step"> & { value: string; onChange: (value: string) => void }) {
  return <input {...props} type="datetime-local" step="0.001" value={value.replace(/Z$/, "")} onChange={event => {
    const entered = event.target.value;
    const [clock, fraction = ""] = entered.split(".");
    onChange(entered ? `${clock.length === 16 ? `${clock}:00` : clock}.${fraction.padEnd(3, "0")}Z` : "");
  }} />;
}
function utcClock(value: string, label: string): number {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value))
    throw Error(`${label} must be a UTC ISO timestamp ending in Z`);
  const at = Date.parse(value);
  const normalized = value.length === 20 ? value.replace("Z", ".000Z") : value;
  if (!Number.isFinite(at) || iso(at) !== normalized) throw Error(`${label} must be a real UTC date`);
  return at;
}
function newSchedule(service: string): Schedule {
  const start = utcDay();
  const rotation: Rotation = { anchorLocal: iso(start).slice(0, 16), periodDays: 1, members: [], ambiguity: "earlier" };
  return { id: `schedule-${crypto.randomUUID().slice(0, 8)}`, name: "", service,
    revision: 0, timezone: "UTC", validFrom: iso(start), validUntil: null,
    primary: { ...rotation, members: [] }, backup: { ...rotation, members: [] }, overrides: [] };
}
function Icon({ name }: { name: "calendar" | "clock" | "people" | "bolt" | "check" | "target" }) {
  const paths = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18m-13 5h2m4 0h2" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    people: <><circle cx="9" cy="7" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3m3-17a3 3 0 0 1 0 6m0 4a5 5 0 0 1 3 5v2" /></>,
    bolt: <path d="m13 2-8 12h6l-1 8 9-13h-6z" />,
    check: <><circle cx="12" cy="12" r="9" /><path d="m7 12 3 3 7-7" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="m12 12 9-9" /></>,
  };
  return <svg className="scheduling-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}
function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  const identity = useId();
  const control = isValidElement<{ "aria-labelledby"?: string; "aria-describedby"?: string }>(children)
    ? cloneElement(children, { "aria-labelledby": `${identity}-label`, "aria-describedby": hint ? `${identity}-hint` : undefined }) : children;
  return <label className="scheduling-field"><span id={`${identity}-label`}>{label}</span>{control}{hint && <small id={`${identity}-hint`}>{hint}</small>}</label>;
}
function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "blue" }) {
  return <span className={`scheduling-tag ${tone}`}>{children}</span>;
}
function Empty({ title, children }: { title: string; children: ReactNode }) {
  return <div className="scheduling-empty"><Icon name="calendar" /><h3>{title}</h3>{children}</div>;
}

export function SchedulingWorkspace({ page, actor, state, request, refreshWorkspace, demo }: Props) {
  const [data, setData] = useState<ModuleState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedSchedule, setSelectedSchedule] = useState("");
  const [draft, setDraft] = useState<Schedule | null>(null);
  const [changeReview, setChangeReview] = useState<ScheduleReview | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewFrom, setPreviewFrom] = useState(() => iso(utcDay()));
  const [previewTo, setPreviewTo] = useState(() => iso(utcDay() + 86400000));
  const admin = actor.active && actor.role === "admin";
  const responder = actor.active && actor.role !== "viewer";
  const readGeneration = useRef(0);
  const initialized = useRef(false);
  const load = useCallback(async () => {
    const generation = ++readGeneration.current;
    try {
      const loaded: ModuleState = await request("/api/paging/state");
      if (generation !== readGeneration.current) return null;
      setData(loaded);
      if (!initialized.current) {
        initialized.current = true;
        const first = loaded.schedules[0];
        if (first) {
          setSelectedSchedule(current => current || first.id);
          setDraft(current => current ?? structuredClone(first));
        }

      }
      return loaded;
    } catch (failure) {
      if (generation !== readGeneration.current) return null;
      throw failure;
    }
  }, [request]);
  useEffect(() => {
    load().catch((failure: unknown) => setError(explain(failure)));
    return () => { ++readGeneration.current; };
  }, [load]);
  const memberName = (id: string | null) => id === null ? "Coverage gap" : !id ? "Choose a responder" : state.members.find(m => m.id === id)?.name ?? `Missing member (${id})`;
  const serviceName = (id: string) => state.services.find(s => s.id === id)?.name ?? `Missing service (${id})`;

  const savedSchedule = data?.schedules.find(s => s.id === selectedSchedule);
  const activeMembers = state.members.filter(m => m.active && m.role !== "viewer");

  async function run<T>(operation: () => Promise<T>, success: string): Promise<T | null> {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await operation();
      try { await load(); } catch (failure) { setError(`${success}; refresh failed: ${explain(failure)}`); return result; }
      setNotice(success);
      return result;
    } catch (failure) { setError(explain(failure)); return null; }
    finally { setBusy(false); }
  }
  async function refresh() {
    setBusy(true); setError(""); setNotice("");
    try {
      // Supersede an initial read before awaiting the coordination refresh too.
      ++readGeneration.current;
      const [, latest] = await Promise.all([refreshWorkspace?.(), load()]);
      if (latest) setNotice("Scheduling records refreshed; unsaved edits are retained");
    }
    catch (failure) { setError(explain(failure)); }
    finally { setBusy(false); }
  }
  async function reloadSchedule() {
    setBusy(true); setError(""); setNotice("");
    try {
      const latest = await load();
      if (!latest) return;
      const saved = latest.schedules.find(s => s.id === selectedSchedule);
      if (!saved) throw Error("The selected schedule is no longer available; choose another saved schedule");
      setChangeReview(null); setDraft(structuredClone(saved)); setPreview(null);
      setNotice("Editor reloaded from the latest saved schedule");
    } catch (failure) { setError(explain(failure)); }
    finally { setBusy(false); }
  }
  function chooseSchedule(id: string) {
    setChangeReview(null);
    setSelectedSchedule(id); setPreview(null); setNotice(""); setError("");
    const selected = data?.schedules.find(s => s.id === id);
    setDraft(selected ? structuredClone(selected) : null);
  }
  function patchSchedule(patch: Partial<Schedule>) {
    setChangeReview(null);
    if (draft) setDraft({ ...draft, ...patch });
  }
  function patchRotation(role: "primary" | "backup", patch: Partial<Rotation>) {
    setChangeReview(null);
    if (draft) setDraft({ ...draft, [role]: { ...draft[role], ...patch } });
  }
  function moveSlot(role: "primary" | "backup", index: number, direction: -1 | 1) {
    if (!draft) return;
    const members = [...draft[role].members];
    [members[index], members[index + direction]] = [members[index + direction], members[index]];
    patchRotation(role, { members });
  }
  function patchOverride(index: number, patch: Partial<Override>) {
    if (draft) patchSchedule({ overrides: draft.overrides.map((o, i) => i === index ? { ...o, ...patch } : o) });
  }
  function optionsForMember(id: string, gap = false) {
    const member = state.members.find(m => m.id === id);
    return <>
      <option value="">{gap ? "Explicit coverage gap" : "Choose an active responder"}</option>
      {id && (!member || !member.active || member.role === "viewer") && <option value={id}>{memberName(id)} · unavailable slot retained</option>}
      {activeMembers.map(m => <option key={m.id} value={m.id}>{m.name} · {m.role}</option>)}
    </>;
  }
  async function saveSchedule(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    if (draft.revision > 0) {
      const review = await run<ScheduleReview>(() => request(`/api/schedules/${encodeURIComponent(draft.id)}/review`, {schedule:draft,from:utcClock(previewFrom,"Preview from"),to:utcClock(previewTo,"Preview to")}), "Schedule change ready for review; nothing saved");
      setChangeReview(review);return;
    }
    const saved = await run<Schedule>(() => request("/api/paging/schedules", { ...draft, validUntil: draft.validUntil || null }), "Schedule saved");
    if (saved) { setSelectedSchedule(saved.id); setDraft(structuredClone(saved)); setPreview(null); }
  }
  async function applyReviewedChange() {
    if (!changeReview || !draft) return;
    const result = await run<{schedule:Schedule}>(() => request(`/api/schedules/${encodeURIComponent(draft.id)}/apply`, {schedule:draft,from:changeReview.from,to:changeReview.to,digest:changeReview.digest,confirmed:true}), "Schedule saved");
    if(result){setDraft(structuredClone(result.schedule));setChangeReview(null);setPreview(null);}
  }
  async function previewCoverage(event: FormEvent) {
    event.preventDefault();
    if (!savedSchedule) return;
    await run(async () => {
      const from = utcClock(previewFrom, "Preview from"), to = utcClock(previewTo, "Preview to");
      const windows: Coverage[] = await request("/api/paging/preview", { scheduleId: savedSchedule.id, from, to });
      const evaluated = windows[0];
      if (!evaluated) throw Error("Preview returned no coverage evaluation metadata");
      setPreview({ scheduleId: evaluated.scheduleId, timezone: evaluated.timezone, revision: evaluated.scheduleRevision, from, to, windows });
      return windows;
    }, "Saved schedule preview evaluated; no delivery or timer was created");
  }
  const previewWarnings = preview ? [...new Set(preview.windows.flatMap(w => w.warnings))] : [];
  const currentCoverage = preview?.windows[0];
  const dirty = Boolean(draft && savedSchedule && JSON.stringify(draft) !== JSON.stringify(savedSchedule));
  return <section className="scheduling-workspace" aria-label="Schedule management">
    {!demo && <div className="scheduling-boundary"><Icon name="bolt" /><span><strong>Paging OFF.</strong> No provider sends. Your existing pager remains authoritative.</span></div>}
    <div className="scheduling-toolbar">
      <p>{"Configure calendar rotations and inspect resolved UTC coverage."}</p>
      <button type="button" disabled={busy} onClick={refresh}>Refresh scheduling</button>
    </div>
    <div className="scheduling-feedback" aria-live="polite" role="status">{notice}</div>
    {error && <div className="scheduling-error" role="alert"><strong>Action needs attention</strong><p>{error}</p><span>Edits remain available.</span></div>}
    {!data ? <div className="scheduling-panel scheduling-loading"><p>{error ? "Scheduling data could not be loaded." : "Loading saved scheduling records…"}</p><button type="button" onClick={refresh} disabled={busy}>Retry scheduling load</button></div> : <>
      <div className="scheduling-selection">
        <Field label="Schedule"><select value={selectedSchedule} onChange={e => chooseSchedule(e.target.value)} disabled={busy}><option value="">Choose a saved schedule</option>{data.schedules.map(s => <option key={s.id} value={s.id}>{s.name} · {serviceName(s.service)} · revision {s.revision}</option>)}</select></Field>
        {admin && <button type="button" disabled={busy || !state.services.length} onClick={() => { const schedule = newSchedule(state.services[0].id); setChangeReview(null); setSelectedSchedule(""); setDraft(schedule); setPreviewFrom(schedule.validFrom); setPreviewTo(iso(Date.parse(schedule.validFrom) + 86400000)); setPreview(null); setError(""); setNotice(""); }}><span aria-hidden="true">＋ </span>New schedule</button>}
        {!admin && <Tag>Read-only schedule configuration</Tag>}
      </div>
      {savedSchedule && <ScheduleNowNext schedule={savedSchedule} state={state} request={request} />}
      {changeReview && <ReviewedChange key={changeReview.digest} review={changeReview} busy={busy} onApply={applyReviewedChange} />}
      <div className="scheduling-schedule-grid">
        <div className="scheduling-panel scheduling-editor">
          <div className="scheduling-panel-heading"><Icon name="calendar" /><div><h2>{draft ? (draft.revision ? draft.name : "New schedule") : "Service schedules"}</h2><p>{draft ? `${serviceName(draft.service)} · ${draft.revision ? `${admin ? "editing" : "saved"} revision ${draft.revision}` : "unsaved configuration"}` : "Own primary and backup calendar-day rotations."}</p></div><Tag tone="blue">Service</Tag></div>
          {!draft ? <Empty title={data.schedules.length ? "Choose a schedule" : "No schedules yet"}><p>{admin ? "Create a schedule for a persisted service, then verify its coverage." : "An administrator can create schedules for your services."}</p>{!state.services.length && <a href="#services">Create a service first →</a>}<a href="#team">Manage responder access →</a></Empty> : <form onSubmit={saveSchedule}>
            <fieldset disabled={!admin || busy} className="scheduling-editor-fields">
              <div className="scheduling-form-grid three">
                <Field label="Schedule ID"><input required maxLength={100} value={draft.id} readOnly={draft.revision > 0} onChange={e => patchSchedule({ id: e.target.value })} /></Field>
                <Field label="Schedule name"><input required maxLength={200} value={draft.name} onChange={e => patchSchedule({ name: e.target.value })} /></Field>
                <Field label="Service"><select required disabled={draft.revision > 0} value={draft.service} onChange={e => patchSchedule({ service: e.target.value })}>{state.services.map(s => <option key={s.id} value={s.id}>{s.name} · {s.environment}</option>)}</select></Field>
              </div>
              <div className="scheduling-form-grid three">
                <Field label="Timezone (IANA)" hint="Named zone, for example America/New_York; UTC is also supported."><input required value={draft.timezone} onChange={e => patchSchedule({ timezone: e.target.value })} /></Field>
                <Field label="Valid from (UTC)"><input required value={draft.validFrom} onChange={e => patchSchedule({ validFrom: e.target.value })} placeholder="2026-01-01T00:00:00.000Z" /></Field>
                <Field label="Valid until (UTC, optional)"><input value={draft.validUntil ?? ""} onChange={e => patchSchedule({ validUntil: e.target.value || null })} placeholder="No end date" /></Field>
              </div>
              <div className="scheduling-rotations">
                {(["primary", "backup"] as const).map(role => <section className="scheduling-rotation" key={role} aria-label={`${titleCase(role)} rotation`}>
                  <h3><Icon name="people" />{titleCase(role)} responders <small>(in order)</small></h3>
                  <Field label={`${titleCase(role)} rotation anchor (local)`} hint={`Enter the date and time on a clock in ${draft.timezone}. Handovers follow this timezone, including daylight saving changes.`}><input required type="datetime-local" value={draft[role].anchorLocal} onChange={e => patchRotation(role, { anchorLocal: e.target.value })} /></Field>
                  <div className="scheduling-form-grid two">
                    <Field label={`${titleCase(role)} interval (calendar days)`}><input required type="number" min={1} max={366} value={draft[role].periodDays} onChange={e => patchRotation(role, { periodDays: Number(e.target.value) })} /></Field>
                    <Field label={`${titleCase(role)} repeated time handling`}><select value={draft[role].ambiguity} onChange={e => patchRotation(role, { ambiguity: e.target.value as Rotation["ambiguity"] })}><option value="earlier">Earlier occurrence</option><option value="later">Later occurrence</option><option value="reject">Reject</option></select></Field>
                  </div>
                  <ol className="scheduling-member-slots">{draft[role].members.map((id, index) => <li key={`${role}-${index}`}>
                    <span className="scheduling-slot-index">{index + 1}.</span><span className="scheduling-avatar" aria-hidden="true">{id ? memberName(id).slice(0, 2).toUpperCase() : <Icon name="people" />}</span>
                    <Field label={`${titleCase(role)} responder ${index + 1}`}><select required value={id} onChange={e => patchRotation(role, { members: draft[role].members.map((member, i) => i === index ? e.target.value : member) })}>{optionsForMember(id)}</select></Field>
                    <div className="scheduling-slot-actions"><Tooltip label={`Move ${role} responder ${index + 1} up`}><button type="button" aria-label={`Move ${role} responder ${index + 1} up`} disabled={index === 0} onClick={() => moveSlot(role, index, -1)}>↑</button></Tooltip><Tooltip label={`Move ${role} responder ${index + 1} down`}><button type="button" aria-label={`Move ${role} responder ${index + 1} down`} disabled={index === draft[role].members.length - 1} onClick={() => moveSlot(role, index, 1)}>↓</button></Tooltip><Tooltip label={`Remove ${role} responder ${index + 1}`}><button type="button" aria-label={`Remove ${role} responder ${index + 1}`} onClick={() => patchRotation(role, { members: draft[role].members.filter((_, i) => i !== index) })}>×</button></Tooltip></div>
                  </li>)}</ol>
                  {!draft[role].members.length && <p className="scheduling-muted">No member slots. This rotation has a visible coverage gap.</p>}
                  <button type="button" disabled={draft[role].members.length >= 100} onClick={() => patchRotation(role, { members: [...draft[role].members, ""] })}><span aria-hidden="true">＋ </span>Add {role} responder</button>
                </section>)}
              </div>
              <div className="scheduling-gap-note"><Icon name="clock" /><p>Nonexistent local boundaries produce gaps. Repeated times follow each rotation's explicit policy. Unavailable member slots keep their positions; duplicate primary/backup selection leaves backup unavailable.</p></div>
              <section className="scheduling-overrides" aria-label="UTC override intervals">
                <div className="scheduling-subheading"><h3><Icon name="bolt" />UTC override intervals</h3><button type="button" onClick={() => patchSchedule({ overrides: [...draft.overrides, { id: `override-${crypto.randomUUID().slice(0, 8)}`, role: "primary", start: iso(Date.now()), end: iso(Date.now() + 3600000), member: null }] })}><span aria-hidden="true">＋ </span>Add interval</button></div>
                <p className="scheduling-muted">Half-open UTC intervals: start included, end excluded. Same-role adjacency is allowed; overlap is rejected.</p>
                {!draft.overrides.length && <p className="scheduling-muted">No overrides. Calendar rotations determine coverage.</p>}
                {draft.overrides.map((override, index) => <div className="scheduling-override" key={index}>
                  <div className="scheduling-form-grid three"><Field label={`Override ${index + 1} ID`}><input required value={override.id} onChange={e => patchOverride(index, { id: e.target.value })} /></Field><Field label={`Override ${index + 1} role`}><select value={override.role} onChange={e => patchOverride(index, { role: e.target.value as Override["role"] })}><option value="primary">Primary</option><option value="backup">Backup</option></select></Field><Field label={`Override ${index + 1} responder`}><select value={override.member ?? ""} onChange={e => patchOverride(index, { member: e.target.value || null })}>{optionsForMember(override.member ?? "", true)}</select></Field></div>
                  <div className="scheduling-form-grid two"><Field label={`Override ${index + 1} start (UTC)`} hint={utcHint}><UtcInput required value={override.start} onChange={start => patchOverride(index, { start })} /></Field><Field label={`Override ${index + 1} end (UTC)`} hint={utcHint}><UtcInput required value={override.end} onChange={end => patchOverride(index, { end })} /></Field></div>
                  <button type="button" aria-label={`Remove override ${index + 1}`} onClick={() => patchSchedule({ overrides: draft.overrides.filter((_, i) => i !== index) })}>Remove interval</button>
                </div>)}
              </section>
              {admin && <div className={`scheduling-save${!draft.revision || dirty ? " unsaved" : ""}`}><div><Icon name={!draft.revision || dirty ? "clock" : "check"} /><span>{!draft.revision ? "New configuration is not saved" : dirty ? `Unsaved changes to revision ${draft.revision}` : `Editing saved revision ${draft.revision}`}</span></div><button className="scheduling-primary" type="submit">Save schedule</button></div>}
            </fieldset>
            {savedSchedule && <button type="button" disabled={busy} className="scheduling-reload" onClick={reloadSchedule}>Reload saved version</button>}
          </form>}
        </div>
        <aside className="scheduling-coverage-column">
          <section className="scheduling-panel scheduling-coverage"><h2><Icon name="calendar" />Coverage windows <Tag>{preview?.windows.length ?? 0}</Tag></h2>
            <p className="scheduling-muted">Preview the saved configuration; no timer or delivery is created.</p>
            <form onSubmit={previewCoverage}><fieldset disabled={busy || !savedSchedule}><Field label="Preview from (UTC)" hint={utcHint}><UtcInput required value={previewFrom} onChange={setPreviewFrom} /></Field><Field label="Preview to (UTC)" hint={utcHint}><UtcInput required value={previewTo} onChange={setPreviewTo} /></Field><button type="submit">Preview coverage</button></fieldset></form>
            {dirty && <p className="scheduling-warning">Unsaved edits are not included in this preview.</p>}
            {!preview ? <p className="scheduling-muted">Choose a saved schedule and evaluate a bounded time range to inspect coverage.</p> : <><p className="scheduling-muted">Assignments at preview start: {formatClock(preview.from)}</p><div className="scheduling-coverage-rows">{(["primary", "backup"] as const).map(role => <div key={role} className="scheduling-coverage-row"><Icon name="clock" /><div><strong>{titleCase(role)}</strong><span>{memberName(currentCoverage?.[role] ?? null)}</span><small>{preview.timezone}</small></div><Tag tone={currentCoverage?.[role] ? "good" : "warn"}>{currentCoverage?.[role] ? "Assigned" : "Gap"}</Tag></div>)}</div></>}
          </section>
          {previewWarnings.length > 0 && <section className="scheduling-panel scheduling-validation" aria-label="Coverage warnings"><h2>Coverage warnings <Tag tone="warn">{previewWarnings.length}</Tag></h2><ul>{previewWarnings.map(warning => <li key={warning}>{warning}</li>)}</ul></section>}
          <section className="scheduling-panel scheduling-occurrences"><h2><Icon name="clock" />Resolved UTC windows</h2>{preview ? <><p className="scheduling-muted">{preview.timezone} · revision {preview.revision} · evaluated {formatClock(preview.from)}</p><div className="scheduling-window-list">{preview.windows.map((window, index) => <div className="scheduling-window" key={`${window.at}-${index}`}><time>{formatClock(window.at)}</time>{window.windows.map(w => <div key={w.role}><span className={`scheduling-dot ${w.member ? "good" : "warn"}`} /><strong>{titleCase(w.role)}: {memberName(w.member)}</strong><span>{w.origin} · {w.start ?? "unbounded"} → {w.end ?? "unbounded"}</span></div>)}</div>)}</div></> : <p className="scheduling-muted">UTC decisions and explicit gap explanations appear after preview.</p>}</section>
          <section className="scheduling-panel scheduling-status"><h2><Icon name="check" />Preview status</h2><p>{preview ? previewWarnings.length ? "The evaluated range contains warnings. Inspect each gap before relying on a schedule." : "No warnings in this evaluated range. This models schedule coverage; paging stays OFF." : "Coverage has not been evaluated."}</p></section>
        </aside>
      </div>
    </>}
    {savedSchedule && <ScheduleSummary schedule={savedSchedule} policies={data!.policies} admin={admin} request={request} onSaveStart={() => { setError(""); setNotice(""); }} onSaved={() => setNotice("Escalation data saved")} />}
  </section>;
}
