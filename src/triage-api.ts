import {advanceRuleWorkflow} from './orchestration/workflow-api';
import {requireNewSubjectIdentity} from './subject-erasure-identity';
import {coordinationTasks,applyCoordinationStep,coordinationPreview,validateCoordination} from './triage-orchestration';
import {coordinateAlert} from './triage-alerts';
import {inheritWorkspaceSnapshot} from './workspace-store';
import {pagingSnapshot} from './paging-store';
import {responseContext} from './manual-pages/context';
import { auditKind, auditOutcome } from './audit-store'
import { authority, command, fail, Fault, text, type Member, type State } from './family/response-operations/domain';
import { matchingItems, triagePage, triageQuery, type BulkOperation, type BulkResult, type SavedView } from './family/response-operations/triage';

export function memberWorkspace(state: State, actor: Member): State {
  if(actor.role!=='admin'){const {apiClients,apiEndpoints,apiOperations,apiOutbox,emailSamples,emailAddresses,emailRules,emailReceipts,emailQuarantine,...visible}=state;state=visible;}
  if(actor.role!=='admin'&&state.scheduleRecords)state={...state,scheduleRecords:state.scheduleRecords.filter(r=>r.kind==='policy'||r.member===actor.id||r.kind==='swap'&&r.data.substitute===actor.id)};
  if(state.businessServices)state={...state,businessServices:state.businessServices.map(service=>actor.role==='admin'||actor.id===service.communicationsOwner&&['admin','responder'].includes(actor.role)?service:{...service,emailLists:undefined,notices:service.notices.filter(row=>row.target.kind==='user')})};
  if (!state.triage) return state;
  return {...state, triage: state.triage.filter(r => r.kind !== 'view' || r.actor === actor.id)};
}

type Dependencies = {
  body: (c: any, max?: number) => Promise<any>;
  state: (c: any) => Promise<State>;
  save: (c: any, state: State, revision: number) => Promise<void>;
  saveItem: (c: any, state: State, revision: number, operationId: string, incidentId?: string) => Promise<void>;
};
const digest = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('');

export function installTriage(api: any, deps: Dependencies) {
  api.get('/api/triage', async (c: any) => {
    const state = await deps.state(c);
    return c.json(triagePage(state, c.get('actor'), triageQuery(c.req.query()), c.req.query('cursor'), Number(c.req.query('limit') ?? 25)));
  });
  api.get('/api/triage/views', async (c: any) => {
    const state = await deps.state(c);
    return c.json({views: (state.triage ?? []).filter(r => r.kind === 'view' && r.actor === c.get('actor').id)});
  });
  api.post('/api/triage/views', async (c: any) => {
    const input = await deps.body(c);
    const state = await deps.state(c), revision = state.revision, actor: Member = c.get('actor');
    // Personal list preferences do not confer incident-write authority.
    const records = state.triage ??= [];
    if (input.remove) {
      const index = records.findIndex(r => r.id === input.remove && r.kind === 'view' && r.actor === actor.id);
      if (index < 0) fail('Saved view not found', 404);
      records.splice(index, 1);
    } else {
      if (records.filter(r => r.kind === 'view' && r.actor === actor.id).length >= 20) fail('Maximum 20 saved views per person', 429);
      const view: SavedView = {id: crypto.randomUUID(), kind: 'view', actor: actor.id, name: text(input.name, 'View name', 100), query: triageQuery(input.query ?? {})};
      records.push(view);
    }
    await deps.save(c, state, revision);
    return c.json({views: records.filter(r => r.kind === 'view' && r.actor === actor.id)});
  });
  const executeBulk = async (c: any, supplied?:any) => {
    const input = supplied ?? await deps.body(c, 256 * 1024);
    const id = text(input.operationId, 'Operation ID', 100);
    if (!['acknowledge', 'resolve', 'reassign', 'set-priority', 'set-urgency','snooze','merge','orchestrate'].includes(input.action)) fail('Unsupported bulk action');
    if(input.action==='orchestrate'&&input.durable!==true)fail('Declaration and notification require a saved workflow',409);
    auditKind(c.env.DB, `triage.${input.action}`);
    if (!Array.isArray(input.items) || !input.items.length || input.items.length > (input.allMatching ? 1000 : 500)) fail('Choose 1–500 incidents, or confirm up to 1,000 matching incidents');
    const items = input.items.map((i: any) => ({id: text(i?.id, 'Item ID', 100), revision: i?.revision,...(i?.kind?{kind:i.kind}:{})}));
    if (new Set(items.map((i: any) => i.id)).size !== items.length || items.some((i: any) => !Number.isSafeInteger(i.revision) || i.revision < 1||i.kind!==undefined&&!['incident','alert'].includes(i.kind))) fail('Each selected incident needs one revision');
    if(!input.allMatching&&(items.some((item:any)=>item.kind==='alert')||['snooze','merge','orchestrate'].includes(input.action))&&input.confirmedCount!==items.length)fail('Confirm the current selected item count',409);
    const payload = {action: input.action, items, reason: input.reason ?? '', evidence: input.evidence ?? '', member: input.member || null, priority: input.priority ?? null, urgency: input.urgency ?? null, allMatching: input.allMatching ? triageQuery(input.query ?? {}) : null, confirmedCount: input.confirmedCount ?? null,...(input.action==='snooze'?{minutes:input.minutes}:{}),...(input.action==='merge'?{target:input.target,targetRevision:input.targetRevision}:{})};
    const fingerprint = await digest(JSON.stringify(payload));
    const actor: Member = c.get('actor');
    let initial = await deps.state(c);
    let operation = (initial.triage ?? []).find(r => r.id === id);
    if(operation?.kind==='bulk'&&operation.rule)fail('Rule-launched workflows require explicit authorized resume',409);
    if (operation && (operation.kind !== 'bulk' || operation.actor !== actor.id || operation.fingerprint !== fingerprint)) fail('Operation ID conflicts with different content or actor', 409);
    if(input.action==='orchestrate')validateCoordination(initial,actor,input);
    if (initial.members.find(m => m.id === actor.id)?.role === 'viewer') {
      auditOutcome(c.env.DB,'refused');
      const committed = operation?.kind === 'bulk' ? operation.results : [];
      return c.json({operationId: id, results: items.map((i: any) => committed.find(r => r.id === i.id) ?? {id: i.id, ok: false, error: 'Insufficient role'}), remaining: operation ? items.length - committed.length : 0, interrupted: true});
    }
    authority(initial, actor);
    if (!operation) {
      await requireNewSubjectIdentity(initial,'workflow',id);
      if (input.allMatching) {
        const all = matchingItems(initial, actor, payload.allMatching!);
        if (input.workspaceRevision !== initial.revision || input.confirmedCount !== all.length || items.length !== all.length || all.some(i => !items.some((item: any) => item.id === i.id && item.revision === i.revision && (item.kind??'incident')===i.kind))) fail('Matching incidents changed. Confirm the current count and selection.', 409);
      }
      if(input.durable===true&&(!['reassign','orchestrate'].includes(input.action)||input.allMatching||payload.evidence!==''||payload.priority!==null||payload.urgency!==null||items.some((item:any)=>item.kind!=='alert')||typeof payload.reason!=='string'||!payload.reason.trim()||payload.reason.length>1000||payload.member!==null&&!initial.members.some(m=>m.id===payload.member&&m.active&&['admin','responder'].includes(m.role))))fail('Durable coordination requires selected alerts, a current responder and a reason',409);
      operation = {id, kind: 'bulk', actor: actor.id, fingerprint, at: new Date().toISOString(), results: [],...(input.durable===true?{workflow:{items,member:payload.member,reason:payload.reason,...(input.action==='orchestrate'?{action:'orchestrate' as const,version:1 as const}:{})}}:{})};
      (initial.triage ??= []).push(operation);
      await deps.save(c, initial, initial.revision);
    }
    const tasks=input.action==='orchestrate'?coordinationTasks(items):items;
    const completed = new Map((operation as BulkOperation).results.map(r => [r.id, r]));
    const results: BulkResult[] = [...completed.values()];
    let interrupted = false;
    // Bound each invocation, including the first reservation, below D1 Free's
    // query budget. Continuations keep the exact request identity and revisions.
    for (const item of tasks.filter((i: any) => !completed.has(i.id)).slice(0, 2)) {
      let state: State | undefined, result: BulkResult;
      try {
        state = await deps.state(c);
        authority(state, actor);
        const receipt = state.triage?.find(r => r.id === id && r.kind === 'bulk') as BulkOperation | undefined;
        if (!receipt || receipt.fingerprint !== fingerprint || receipt.actor !== actor.id) fail('Bulk operation was replaced; reload before continuing', 409);
        const old = receipt.results.find(r => r.id === item.id);
        if (old) { completed.set(item.id, old); results.push(old); continue; }
        const revision = state.revision;
        // Domain mutation can fail after changing its working copy. Keep failures
        // separate from the state whose receipt is committed.
        const proposed = inheritWorkspaceSnapshot(structuredClone(state),state);
        try {
          const at=new Date(Date.now()).toISOString(),beforeEntries=new Set(proposed.incidents.flatMap(i=>i.timeline.map(e=>e.id)));
          let changed:any;
          if(input.action==='orchestrate'){auditKind(c.env.DB,'triage.workflow-'+item.step);changed=applyCoordinationStep(proposed,actor,item,payload.member!,payload.reason,receipt.results,id,at);}
          else if(item.kind==='alert')changed=coordinateAlert(proposed,actor,{...payload,id:item.id,revision:item.revision,operationId:id},at);
          else if(input.action==='merge'){
            const accepted=receipt.results.filter(r=>r.ok).length;
            if(typeof payload.target!=='string'||!Number.isSafeInteger(payload.targetRevision))fail('Choose a merge target and its revision');
            if(item.id===payload.target)fail('Merge target cannot also be a selected source',409);
            command(proposed,actor,{type:'merge-incidents',incident:payload.target,revision:payload.targetRevision+accepted,sources:[{id:item.id,revision:item.revision}],reason:payload.reason},at);
            changed=proposed.incidents.find(i=>i.id===item.id);
          }else{
            const context=input.action==='snooze'?responseContext(await pagingSnapshot(c.env.DB),Date.parse(at)):undefined;
            changed=command(proposed,actor,{type:input.action==='acknowledge'?'bulk-acknowledge':input.action==='resolve'?'bulk-resolve':input.action,
              incident:item.id,revision:item.revision,operationId:id,reason:payload.reason,evidence:payload.evidence,member:payload.member,priority:payload.priority,urgency:payload.urgency,...(input.action==='snooze'?{minutes:payload.minutes}:{})},at,context);
          }
          for(const incident of proposed.incidents)for(const entry of incident.timeline)if(!beforeEntries.has(entry.id))entry.operationId=id;
          result={id:item.id,ok:true,revision:changed.revision,...(input.action==='orchestrate'?{kind:'workflow' as const,step:item.step,incident:changed.id}:item.kind==='alert'?{kind:'alert' as const}:{})};
          (proposed.triage!.find(r => r.id === id) as BulkOperation).results.push(result);
          await deps.saveItem(c, proposed, revision, id, input.action==='orchestrate'?changed.id:item.id);
          completed.set(item.id, result);
        } catch (error) {
          if (!(error instanceof Fault) || error.status >= 500) throw error;
          result = {id: item.id, ok: false, error: error.message,...(input.action==='orchestrate'?{kind:'workflow' as const,step:item.step}:{})};
          receipt.results.push(result);
          await deps.saveItem(c, state, revision, id);
          completed.set(item.id, result);
        }
      } catch (error) {
        auditOutcome(c.env.DB,error instanceof Fault && error.status < 500 ? 'refused' : 'uncertain');
        interrupted = true;
        result = {id: item.id, ok: false, error: error instanceof Fault ? error.message : 'Storage failure; outcome unconfirmed. Replay this operation to inspect committed results.'};
      }
      results.push(result);
      if (interrupted) break;
    }
    const byId = new Map(results.map(r => [r.id, r]));
    return c.json({operationId: id, results: tasks.flatMap((item: any) => byId.has(item.id) ? [byId.get(item.id)] : []), remaining: tasks.length - completed.size, interrupted});
  };
  api.post('/api/triage/workflows/preview',async(c:any)=>{const input=await deps.body(c,256*1024),state=await deps.state(c);return c.json(coordinationPreview(state,c.get('actor'),input));});
  api.post('/api/triage/bulk', (c:any)=>executeBulk(c));
  api.post('/api/triage/workflows/:id/clear-expired',async(c:any)=>{const state=await deps.state(c),input=await deps.body(c),record=state.triage?.find(r=>r.id===c.req.param('id')&&r.kind==='bulk') as BulkOperation|undefined;if(!record?.rule)fail('Unknown rule workflow',404);return advanceRuleWorkflow(c,record,input,deps,true);});
  api.post('/api/triage/workflows/:id/resume',async(c:any)=>{
    const state=await deps.state(c),input=await deps.body(c),actor:Member=c.get('actor');
    authority(state,actor);
    const record=state.triage?.find(row=>row.id===c.req.param('id')&&row.kind==='bulk');
    if(!record||record.kind!=='bulk'||!record.workflow)fail('Unknown recorded workflow',404);
    if(record.rule)return advanceRuleWorkflow(c,record,input,deps);
    if(record.actor!==actor.id||input.approve!==true)fail('Only the current author can explicitly resume this recorded workflow',403);
    return executeBulk(c,{...record.workflow,operationId:record.id,action:record.workflow.action??'reassign',confirmedCount:record.workflow.items.length,durable:true});
  });
}
