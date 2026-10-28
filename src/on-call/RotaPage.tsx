import {RotaField} from './Field';
import {useRotaTooltips} from './useRotaTooltips';
import {Link} from '@tanstack/react-router';
import {useCallback, useEffect, useRef, useState} from 'react';
import {FailureLine, useActionFailure} from '../app/FailureLine';
import {useViewAnchor} from '../app/useViewAnchor';
import {request, HttpFailure, InterruptedTransport} from '../useWorkspace';
import {ScheduleNowNext, ScheduleSummary} from '../ScheduleSummary';
import {ScheduleCoordination} from '../schedule-coordination/Controls';
import {ReviewedChange} from '../schedule-coverage/ReviewedChange';
import type {ScheduleReview} from '../schedule-coverage/review';
import type {Member, State} from '../family/response-operations/domain';
import {coverage, resolveLocal, type Coverage, type Schedule} from '../family/response-operations/schedules';
import type {PagingArchive} from '../family/response-operations/paging-archive';
import {teamCoverage} from '../teams/model';
import {Tooltip} from '../app/Tooltip';
import {readLocalDraft, writeLocalDraft, removeLocalDraft, policyDrafts} from '../app/autosave/localDraft';
import type {OnCall, OnCallBand} from './read';
import {RotaSheet} from './RotaSheet';
import {WeekBands} from './WeekBands';
import {localDate, sameRota} from './rota-steps/draft';
import {shortTime, zoneName} from './time';
import './on-call.css';
import '../scheduling.css';

type ModuleState = PagingArchive & {revision: number};
export function RotaPage({id, state, actor, value, refresh, edit = false, renderEdit}: {id: string; state: State; actor: Member; value: OnCall | null; refresh: () => Promise<void>; edit?: boolean; renderEdit?: (schedule: Schedule) => React.ReactNode}) {
  const tooltips = useRotaTooltips();
  const [savedNotice,setSavedNotice]=useState('');
  const savedLine=useRef<HTMLParagraphElement>(null);
  useEffect(()=>{if(!edit){const key='rota-saved:'+id,value=sessionStorage.getItem(key);if(value){sessionStorage.removeItem(key);setSavedNotice(value);}}},[edit,id]);
  useEffect(()=>{if(savedNotice&&!edit){savedLine.current?.focus();savedLine.current?.scrollIntoView({block:'nearest'});}},[savedNotice,edit]);
  const [data, setData] = useState<ModuleState | null>(null), [windows, setWindows] = useState<Coverage[]>([]), [from] = useState(() => Date.now());
  const [sheet, setSheet] = useState<'cover' | 'swap' | null>(null), [selected, setSelected] = useState<OnCallBand | null>(null);
  const [review, setReview] = useState<ScheduleReview | null>(null), [proposal, setProposal] = useState<Schedule | null>(null), [busy, setBusy] = useState(false);
  const [cover, setCover] = useState({member: actor.id, role: 'primary' as 'primary' | 'backup', start: '', end: ''}), [substitute, setSubstitute] = useState('');
  const failures = useActionFailure(), preserve = useViewAnchor(), generation = useRef(0);
  const schedule = data?.schedules.find(schedule => schedule.id === id), rota = value?.rotas.find(rota => rota.id === id);
  const load = useCallback(async () => {
    const version = ++generation.current;
    const next: ModuleState = await request('/api/paging/state');
    const found = next.schedules.find(schedule => schedule.id === id);
    const preview: Coverage[] = found ? await request('/api/paging/preview', {scheduleId: found.id, from, to: from + 14 * 86_400_000}) : [];
    if (version !== generation.current) return;
    preserve();setData(next);setWindows(preview);if (failures.current.current?.read) failures.clear();
  }, [id, from]);
  useEffect(() => {void load().catch(error => failures.show(error, {read: true, target: null, retry: load}));return () => {++generation.current;};}, [load, state]);
  const changed = async () => {await refresh();await load();};
  const canEdit = !!schedule && teamCoverage(state, actor, schedule.service), responsive = ['admin','responder'].includes(actor.role);
  const person = (id: string | null) => state.members.find(person => person.id === id);
  const bands: OnCallBand[] = windows.flatMap((window, index) => (['primary','backup'] as const).map(role => ({role, member: window[role] && person(window[role]) ? {id: window[role]!, name: person(window[role])!.name} : null, from: new Date(window.at).toISOString(), to: new Date(windows[index + 1]?.at ?? from + 14 * 86_400_000).toISOString()})));
  const ownShifts = bands.filter(band => band.member?.id === actor.id && Date.parse(band.from) > Date.now());
  const shiftKey = (band: OnCallBand | null) => band ? band.role + ':' + band.from : '';
  const close = () => {if (!busy) {setSheet(null);setReview(null);setProposal(null);failures.clear();}};
  const openCover = () => {
    if (!schedule) return;
    const next = Math.max(Date.now() + 3_600_000, Date.parse(schedule.validFrom));
    const kept=(readLocalDraft<typeof cover>('cover', id, schedule.revision) ?? policyDrafts<typeof cover>('cover', id)[0])?.value;
    setCover(kept ?? {member: actor.id, role:'primary', start: localDate(next, schedule.timezone), end: localDate(next + 3_600_000, schedule.timezone)});
    setReview(null);setProposal(null);failures.clear();setSheet('cover');
  };
  const openSwap = (band?: OnCallBand | null) => {const kept=(readLocalDraft<{selected:OnCallBand|null;substitute:string}>('swap',id,schedule?.revision??0) ?? policyDrafts<{selected:OnCallBand|null;substitute:string}>('swap',id)[0])?.value;setSelected(band ?? ownShifts.find(row=>shiftKey(row)===shiftKey(kept?.selected??null)) ?? ownShifts[0] ?? null);setSubstitute(kept?.substitute??'');setReview(null);failures.clear();setSheet('swap');};
  const updateCover = (value:Partial<typeof cover>) => {setCover(current=>{const next={...current,...value};writeLocalDraft({kind:'cover',id,baseVersion:schedule?.revision??0,value:next});return next;});};
  const reviewChange = async (next: Schedule, reviewFrom = from) => {
    setBusy(true);failures.clear();
    try {setProposal(next);setReview(await request(`/api/schedules/${encodeURIComponent(id)}/review`, {schedule: next, from:reviewFrom, to:reviewFrom + 14 * 86_400_000}));}
    catch (error) {failures.show(error, {target: null});} finally {setBusy(false);}
  };
  const apply = async () => {
    if (!review || !proposal) return;
    setBusy(true);failures.clear();
    try {await request(`/api/schedules/${encodeURIComponent(id)}/apply`, {schedule: proposal, from:review.from, to:review.to, digest:review.digest, confirmed:true});await changed();for(const kept of policyDrafts('cover',id))removeLocalDraft('cover',id,kept.baseVersion);setSheet(null);setReview(null);setProposal(null);}
    catch (error) {
      if(error instanceof HttpFailure&&error.status===409||error instanceof InterruptedTransport){
        const latest=(await request('/api/paging/state').catch(()=>null))?.schedules.find((row:Schedule)=>row.id===id);
        if(latest&&sameRota(latest,proposal)){await changed();for(const kept of policyDrafts('cover',id))removeLocalDraft('cover',id,kept.baseVersion);setSheet(null);setReview(null);setProposal(null);return;}
        await load().catch(()=>{});setReview(null);setProposal(null);
      }
      failures.show(error,{target:null});
    } finally {setBusy(false);}
  };
  const coverShift = async () => {
    if (!schedule) return;
    try {
      const start = resolveLocal(cover.start, schedule.timezone, schedule.primary.ambiguity), end = resolveLocal(cover.end, schedule.timezone, schedule.primary.ambiguity);
      if (start === null || end === null || end <= start) throw Error('Choose a real time range with an end after its start.');
      await reviewChange({...schedule, overrides:[...schedule.overrides, {id:'cover-' + crypto.randomUUID(), role:cover.role, member:cover.member || null, start:new Date(start).toISOString(), end:new Date(end).toISOString()}]}, Math.max(Date.now(), start));
    } catch (error) {failures.show(error, {target:null});}
  };
  const updateSwap = (value:{selected?:OnCallBand|null;substitute?:string}) => {const next={selected,substitute,...value};setSelected(next.selected);setSubstitute(next.substitute);writeLocalDraft({kind:'swap',id,baseVersion:schedule?.revision??0,value:next});};
  const requestSwap = async () => {
    if (!schedule || !selected || !substitute) return;
    setBusy(true);failures.clear();
    try {await request('/api/schedule-coordination', {action:'request',schedule:id,scheduleRevision:schedule.revision,substitute,role:selected.role,start:selected.from,end:selected.to});await changed();for(const kept of policyDrafts('swap',id))removeLocalDraft('swap',id,kept.baseVersion);setSheet(null);}
    catch (error) {failures.show(error, {target:null});} finally {setBusy(false);}
  };
  if (edit && schedule && renderEdit) return <>{renderEdit(schedule)}</>;
  return <div ref={tooltips} className="oc-oncall oc-rota-page"><aside className="oc-rota-neighbours oc-card" aria-label="Rotas"><h2>Rotas</h2>{value?.rotas.map(row=><Link key={row.id} to={'/on-call/'+encodeURIComponent(row.id) as any} aria-current={row.id===id?'page':undefined}><strong>{row.service.name}</strong><span>{row.name}</span><span>{row.now.primary?.name??'Nobody on call'}</span></Link>)}</aside><section className="oc-rota-record"><Link className="oc-back" to={'/on-call' as any}>‹ On call</Link><header className="oc-page-head"><div><h1>{schedule?.name ?? rota?.name ?? 'Rota'}</h1><p className="oc-quiet">{rota?.service.name ?? state.services.find(service => service.id === schedule?.service)?.name}</p></div>{canEdit && <Link className="oc-button" to={'/on-call/' + encodeURIComponent(id) + '/edit' as any}>Edit rota</Link>}</header>
    {savedNotice&&<p ref={savedLine} role="status" tabIndex={-1}>{savedNotice}</p>}
    <FailureLine failure={sheet ? null : failures.failure}/>
    {data && !schedule && <p>Rota not found. <Link to={'/on-call' as any}>Return to On call</Link></p>}
    {schedule && <><ScheduleNowNext schedule={schedule} state={state} request={request}/>
      <WeekBands rotas={[{id, name:schedule.name, week:bands}]} from={from} to={from + 14 * 86_400_000} title="Next two weeks" selectable={band=>band.member?.id===actor.id&&Date.parse(band.from)>Date.now()} onShift={band => {if (band.member?.id === actor.id && Date.parse(band.from) > Date.now()) openSwap(band);}}/>
      <div className="oc-rota-actions">{canEdit && <button type="button" onClick={openCover}>Cover a shift</button>}{responsive && <button type="button" onClick={() => openSwap()}>Request a swap</button>}</div>
      {schedule.overrides.length > 0 && <section className="oc-card"><h2>Cover</h2><ul className="oc-cover-list">{schedule.overrides.map(override => <li key={override.id}><div><strong>{person(override.member)?.name ?? 'Nobody on call'}</strong><p>{override.role} · {shortTime(override.start, schedule.timezone)} – {shortTime(override.end, schedule.timezone)} · {zoneName(schedule.timezone)}</p></div>{canEdit && <Tooltip label="Remove cover"><button type="button" aria-label="Remove cover" onClick={() => {setSheet('cover');void reviewChange({...schedule, overrides:schedule.overrides.filter(row => row.id !== override.id)});}}>×</button></Tooltip>}</li>)}</ul></section>}
      <div className="oc-coordination"><ScheduleCoordination rotaPage onRequestSwap={() => openSwap()} schedule={schedule} state={state} actor={actor} onChanged={changed}/></div>
      <details className="oc-card oc-paging"><summary>Paging is off</summary><ScheduleSummary showCalendar={false} schedule={schedule} policies={data?.policies ?? []} admin={canEdit} request={request} onSaved={() => {void load();}}/></details>
    </>}
    {sheet && schedule && <RotaSheet title={sheet === 'cover' ? 'Cover a shift' : 'Request a swap'} close={close}><p className="oc-quiet">{schedule.timezone.replaceAll('_',' ')}</p><FailureLine failure={failures.failure}/>
      {review ? <ReviewedChange key={review.digest} review={review} busy={busy} onApply={() => void apply()}/> : sheet === 'cover' ? <form onSubmit={event => {event.preventDefault();void coverShift();}}>
        <RotaField label={<>Who</>}><select value={cover.member} onChange={event => updateCover({member:event.target.value})}><option value="">Nobody on call</option>{state.members.filter(person => person.active && ['admin','responder'].includes(person.role)).map(person => <option value={person.id} key={person.id}>{person.name}</option>)}</select></RotaField>
        <RotaField label={<>Role</>}><select value={cover.role} onChange={event => updateCover({role:event.target.value as 'primary'|'backup'})}><option value="primary">Primary</option><option value="backup">Backup</option></select></RotaField>
        <RotaField label={<>From</>}><input type="datetime-local" required value={cover.start} onChange={event => updateCover({start:event.target.value})}/></RotaField><RotaField label={<>To</>}><input type="datetime-local" required value={cover.end} onChange={event => updateCover({end:event.target.value})}/></RotaField><button type="submit" disabled={busy}>Review change</button>
      </form> : <form onSubmit={event => {event.preventDefault();void requestSwap();}}>{ownShifts.length ? <>{ownShifts.length > 1 ? <RotaField label={<>Shift to swap</>}><select value={shiftKey(selected)} onChange={event => updateSwap({selected:ownShifts.find(band => shiftKey(band) === event.target.value) ?? null})}>{ownShifts.map(band => <option key={shiftKey(band)} value={shiftKey(band)}>{shortTime(band.from, schedule.timezone)} · {band.role}</option>)}</select></RotaField> : <p>Shift · {shortTime(ownShifts[0].from,schedule.timezone)} · {ownShifts[0].role}</p>}<RotaField label={<>Substitute</>}><select required value={substitute} onChange={event => updateSwap({substitute:event.target.value})}><option value="">Choose a person</option>{state.members.filter(person => person.active && person.id !== actor.id && ['admin','responder'].includes(person.role)).map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></RotaField><button type="submit" disabled={busy || !substitute}>Request</button></> : <p>You have no upcoming shift in these two weeks. Choose one of your shifts from the bands when it appears.</p>}</form>}
    </RotaSheet>}
  </section></div>;
}
