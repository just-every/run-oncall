import { fail, type State } from '../family/response-operations/domain.ts';
function shape(v:any,required:string[],optional:string[]=[]) {if(!v||typeof v!=='object'||Array.isArray(v)||required.some(k=>!Object.hasOwn(v,k))||Object.keys(v).some(k=>![...required,...optional].includes(k)))fail('Invalid manual response record');}
const str=(v:any,max=3000)=>{if(typeof v!=='string'||v.length>max)fail('Invalid manual response text');};
const date=(v:any)=>{if(typeof v!=='string'||!Number.isFinite(Date.parse(v)))fail('Invalid manual response date');};
function assignment(v:any) {shape(v,['version','mode','minutes','policy','by','at']);if(!Number.isSafeInteger(v.version)||v.version<0||!['repeat','escalate'].includes(v.mode)||!Number.isSafeInteger(v.minutes)||v.minutes<1||v.minutes>1440)fail('Invalid assignment rule');str(v.policy,100);str(v.by,100);date(v.at);}
export function validateAssignmentHistory(value:any) {if(!Array.isArray(value)||!value.length||value.length>100)fail('Invalid assignment history');value.forEach((v,n)=>{assignment(v);if(v.version!==n+1)fail('Invalid assignment version');});}
export function validateManualRecords(state:State) {
 const member=(id:any)=>state.members.some(m=>m.id===id)||state.apiClients?.some(c=>c.id===id);
 const rule=(v:any)=>{assignment(v);if(!state.services.some(s=>s.id===v.policy)||v.version>0&&!member(v.by))fail('Invalid assignment reference');};
 const response=(v:any)=>{if(v!==null){shape(v,['by','at']);if(!member(v.by))fail('Invalid response actor');date(v.at);}};
 const obligation=(v:any)=>{shape(v,['id','state','paging','automatic','label','target','urgency','creator','at','outcome'],['assignment']);str(v.id,100);str(v.outcome);date(v.at);shape(v.target,['kind','id'],['policyRevision']);if(!['recorded','stopped'].includes(v.state)||v.paging!=='off'||v.automatic!==false||v.label!=='no sender'||!['high','low'].includes(v.urgency)||!member(v.creator)||!['user','policy','service'].includes(v.target.kind)||!(v.target.kind==='user'?member(v.target.id):state.services.some(s=>s.id===v.target.id)))fail('Invalid response obligation');if(v.target.kind==='policy'&&(!Number.isSafeInteger(v.target.policyRevision)||v.target.policyRevision<1))fail('Invalid policy version');if(v.assignment)rule(v.assignment);};
 for(const service of state.services)if(service.userAssignments!==undefined){validateAssignmentHistory(service.userAssignments);service.userAssignments.forEach((v,n)=>{rule(v);if(v.version!==n+1)fail('Invalid assignment version');});}
 for(const incident of state.incidents){
  const page=incident.manualPage;
  if(page){shape(page,['creator','operation','fingerprint','description','assignment','obligations','acknowledgment'],['erasedCreator','erasedAcknowledgment']);if([page.erasedCreator,page.erasedAcknowledgment].some(v=>v!==undefined&&v!==true))fail('Invalid erased page attribution');if(!member(page.creator))fail('Invalid page creator');str(page.operation,100);str(page.fingerprint,20000);str(page.description);rule(page.assignment);response(page.acknowledgment);if(!Array.isArray(page.obligations)||page.obligations.length>100)fail('Invalid manual obligations');page.obligations.forEach(obligation);}
  if(incident.responders!==undefined&&(!Array.isArray(incident.responders)||new Set(incident.responders).size!==incident.responders.length||incident.responders.some(id=>!member(id))))fail('Invalid additional responders');
  if(incident.responderRequests!==undefined){if(!Array.isArray(incident.responderRequests)||incident.responderRequests.length>500||new Set(incident.responderRequests.map(r=>r.id)).size!==incident.responderRequests.length)fail('Invalid request history');for(const r of incident.responderRequests){shape(r,['id','requester','message','at','status','response','obligation','notice']);str(r.id,100);str(r.message);date(r.at);if(!member(r.requester)||!['pending','accepted','declined','cancelled','ended','held'].includes(r.status))fail('Invalid responder request');response(r.response);obligation(r.obligation);if(r.notice)obligation(r.notice);if(r.status!=='pending'&&r.obligation.state!=='stopped')fail('Inactive request still has authority');}}
 }
}
export function holdManualRecords(state:State) {
 for(const incident of state.incidents){for(const o of incident.manualPage?.obligations??[])if(o.state==='recorded'){o.state='stopped';o.outcome='Restored inactive; no sender';}for(const request of incident.responderRequests??[]){if(request.status==='pending')request.status='held';if(request.obligation.state==='recorded'){request.obligation.state='stopped';request.obligation.outcome='Restored inactive; no sender';}if(request.notice)request.notice.state='stopped';}}
}
export function eraseManualMember(incident:State['incidents'][number],id:string) {
 incident.responders=incident.responders?.filter(member=>member!==id);
 if(incident.manualPage?.acknowledgment?.by===id)incident.manualPage.erasedAcknowledgment=true;
 if(incident.manualPage?.creator===id){incident.manualPage.erasedCreator=true;incident.manualPage.description='Erased member';incident.manualPage.fingerprint='';incident.manualPage.obligations=[];}
 else if(incident.manualPage){const before=incident.manualPage.obligations.length;incident.manualPage.obligations=incident.manualPage.obligations.filter(o=>o.creator!==id&&!(o.target.kind==='user'&&o.target.id===id));if(before!==incident.manualPage.obligations.length)incident.manualPage.fingerprint='';}
 if(incident.responderRequests)incident.responderRequests=incident.responderRequests.filter(r=>r.requester!==id&&r.response?.by!==id&&!(r.obligation.target.kind==='user'&&r.obligation.target.id===id));
}
