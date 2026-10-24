import {auditIdentity,auditKind} from '../audit-store';
import {tokenHash} from './api';
import {pagingSnapshot} from '../paging-store';
import {calendar} from '../calendar';
import {admitted} from '../base/setup-state';
import type {Bindings} from '../auth.server';
/** Capability is checked on every read; only schedule windows leave this door. */
export async function subscriptionResponse(request:Request,env:Bindings):Promise<Response|null>{
 const path=new URL(request.url).pathname;if(!path.startsWith('/calendar/'))return null;
 const headers={'cache-control':'private, no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff','x-robots-tag':'noindex'};
 if(!admitted(request,env.AUTH_ORIGIN))return new Response('Not found',{status:404,headers});
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{...headers,allow:'GET, HEAD'}});
 const match=/^\/calendar\/([a-f0-9]{64})\.ics$/.exec(path);if(!match)return new Response('Not found',{status:404,headers});
 const digest=await tokenHash(match[1]);
 const held=await env.DB.prepare("SELECT data FROM oc_schedule_records WHERE json_extract(data,'$.kind')='subscription' AND json_extract(data,'$.active')=1 AND json_extract(data,'$.data.hash')=?").bind(digest).first<{data:string}>();
 if(!held)return new Response('Subscription unavailable',{status:404,headers});
 const row=JSON.parse(held.data) as import('./model').ScheduleRecord,s=await pagingSnapshot(env.DB);
 if(!s.workspace.scheduleRecords?.some(current=>current.id===row.id&&current.active&&current.data.hash===digest)||!s.workspace.members.some(m=>m.id===row.member&&m.active&&['admin','responder'].includes(m.role)))return new Response('Subscription unavailable',{status:404,headers});
 auditIdentity(env.DB,{actor:{kind:'service',id:'calendar:'+row.id},subject:{kind:'member',id:row.member},source:{kind:'door',id:'calendar'}});auditKind(env.DB,'calendar.export');
 const from=Math.floor(Date.now()/1000)*1000,to=from+31*86400000;
 const selected=s.archive.schedules.filter(v=>row.data.scope==='own'||row.data.scope==='schedule'&&v.id===row.data.target||row.data.scope==='service'&&v.service===row.data.target);
 const members=s.workspace.members.map(({id,active,role})=>({id,active,role,name:'Responder'}));
 const events:string[]=[];
 for(const schedule of selected){const safe={...schedule,id:'schedule-'+await tokenHash(schedule.id)};events.push(...(calendar(safe,members,from,to,row.data.scope==='own'?row.member:undefined,true).match(/BEGIN:VEVENT\r\n[\s\S]*?END:VEVENT/g)??[]));}
 const body=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Oncall//Schedules//EN','CALSCALE:GREGORIAN',...events,'END:VCALENDAR',''].join('\r\n');
 return new Response(request.method==='HEAD'?null:body,{headers:{...headers,'content-type':'text/calendar; charset=utf-8'}});
}
