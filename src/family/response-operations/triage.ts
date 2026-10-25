import { mergedTimeline, retainedIncidentSources } from '../../incident-workflows/relations.ts';
import { fail, text, type Incident, type Member, type State } from './domain.ts';
import { incidentAssignee, incidentUpdated, incidentUrgency } from './incident-controls.ts';

export type TriageQuery = Partial<Record<'kind' | 'q' | 'status' | 'severity' | 'urgency' | 'priority' | 'service' | 'assignee' | 'mine' | 'createdAfter' | 'createdBefore' | 'updatedAfter' | 'updatedBefore' | 'sort', string>>;
export type BulkResult = {id: string; ok: boolean; revision?: number; error?: string; kind?:'alert'|'workflow';step?:'declare'|'notify';incident?:string};
export type SavedView = {id: string; kind: 'view'; actor: string; name: string; query: TriageQuery};
export type BulkOperation = {id: string; kind: 'bulk'; actor: string; fingerprint: string; at: string; results: BulkResult[]; workflow?: {action?:'orchestrate';version?:1;items:{id:string;revision:number;kind:'alert'}[];member:string|null;reason:string}};
export type TriageRecord = SavedView | BulkOperation;
export const queryFields = ['kind','q', 'status', 'severity', 'urgency', 'priority', 'service', 'assignee', 'mine', 'createdAfter', 'createdBefore', 'updatedAfter', 'updatedBefore', 'sort'] as const;

export function triageQuery(value: Record<string, unknown>): TriageQuery {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => ![...queryFields, 'limit', 'cursor'].includes(key as any))) fail('Unsupported incident filter');
  const q: TriageQuery = {};
  for (const key of queryFields) {
    if (value[key] === undefined || value[key] === '') continue;
    q[key] = text(value[key], key, key === 'q' ? 600 : 100);
  }
  const choices = {kind:['incidents','alerts'],status: ['declared', 'acknowledged', 'mitigating', 'recovered', 'resolved', 'open'], severity: ['critical', 'warning', 'info'], urgency: ['high', 'low'], priority: ['P1', 'P2', 'P3', 'P4', 'P5', 'unset'], mine: ['true'], sort: ['created', 'updated', 'urgency', 'priority']};
  for (const [key, allowed] of Object.entries(choices)) if ((q as any)[key] && !allowed.includes((q as any)[key])) fail(`Invalid ${key} filter`);
  for (const key of ['createdAfter', 'createdBefore', 'updatedAfter', 'updatedBefore'] as const) {
    if (!q[key]) continue;
    if (!/(Z|[+-]\d\d:\d\d)$/.test(q[key]!) || !Number.isFinite(Date.parse(q[key]!))) fail(`Invalid ${key} timestamp`);
    q[key] = new Date(q[key]!).toISOString();
  }
  for (const prefix of ['created', 'updated']) {
    const from = (q as any)[prefix + 'After'], to = (q as any)[prefix + 'Before'];
    if (from && to && from >= to) fail('The end of a time range must follow its start');
  }
  return q;
}

export function matchingIncidents(state: State, actor: Member, query: TriageQuery): Incident[] {
  const terms = query.q?.toLocaleLowerCase().split(/\s+/).filter(Boolean) ?? [];
  const matches = state.incidents.filter(i => {
    if(i.mergedInto)return false;
    const service = state.services.find(s => s.id === i.service);
    const keys = i.alerts.map(id => state.alerts.find(a => a.id === id)?.key ?? '');
    const haystack = [i.title, service?.name, service?.environment, ...keys, ...mergedTimeline(state,i).map(e=>e.text),...retainedIncidentSources(state,i).map(source=>source.title)].join(' ').toLocaleLowerCase();
    if (!terms.every(term => haystack.includes(term))) return false;
    if (query.status && (query.status === 'open' ? i.state === 'resolved' : i.state !== query.status)) return false;
    if (query.severity && i.severity !== query.severity || query.urgency && incidentUrgency(i) !== query.urgency) return false;
    if (query.priority && (i.priority ?? 'unset') !== query.priority || query.service && i.service !== query.service) return false;
    if (query.assignee && (incidentAssignee(i) ?? 'unassigned') !== query.assignee || query.mine && incidentAssignee(i) !== actor.id) return false;
    const created = new Date(i.createdAt).toISOString(), updated = incidentUpdated(i);
    return !(query.createdAfter && created < query.createdAfter || query.createdBefore && created >= query.createdBefore || query.updatedAfter && updated < query.updatedAfter || query.updatedBefore && updated >= query.updatedBefore);
  });
  return matches.sort((a, b) => {
    let order = 0;
    if (query.sort === 'priority') order = (a.priority ?? 'P9').localeCompare(b.priority ?? 'P9');
    else if (query.sort === 'urgency') order = Number(incidentUrgency(b) === 'high') - Number(incidentUrgency(a) === 'high');
    else if (query.sort === 'updated') order = incidentUpdated(b).localeCompare(incidentUpdated(a));
    return order || Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id);
  });
}

/** Alert-only list rows are a display projection; no incident is created. */
export function matchingItems(state:State,actor:Member,query:TriageQuery):(Incident&{kind:'incident'|'alert'})[]{
 if(query.kind!=='alerts')return matchingIncidents(state,actor,query).map(i=>({...i,kind:'incident' as const}));
 return state.alerts.filter(a=>!state.incidents.some(i=>i.alerts.includes(a.id))).map(a=>{
  const events=a.events.map(id=>state.events.find(e=>e.id===id)).filter(e=>!!e),first=events[0],last=events.at(-1),held=a.coordination;
  const severity=(['critical','warning','info'] as const).find(v=>events.some(e=>e.severity===v))??'critical';
  return {id:a.id,kind:'alert' as const,revision:a.revision??1,title:first?.title??a.key,summary:a.key,service:a.service??'',severity,state:held?.state==='closed'||a.state==='recovered'?'resolved':held?.state==='acknowledged'?'acknowledged':'declared',createdAt:first?.acceptedAt??state.intakeReceipts?.find(r=>r.alert===a.id)?.acceptedAt??'2000-01-01T00:00:00.000Z',assignee:held?.assignee??a.owner,commander:null,urgency:a.urgency??'high',priority:a.priority??null,alerts:[a.id],runbook:[],actions:[],timeline:held?.history??[],recovery:'',review:''} as Incident&{kind:'alert'};
 }).filter(i=>{
  const service=state.services.find(s=>s.id===i.service),terms=query.q?.toLocaleLowerCase().split(/\s+/).filter(Boolean)??[];
  const haystack=[i.title,state.alerts.find(a=>a.id===i.id)?.key,service?.name,service?.environment,...i.timeline.map(e=>e.text)].join(' ').toLocaleLowerCase();
  if(!terms.every(term=>haystack.includes(term)))return false;
  if(query.status&&(query.status==='open'?i.state==='resolved':query.status!==i.state))return false;
  if(query.severity&&query.severity!==i.severity||query.service&&query.service!==i.service||query.urgency&&query.urgency!==i.urgency||query.priority&&(i.priority??'unset')!==query.priority||query.assignee&&(i.assignee??'unassigned')!==query.assignee||query.mine&&i.assignee!==actor.id)return false;
  const updated=incidentUpdated(i);return !(query.createdAfter&&i.createdAt<query.createdAfter||query.createdBefore&&i.createdAt>=query.createdBefore||query.updatedAfter&&updated<query.updatedAfter||query.updatedBefore&&updated>=query.updatedBefore);
 }).sort((a,b)=>query.sort==='priority'?(a.priority??'P9').localeCompare(b.priority??'P9')||a.id.localeCompare(b.id):query.sort==='urgency'?Number(b.urgency==='high')-Number(a.urgency==='high')||a.id.localeCompare(b.id):Date.parse(query.sort==='updated'?incidentUpdated(b):b.createdAt)-Date.parse(query.sort==='updated'?incidentUpdated(a):a.createdAt)||a.id.localeCompare(b.id));
}

export function triagePage(state: State, actor: Member, query: TriageQuery, cursor?: string, limit = 25) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) fail('Page size must be from 1 to 100');
  const key = JSON.stringify(query);
  let offset = 0;
  if (cursor) {
    let decoded: any;
    try { decoded = JSON.parse(decodeURIComponent(atob(cursor))); } catch { fail('Invalid cursor'); }
    if (decoded.revision !== state.revision || decoded.key !== key) fail('Results changed. Reload the first page.', 409);
    offset = decoded.offset;
    if (!Number.isSafeInteger(offset) || offset < 0) fail('Invalid cursor');
  }
  const all = matchingItems(state, actor, query);
  return {items: all.slice(offset, offset + limit), total: all.length, workspaceRevision: state.revision,
    nextCursor: offset + limit < all.length ? btoa(encodeURIComponent(JSON.stringify({revision: state.revision, key, offset: offset + limit}))) : null};
}

export function validateTriageRecords(records: any, state: State) {
  if (!Array.isArray(records) || records.length > 10000 || new Set(records.map((r: any) => r?.id)).size !== records.length) fail('Invalid triage records');
  for (const r of records) {
    const keys = r?.kind === 'view' ? ['id', 'kind', 'actor', 'name', 'query'] : ['id', 'kind', 'actor', 'fingerprint', 'at', 'results',...(r?.workflow!==undefined?['workflow']:[])];
    if (!r || !['view', 'bulk'].includes(r.kind) || Object.keys(r).length !== keys.length || keys.some(k => !Object.hasOwn(r, k))) fail('Invalid triage record fields');
    text(r.id, 'Triage ID', 100);
    if (!state.members.some(m => m.id === r.actor)) fail('Invalid triage actor');
    if (r.kind === 'view') {
      text(r.name, 'View name', 100);
      if (!r.query || typeof r.query !== 'object' || Array.isArray(r.query) || Object.keys(r.query).some(k => !(queryFields as readonly string[]).includes(k))) fail('Invalid saved view query');
      triageQuery(r.query);
    } else {
      if (!/^[a-f0-9]{64}$/.test(r.fingerprint) || !Number.isFinite(Date.parse(r.at)) || !Array.isArray(r.results) || r.results.length > 1000 || new Set(r.results.map((v: any) => v.id)).size !== r.results.length) fail('Invalid bulk receipt');
      if(r.workflow!==undefined){
        const plan=r.workflow;
        if(!plan||Object.keys(plan).sort().join(',')!==(plan.action==='orchestrate'?'action,items,member,reason,version':'items,member,reason')||plan.action==='orchestrate'&&(plan.version!==1||plan.member===null||plan.items?.length>25)||!Array.isArray(plan.items)||!plan.items.length||plan.items.length>500||new Set(plan.items.map((item:any)=>item.id)).size!==plan.items.length||plan.items.some((item:any)=>!item||Object.keys(item).sort().join(',')!=='id,kind,revision'||item.kind!=='alert'||!Number.isSafeInteger(item.revision)||item.revision<1||!state.alerts.some(a=>a.id===item.id))||plan.member!==null&&!state.members.some(m=>m.id===plan.member)||typeof plan.reason!=='string'||!plan.reason.trim()||plan.reason.length>1000||r.results.some((result:any)=>plan.action==='orchestrate'?!plan.items.some((item:any,index:number)=>result.id===`step:${index}:declare`||result.id===`step:${index}:notify`):!plan.items.some((item:any)=>item.id===result.id)))fail('Invalid durable coordination plan');
      }
      for (const result of r.results) {
        if (!result || Object.keys(result).some(k => !(r.workflow?.action==='orchestrate'?['id','ok','revision','error','kind','step','incident']:['id','ok','revision','error','kind']).includes(k))) fail('Invalid bulk result fields');
        text(result.id, 'Bulk incident ID', 100);
        if (typeof result.ok !== 'boolean' || (result.ok ? !Number.isSafeInteger(result.revision) || result.revision < 1 : typeof result.error !== 'string' || !result.error || result.error.length > 1000)) fail('Invalid bulk result');
        if(r.workflow?.action==='orchestrate'){
          if(result.kind!=='workflow'||!['declare','notify'].includes(result.step)||!result.id.endsWith(':'+result.step))fail('Invalid workflow step identity');
          if(result.ok){const incident=state.incidents.find(row=>row.id===result.incident);if(!incident||incident.revision<result.revision||!incident.timeline.some(entry=>entry.operationId===r.id&&entry.actor===r.actor&&entry.kind===(result.step==='declare'?'declared':'request-responders')))fail('Invalid workflow incident attribution');}
          continue;
        }
        if (result.ok) {
          if(result.kind==='alert'){
            const alert=state.alerts.find(a=>a.id===result.id);
            if(!alert||(alert.revision??1)<result.revision||!alert.coordination?.history.some(e=>e.operationId===r.id&&e.actor===r.actor))fail('Invalid alert bulk outcome reference or attribution');
            continue;
          }
          if(result.kind!==undefined)fail('Invalid bulk outcome kind');
          const incident = state.incidents.find(i => i.id === result.id);
          if (!incident || incident.revision < result.revision || !incident.timeline.some(e => e.operationId === r.id && e.actor === r.actor)) fail('Invalid bulk outcome reference or attribution');
        }
      }
    }
  }
}
