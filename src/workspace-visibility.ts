import type { Member, State } from './family/response-operations/domain';

export function memberWorkspace(state: State, actor: Member): State {
  if(actor.role!=='admin'){const {apiClients,apiEndpoints,apiOperations,apiOutbox,emailSamples,emailAddresses,emailRules,emailReceipts,emailQuarantine,...visible}=state;state=visible;}
  if(actor.role!=='admin'&&state.scheduleRecords)state={...state,scheduleRecords:state.scheduleRecords.filter(r=>r.kind==='policy'||r.member===actor.id||r.kind==='swap'&&r.data.substitute===actor.id)};
  if(state.businessServices)state={...state,businessServices:state.businessServices.map(service=>actor.role==='admin'||actor.id===service.communicationsOwner&&['admin','responder'].includes(actor.role)?service:{...service,emailLists:undefined,notices:service.notices.filter(row=>row.target.kind==='user')})};
  if (!state.triage) return state;
  return {...state, triage: state.triage.filter(r => r.kind !== 'view' || r.actor === actor.id)};
}
