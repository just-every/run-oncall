import {fail,link,text,type State,type Member,type Incident,type Action} from '../family/response-operations/domain.ts';
const priorities=['P1','P2','P3'] as const;
const responder=(state:State,id:string)=>state.members.some(m=>m.id===id&&m.active&&m.role!=='viewer');
export function reviewCommand(state:State,actor:Member,incident:Incident,input:any,at:string):string|null {
 if(input.type==='action'){
  if(!responder(state,input.owner)||!responder(state,input.escalationRecipient??input.owner))fail('Follow-up owner and escalation recipient must be active responders');
  if(typeof input.due!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.due)||!Number.isFinite(Date.parse(input.due+'T00:00:00Z'))||new Date(input.due+'T00:00:00Z').toISOString().slice(0,10)!==input.due)fail('Valid calendar due date required');
  const priority=input.priority??'P2',completionPolicy=input.completionPolicy??'human-review';
  if(!priorities.includes(priority)||!['evidence','human-review'].includes(completionPolicy)||priority==='P1'&&completionPolicy!=='human-review')fail('P1 follow-ups require human review; choose a valid priority and completion policy');
  const action:Action={id:crypto.randomUUID(),title:text(input.title,'action',500),owner:input.owner,due:input.due,done:false,evidence:'',priority,completionPolicy,escalationRecipient:input.escalationRecipient??input.owner};
  incident.actions.push(action);return `Follow-up ${priority}: ${action.title} due ${action.due} (UTC calendar date); completion ${completionPolicy}`;
 }
 if(input.type==='complete'||input.type==='accept-action'){
  const action=incident.actions.find(a=>a.id===input.action);if(!action)fail('Unknown follow-up');if(action.done)fail('Follow-up already accepted',409);
  if(input.type==='complete'){
   const evidence=link(input.evidence);if(!evidence)fail('Completion evidence URL required');
   action.evidence=evidence;action.submission={by:actor.id,at,evidence};
   if(action.completionPolicy==='human-review'){return `Completion evidence submitted; awaiting human acceptance: ${action.title} — ${evidence}`;}
   action.done=true;action.accepted={by:actor.id,at};return `Completed under evidence policy: ${action.title} — ${evidence}`;
  }
  if(action.completionPolicy!=='human-review'||!action.submission||!action.evidence)fail('Submit evidence before accepting completion',409);
  const reason=text(input.reason,'Acceptance reason',3000);action.done=true;action.accepted={by:actor.id,at};return `Human accepted follow-up completion: ${action.title} — ${reason} — ${action.evidence}`;
 }
 if(input.type==='review'){
  if(incident.state!=='resolved')fail('Review requires resolved incident');
  const review=text(input.text,'review',10000);
  if(input.accept===true){
   if(input.materialRevision!==incident.revision||input.materialWorkspaceRevision!==state.revision)fail('Review material changed; reload before accepting',409);
   incident.reviewAcceptance={rootCause:text(input.rootCause,'Human-accepted root cause',3000),impact:text(input.impact,'Human-accepted impact',3000),by:actor.id,at,materialRevision:incident.revision,workspaceRevision:state.revision};
  }else delete incident.reviewAcceptance;
  incident.review=review;return input.accept===true?'Human accepted root cause, impact and review against retained material':'Postincident review updated; root cause and impact acceptance not recorded';
 }
 return null;
}
export function validateReviewFields(state:State){
 const member=(id:any)=>state.members.some(m=>m.id===id),date=(v:any)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
 const exact=(v:any,keys:string[])=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
 for(const incident of state.incidents){
  const review=incident.reviewAcceptance;
  if(review!==undefined&&(!exact(review,['rootCause','impact','by','at','materialRevision','workspaceRevision'])||!member(review.by)||!date(review.at)||!Number.isSafeInteger(review.workspaceRevision)||review.workspaceRevision<0||!Number.isSafeInteger(review.materialRevision)||review.materialRevision<1||review.materialRevision>=incident.revision||!incident.review||incident.state!=='resolved'))fail('Invalid accepted review');
  if(review){text(review.rootCause,'Accepted root cause',3000);text(review.impact,'Accepted impact',3000);}
  for(const action of incident.actions){
   if(action.priority!==undefined&&!priorities.includes(action.priority))fail('Invalid follow-up priority');
   if(action.completionPolicy!==undefined&&!['evidence','human-review'].includes(action.completionPolicy))fail('Invalid completion policy');
   if(action.priority==='P1'&&action.completionPolicy!=='human-review')fail('P1 requires human review');
   if(action.escalationRecipient!==undefined&&!member(action.escalationRecipient))fail('Invalid escalation recipient');
   for(const key of ['submission','accepted'] as const){const record=action[key];if(record!==undefined&&(!exact(record,key==='submission'?['by','at','evidence']:['by','at'])||!member(record.by)||!date(record.at)))fail('Invalid follow-up acceptance attribution');}
   if(action.submission&&(!action.submission.evidence||link(action.submission.evidence)!==action.submission.evidence||action.evidence!==action.submission.evidence))fail('Invalid submitted evidence');
   if(action.accepted&&!action.done||action.completionPolicy==='human-review'&&action.done&&(!action.submission||!action.accepted))fail('Human-review completion requires evidence and acceptance');
  }
 }
}

export function validateLifecycleEntry(entry:any){
 const lifecycle=entry.lifecycle,review=entry.review;
 if(lifecycle!==undefined){
  const states=['declared','acknowledged','mitigating','recovered','resolved'];
  if(!lifecycle||typeof lifecycle!=='object'||Array.isArray(lifecycle)||Object.keys(lifecycle).some(k=>!['from','to','evidence'].includes(k))||!Object.hasOwn(lifecycle,'from')||!Object.hasOwn(lifecycle,'to')||!states.includes(lifecycle.to)||(lifecycle.from!==null&&!states.includes(lifecycle.from)))fail('Invalid lifecycle metadata');
  const allowed:Record<string,string[]>={declared:['acknowledged'],acknowledged:['mitigating','recovered'],mitigating:['recovered'],recovered:['mitigating','resolved'],resolved:[]};
  if(entry.kind==='declared'?lifecycle.from!==null||lifecycle.to!=='declared':entry.kind==='bulk-acknowledge'?lifecycle.from!=='declared'||lifecycle.to!=='acknowledged':entry.kind==='bulk-resolve'?lifecycle.from===null||lifecycle.from==='resolved'||lifecycle.to!=='resolved':entry.kind!=='transition'||!allowed[lifecycle.from]?.includes(lifecycle.to))fail('Lifecycle metadata disagrees with event kind');
  if(lifecycle.evidence!==undefined&&(!lifecycle.evidence||link(lifecycle.evidence)!==lifecycle.evidence))fail('Invalid immutable lifecycle evidence');
  if((lifecycle.to==='recovered'||entry.kind==='bulk-resolve')&&!lifecycle.evidence)fail('Evidenced lifecycle entry requires its own recovery link');
 }
 if(review!==undefined){
  if(entry.kind!=='review'||!review||typeof review!=='object'||Array.isArray(review)||Object.keys(review).length!==5||!['rootCause','impact','review','materialRevision','workspaceRevision'].every(k=>Object.hasOwn(review,k))||!Number.isSafeInteger(review.workspaceRevision)||review.workspaceRevision<0||!Number.isSafeInteger(review.materialRevision)||review.materialRevision<1)fail('Invalid immutable accepted review');
  text(review.rootCause,'Accepted root cause',3000);text(review.impact,'Accepted impact',3000);text(review.review,'Accepted review',10000);
 }
}
