import {useEffect, useState} from 'react';
import type {Service, State} from '../family/response-operations/domain';
import {resolveLocal} from '../family/response-operations/schedules';
import type {IntakeRun} from '../intake/CompatibleTest';
import type {UrgencyDecision, UrgencyDraft} from './types';
import {request} from '../useWorkspace';
import {autosaveRequest} from '../app/autosave/useAutosave';
import {usePolicyDraft} from '../services/usePolicyDraft';
import {PolicyPublication} from '../services/PolicyPublication';
import {DraftComparison, DraftStorageFeedback} from '../services/DraftComparison';
import {UrgencyFields, defaultUrgency} from '../services/sections/UrgencySection';
import './urgency.css';
function wallTime(zone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(part => [part.type,part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
export function UrgencyPolicy({service, state, admin, refresh}: {service: Service; state: State; admin: boolean; busy: boolean; run: IntakeRun; refresh?: () => Promise<void>}) {
  const current = service.urgencyRules?.at(-1), version = current?.version ?? 0;
  const [browserZone, setBrowserZone] = useState('UTC');
  useEffect(() => {setBrowserZone(Intl.DateTimeFormat().resolvedOptions().timeZone);}, []);
  const saved: UrgencyDraft = current ? {mode:current.mode, timezone:current.timezone, weekly:current.weekly, holidays:current.holidays, inside:current.inside, outside:current.outside, reason:''} : {...defaultUrgency(), timezone:browserZone};
  const draft = usePolicyDraft('urgency', service.id, version, saved, !!admin), value = admin ? draft.value : saved;
  const [at, setAt] = useState(''), [severity, setSeverity] = useState('warning'), [preview, setPreview] = useState<UrgencyDecision | null>(null), [previewError, setPreviewError] = useState('');
  useEffect(() => {setAt(wallTime(value.timezone));}, [value.timezone]);
  const previewRule = JSON.stringify({...value, holidays:value.holidays.map(date => date.trim()).filter(Boolean), reason:'Sample alert'});
  useEffect(() => {
    let live = true;
    const timer = setTimeout(async () => {
      try {
        if (!at) return;
        const instant = resolveLocal(at, value.timezone, 'earlier');
        if (instant === null) {if(live){setPreview(null);setPreviewError('This time does not occur in the service’s time zone. Choose another time.');}return;}
        const result = await request('/api/urgency/preview', {service:service.id, severity, at:new Date(instant).toISOString(), ...(admin ? {rule:JSON.parse(previewRule)} : {})});
        if (live) {setPreview(result.decision); setPreviewError('');}
      } catch {if (live) {setPreview(null); setPreviewError('Complete the support hours and dates to see the sample decision.');}}
    }, 250);
    return () => {live = false; clearTimeout(timer);};
  }, [previewRule, at, severity, admin, service.id]);
  return <details className="urgency-policy service-urgency"><summary>Urgency · version {version}</summary>
    <DraftComparison stale={draft.stale} baseVersion={draft.baseVersion} currentVersion={version} useMine={draft.useMine}><UrgencyFields value={saved} change={() => {}} readOnly/></DraftComparison>
    <form onSubmit={event => event.preventDefault()}><UrgencyFields value={value} change={draft.change} readOnly={!admin}/>
      {admin && <PolicyPublication dirty={draft.dirty} stale={draft.stale} version={version + 1} publish={async reason => {
        const result = await autosaveRequest('/api/urgency/services/' + encodeURIComponent(service.id), {baseVersion:draft.baseVersion, ...draft.value, holidays:draft.value.holidays.map(date => date.trim()).filter(Boolean), reason});
        await refresh?.(); draft.published(); return result;
      }}/>}
      <DraftStorageFeedback failed={draft.storageFailed} retry={draft.retryStorage}/>
    </form>
    <section aria-label="Sample alert"><h4>Sample alert</h4><div className="urgency-fields">
      <label className="field">Time in {value.timezone.replaceAll('_',' ')}<input type="datetime-local" value={at} onChange={event => setAt(event.target.value)}/></label>
      <label className="field">Sample severity<select aria-label="Sample severity" value={severity} onChange={event => setSeverity(event.target.value)}><option value="critical">Critical</option><option value="warning">Warning</option><option value="info">Info</option><option value="unknown">Unknown</option></select></label>
    </div>{preview && <p role="status">{preview.urgency === 'high' ? 'High' : 'Low'} urgency</p>}{previewError && <p role="status">{previewError}</p>}</section>
    <details className="service-policy-history"><summary>Urgency history ({service.urgencyRules?.length ?? 0})</summary>{service.urgencyRules?.slice().reverse().map(rule => <article key={rule.version}><h4>Version {rule.version}</h4><p>{rule.reason} · {state.members.find(member => member.id === rule.by)?.name ?? 'Former member'}</p><UrgencyFields value={rule} change={() => {}} readOnly/></article>)}</details>
  </details>;
}
