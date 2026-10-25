import { fail, type State } from '../family/response-operations/domain.ts';
import {emailListAddress} from './email-lists';
const exact=(value:any,keys:string[])=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const text=(value:unknown,max=100)=>typeof value==='string'&&value.length>0&&value.length<=max;
const date=(value:unknown)=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const statuses=['operational','degraded','major outage'];
export function validateBusinessStatus(state:State){
 const rows=state.businessServices;if(rows===undefined)return;
 if(!Array.isArray(rows)||rows.length>1000||new Set(rows.map(row=>row?.id)).size!==rows.length)fail('Invalid business services');
 const member=(id:unknown)=>state.members.some(row=>row.id===id),listIds=new Set<string>();
 for(const row of rows){
  if(!exact(row,['id','name','owningTeam','supporting','communicationsOwner','audience','highUrgencyImpact','active','revision','derived','impactRevision','override','subscriptions','notices',...(row?.emailLists!==undefined?['emailLists']:[])])||!text(row.id)||!text(row.name)||!text(row.owningTeam)||typeof row.active!=='boolean'||typeof row.highUrgencyImpact!=='boolean'||!Number.isSafeInteger(row.revision)||row.revision<1||!Number.isSafeInteger(row.impactRevision)||row.impactRevision<0||!statuses.includes(row.derived)||!(member(row.communicationsOwner)||row.communicationsOwner===''&&!row.active)||!Array.isArray(row.supporting)||!row.supporting.length||row.supporting.length>100||new Set(row.supporting).size!==row.supporting.length||row.supporting.some(id=>!state.services.some(service=>service.id===id))||!Array.isArray(row.audience)||row.audience.length>1000||new Set(row.audience).size!==row.audience.length||row.audience.some(id=>!member(id)))fail('Invalid business service references');
  const override=row.override;
  if(override!==null&&(!exact(override,['value','reason','by','at'])||!statuses.includes(override.value)||!text(override.reason,1000)||!member(override.by)||!date(override.at)))fail('Invalid status override');
  if(!Array.isArray(row.subscriptions)||row.subscriptions.length>1000||new Set(row.subscriptions.map(subscription=>subscription?.member)).size!==row.subscriptions.length)fail('Invalid subscriptions');
  for(const subscription of row.subscriptions)if(!exact(subscription,['member','channel','active','by','at'])||!member(subscription.member)||!member(subscription.by)||!['email','push','chat'].includes(subscription.channel)||typeof subscription.active!=='boolean'||!date(subscription.at))fail('Invalid subscription reference');
  if(row.emailLists!==undefined){
   if(!Array.isArray(row.emailLists)||row.emailLists.length>50)fail('Invalid email-list capacity');
   const addresses=new Set<string>();
   for(const list of row.emailLists){
    if(!exact(list,['id','category','address','channel','active','by','at'])||!text(list.id)||listIds.has(list.id)||list.category!=='email-list'||list.channel!=='email'||!text(list.address,254)||emailListAddress(list.address)!==list.address||typeof list.active!=='boolean'||!member(list.by)||!date(list.at)||addresses.has(list.address.toLowerCase()))fail('Invalid email-list subscriber');
    listIds.add(list.id);addresses.add(list.address.toLowerCase());
   }
  }
  if(!Array.isArray(row.notices)||row.notices.length>10000||new Set(row.notices.map(notice=>notice?.id)).size!==row.notices.length)fail('Invalid status obligations');
  for(const notice of row.notices){
   if(!exact(notice,['id','kind','state','paging','automatic','label','target','channel','businessService','businessName','derivedStatus','approvedUpdate','at',...(notice?.phase!==undefined?['phase']:[])])||!text(notice.id,400)||notice.kind!=='business-status'||!['recorded','stopped'].includes(notice.state)||notice.paging!=='off'||notice.automatic!==false||notice.label!=='no sender'||!exact(notice.target,['kind','id'])||notice.businessService!==row.id||!text(notice.businessName)||notice.approvedUpdate!==null||!date(notice.at))fail('Invalid status notice custody');
   if(notice.target.kind==='user'){
    if(!member(notice.target.id)||!['email','push','chat'].includes(notice.channel)||!['degraded','major outage'].includes(notice.derivedStatus)||notice.phase!==undefined)fail('Invalid user status obligation');
   }else if(notice.target.kind==='email-list'){
    if(!row.emailLists?.some(list=>list.id===notice.target.id)||notice.channel!=='email'||!['started','ended'].includes(notice.phase??'')||(notice.phase==='ended'?notice.derivedStatus!=='operational':!['degraded','major outage'].includes(notice.derivedStatus)))fail('Invalid email-list obligation');
   }else fail('Invalid status subscriber category');
  }
 }
}
