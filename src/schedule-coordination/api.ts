import type {Schedule} from '../family/response-operations/schedules';
import {fail,type Member} from '../family/response-operations/domain';
import {pagingSnapshot,commitPaging,putSchedule} from '../paging-store';
import {record,records,responsive,swapState,swapSchedule,reminderDue} from './model';
import {auditKind} from '../audit-store';
export const tokenHash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
export function installScheduleCoordination(api:any,body:(c:any)=>Promise<any>){
 api.get('/api/schedule-coordination',async(c:any)=>{
  const s=await pagingSnapshot(c.env.DB),actor:Member=c.get('actor');
  return c.json({records:records(s.workspace).filter(r=>r.kind==='policy'||r.member===actor.id||r.kind==='swap'&&(r.data.substitute===actor.id||actor.role==='admin')).map(r=>({...r,data:r.kind==='subscription'?{scope:r.data.scope,target:r.data.target}:r.data,...(r.kind==='swap'?{status:swapState(r)}:{}),...(r.kind==='reminder'?{dueAt:reminderDue(s.workspace,r,s.archive.schedules),label:'not sent (no timer)'}:{})}))});
 });
 api.post('/api/schedule-coordination',async(c:any)=>{
  const s=await pagingSnapshot(c.env.DB),actor=s.workspace.members.find(m=>m.id===c.get('actor').id&&m.active);
  if(!actor||!responsive(s.workspace,actor.id))fail('Current responder or admin required',403);
  const input=await body(c);auditKind(c.env.DB,'schedule.'+(['request','approve','accept','decline','cancel','policy','reminder','subscribe','revoke'].includes(input.action)?input.action:'refused'));
  let row,feedToken:string|undefined,changed:Schedule|undefined;
  if(input.action==='request'){
   const schedule=s.archive.schedules.find(v=>v.id===input.schedule);if(!schedule)fail('Unknown schedule',404);
   if(input.scheduleRevision!==schedule.revision)fail('Schedule changed; reload',409);
   if(Date.parse(input.start)<=Date.now())fail('Swap must start in the future');
   swapSchedule(s.workspace,schedule,actor.id,input.substitute,input.role,input.start,input.end);
   const policy=records(s.workspace).find(r=>r.kind==='policy'&&r.active&&r.data.schedule===schedule.id);
   row=record(s.workspace,'swap',actor.id,{schedule:schedule.id,scheduleRevision:schedule.revision,substitute:input.substitute,role:input.role,start:new Date(input.start).toISOString(),end:new Date(input.end).toISOString(),status:'pending',approved:policy?.data.swapApproval==='none',override:null});
  }else if(['approve','accept','decline','cancel'].includes(input.action)){
   row=records(s.workspace).find(r=>r.id===input.id&&r.kind==='swap');if(!row)fail('Unknown swap',404);
   if(!row.active||row.revision!==input.revision)fail('Swap changed or restored inactive; reload',409);
   if(row.data.status!=='pending')fail('Swap is already decided',409);
   if(input.action==='cancel'){if(row.member!==actor.id)fail('Only the requester may cancel',403);row.data.status='cancelled';}
   else if(input.action==='approve'){if(actor.role!=='admin')fail('Administrator approval required',403);if(swapState(row)==='overdue')fail('Swap is overdue; it will not resolve automatically',409);row.data.approved=true;}
   else {
    if(row.data.substitute!==actor.id)fail('Only the named substitute may accept or decline',403);
    if(swapState(row)==='overdue')fail('Swap is overdue; it will not resolve automatically',409);
    if(input.action==='accept'){
     if(!row.data.approved)fail('Administrator approval is required before substitute acceptance',403);
     const schedule=s.archive.schedules.find(v=>v.id===row!.data.schedule);if(!schedule)fail('Unknown schedule',404);
     if(schedule.revision!==row.data.scheduleRevision)fail('Schedule changed; request a new swap',409);
     changed=swapSchedule(s.workspace,schedule,row.member,actor.id,row.data.role,row.data.start,row.data.end);
     row.data.override=changed.overrides.at(-1)!.id;
    }
    row.data.status=input.action==='accept'?'accepted':'declined';
   }
   row.revision++;
  }else if(input.action==='policy'){
   if(actor.role!=='admin')fail('Administrator required',403);
   if(!s.archive.schedules.some(v=>v.id===input.schedule)||!['none','admin'].includes(input.swapApproval))fail('Choose a schedule and approval rule');
   row=records(s.workspace).find(r=>r.kind==='policy'&&r.data.schedule===input.schedule);
   if(row){if(input.revision!==row.revision)fail('Policy changed; reload',409);row.data.swapApproval=input.swapApproval;row.active=true;row.revision++;}
   else row=record(s.workspace,'policy',actor.id,{schedule:input.schedule,swapApproval:input.swapApproval});
  }else if(input.action==='reminder'){
   if(!Number.isSafeInteger(input.leadMinutes)||input.leadMinutes<0||input.leadMinutes>10080||!['email','sms','voice','push'].includes(input.channel))fail('Choose 0–10,080 lead minutes and a channel');
   row=records(s.workspace).find(r=>r.kind==='reminder'&&r.member===actor.id);
   if(row){if(input.revision!==row.revision)fail('Reminder changed; reload',409);row.data={leadMinutes:input.leadMinutes,channel:input.channel};row.active=true;row.revision++;}
   else row=record(s.workspace,'reminder',actor.id,{leadMinutes:input.leadMinutes,channel:input.channel});
  }else if(input.action==='subscribe'){
   if(records(s.workspace).filter(r=>r.kind==='subscription'&&r.member===actor.id).length>=20)fail('Maximum 20 calendar subscriptions per member',429);
   if(!['schedule','service','own'].includes(input.scope)||input.scope==='schedule'&&!s.archive.schedules.some(v=>v.id===input.target)||input.scope==='service'&&!s.workspace.services.some(v=>v.id===input.target))fail('Choose a schedule, service or your own shifts');
   feedToken=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
   row=record(s.workspace,'subscription',actor.id,{scope:input.scope,target:input.scope==='own'?actor.id:input.target,hash:await tokenHash(feedToken)});
  }else if(input.action==='revoke'){
   row=records(s.workspace).find(r=>r.id===input.id&&r.kind==='subscription');if(!row)fail('Unknown subscription',404);
   if(row.member!==actor.id&&actor.role!=='admin')fail('Only the subscription owner or an admin may revoke',403);
   if(row.revision!==input.revision)fail('Subscription changed; reload',409);row.active=false;row.data.hash=null;row.revision++;
  }else fail('Unknown schedule coordination action');
  const archive=changed?{...s.archive,schedules:s.archive.schedules.map(v=>v.id===changed!.id?changed!:v)}:s.archive;
  await commitPaging(c.env.DB,s,archive,token=>changed?[putSchedule(c.env.DB,changed,token)]:[],{digest:c.get('sessionDigest'),member:actor.id},{saveWorkspace:true,scheduleChange:!!changed});
  return c.json({record:{...row,data:row.kind==='subscription'?{scope:row.data.scope,target:row.data.target}:row.data},...(feedToken?{url:new URL('/calendar/'+feedToken+'.ics',c.req.url).href}:{}),paging:'OFF'});
 });
}
