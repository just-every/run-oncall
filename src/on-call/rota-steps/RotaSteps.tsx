import {useRotaTooltips} from '../useRotaTooltips';
import {Link, useNavigate} from '@tanstack/react-router';
import {useMemo, useRef, useState} from 'react';
import {FailureLine, useActionFailure} from '../../app/FailureLine';
import {request, HttpFailure, InterruptedTransport} from '../../useWorkspace';
import {ReviewedChange} from '../../schedule-coverage/ReviewedChange';
import type {ScheduleReview} from '../../schedule-coverage/review';
import type {Schedule} from '../../family/response-operations/schedules';
import type {Member, State} from '../../family/response-operations/domain';
import {teamCoverage} from '../../teams/model';
import {readLocalDraft, writeLocalDraft, removeLocalDraft, policyDrafts} from '../../app/autosave/localDraft';
import {newDraft, editDraft, toSchedule, isRotaDraft, sameRota, RotaDraftError, type RotaDraft} from './draft';
import {StepService} from './StepService';
import {StepPeople} from './StepPeople';
import {StepHandover} from './StepHandover';
import {StepCheck} from './StepCheck';
import {RotaPreview} from './RotaPreview';
import '../on-call.css';

const steps = ['Service and name', 'Who is on', 'Hand-over', 'Check'];
export function RotaSteps({state, actor, schedule, service = '', refresh}: {state: State; actor: Member; schedule?: Schedule; service?: string; refresh: () => Promise<void>}) {
  const tooltips = useRotaTooltips();
  const available = state.services.filter(service => teamCoverage(state, actor, service.id));
  const draftId = useRef(schedule?.id ?? 'new:' + service).current, baseVersion = useRef(schedule?.revision ?? 0).current;
  const [draft, setDraft] = useState<RotaDraft>(() => {const kept=(readLocalDraft<RotaDraft>('rota', draftId, baseVersion) ?? policyDrafts<RotaDraft>('rota', draftId)[0])?.value;return isRotaDraft(kept)?kept:schedule?editDraft(schedule):newDraft(available.some(row=>row.id===service)?service:available[0]?.id??'',state.members.filter(person=>person.active&&['admin','responder'].includes(person.role)).slice(0,2).map(person=>person.id));});
  const [step, setStep] = useState(0), [busy, setBusy] = useState(false), [review, setReview] = useState<ScheduleReview | null>(null), [notice, setNotice] = useState('');
  const [previewed, setPreviewed] = useState<Schedule | null>(null), failures = useActionFailure(), navigate = useNavigate(), form = useRef<HTMLFormElement>(null);
  const validation = useMemo(() => {
    try {return {schedule: toSchedule(draft), error: null};}
    catch (error) {return {schedule: null, error: {field: error instanceof RotaDraftError ? error.field : 'handover', message: error instanceof Error ? error.message : String(error)}};}
  }, [draft]);
  const proposed = validation.schedule;
  const update = (value: Partial<RotaDraft>) => {setDraft(current => {const next = {...current, ...value};writeLocalDraft({kind:'rota', id:draftId, baseVersion, value:next});return next;});setReview(null);setNotice('');failures.clear();};
  const canEdit = available.some(service => service.id === draft.service);
  const finish = async () => {
    try {
      if (!form.current?.reportValidity() || !draft.name.trim()) return;
      const value = toSchedule(draft);
      if (JSON.stringify(value) !== JSON.stringify(previewed)) throw Error('Wait for the current preview before continuing.');
      if (schedule && sameRota(value,schedule)) {setNotice('Nothing to change');return;}
      setBusy(true);failures.clear();setNotice('');
      if (schedule) {
        const from = Math.max(Date.now(), Date.parse(value.validFrom)), to = from + 31 * 86_400_000;
        setReview(await request(`/api/schedules/${encodeURIComponent(schedule.id)}/review`, {schedule: value, from, to}));
      } else {
        const held = (await request('/api/paging/state')).schedules.find((row:Schedule)=>row.id===value.id);
        const created = held && sameRota(held,value) ? held : await request('/api/paging/schedules', value);
        removeLocalDraft('rota', draftId, baseVersion);
        await refresh().catch(() => {});await navigate({to: '/on-call/' + encodeURIComponent(created.id) as any});
      }
    } catch (error) {failures.show(error, {target: null});} finally {setBusy(false);}
  };
  const apply = async () => {
    if (!review || !proposed) return;
    setBusy(true);failures.clear();
    try {
      await request(`/api/schedules/${encodeURIComponent(draft.id)}/apply`, {schedule: proposed, from: review.from, to: review.to, digest: review.digest, confirmed: true});
      removeLocalDraft('rota', draftId, baseVersion);
      await refresh().catch(() => {});await navigate({to: '/on-call/' + encodeURIComponent(draft.id) as any});
    } catch (error) {
      if (error instanceof HttpFailure && error.status===409 || error instanceof InterruptedTransport) {
        const latest=(await request('/api/paging/state').catch(()=>null))?.schedules.find((row:Schedule)=>row.id===draft.id);
        if(latest&&sameRota(latest,proposed)){removeLocalDraft('rota',draftId,baseVersion);await refresh().catch(()=>{});await navigate({to:'/on-call/'+encodeURIComponent(draft.id) as any});return;}
        await refresh().catch(()=>{});setReview(null);
      }
      failures.show(error, {target: null, retry:error instanceof InterruptedTransport||error instanceof HttpFailure&&error.status===409?undefined:apply});
    } finally {setBusy(false);}
  };
  const content = {draft, update, state: {...state, services: available}};
  return <div ref={tooltips} className="oc-oncall oc-rota-steps"><Link className="oc-back" to={schedule ? '/on-call/' + encodeURIComponent(schedule.id) as any : '/on-call' as any}>‹ {schedule ? schedule.name : 'On call'}</Link><header className="oc-page-head"><h1>{schedule ? 'Edit rota' : 'New rota'}</h1></header>
    {canEdit ? <div className="oc-step-layout"><div><nav className="oc-step-nav" aria-label="Rota steps">{steps.map((label, index) => <button type="button" key={label} aria-current={step === index ? 'step' : undefined} disabled={index > step} onClick={() => {setStep(index);setReview(null);}}><span>{index + 1}</span>{label}</button>)}</nav>
      <form ref={form} className="oc-card oc-step-card" onSubmit={event => {event.preventDefault();if(step < 3) setStep(step + 1);else void finish();}}>
        {step === 0 ? <StepService {...content}/> : step === 1 ? <StepPeople {...content}/> : step === 2 ? <StepHandover {...content}/> : <StepCheck {...content} endError={validation.error?.field === 'ends' ? validation.error.message : undefined}/>}
        {schedule && schedule.revision !== draft.revision && <div className="oc-draft-conflict"><p>A newer rota is available: {schedule.name}. Your draft is kept.</p><button type="button" onClick={() => update({revision:schedule.revision, original:schedule})}>Use mine</button></div>}
        {step >= 2 && validation.error?.field === 'handover' && draft.starts && draft.time && <p role="alert">{validation.error.message}</p>}
        <FailureLine failure={failures.failure}/>{notice && <p role="status">{notice}</p>}
        <div className="oc-step-actions">{step > 0 && <button type="button" onClick={() => {setStep(step - 1);setReview(null);}}>Back</button>}<button className="primary" type="submit" disabled={busy || step === 3 && (!proposed || JSON.stringify(proposed) !== JSON.stringify(previewed))}>{step < 3 ? 'Continue' : schedule ? 'Review change' : 'Create rota'}</button></div>
      </form>
      {review && <ReviewedChange key={review.digest} review={review} busy={busy} onApply={() => void apply()}/>}
    </div><RotaPreview schedule={proposed} state={state} onReady={setPreviewed}/></div> : <p>A workspace administrator or this service’s team manager can create and edit rotas.</p>}
  </div>;
}
