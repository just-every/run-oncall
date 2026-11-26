import {markReadinessReport} from './read-audit';
import {deploymentHealth} from '../base/deployment-health';
import {readinessMember} from './authority';
import {readinessMatrix} from './observations';
import {installationChecklist} from './matrix';
import {readinessSignals} from './signals';
import {observeSignInMail} from './sign-in-mail';
import {hostingChecks} from './hosting';
import type {MatrixRow, Readiness} from './types';
import {smsPaging} from '../sms-paging/state';
import {coverageReason, pagingStatus, rotasOn, type SmsPaging} from '../sms-paging/words';
import type {Bindings} from '../auth.server';

declare const __ONCALL_RELEASE__: Pick<Readiness['release'],'package'|'version'>;

// The matrix's paging row says what this installation's SMS sender does; with no sender it keeps the release's row.
function pagingRow(row:MatrixRow,sms:SmsPaging):MatrixRow {
 const status=pagingStatus(sms);
 if(status==='on')return {...row,state:'unproven-live',evidence:{kind:'maintained-journey',reference:'tests/paging-sender.mjs'},limitation:`On: Oncall texts the on-call person by SMS for ${rotasOn(sms)===1?'1 rota':rotasOn(sms)+' rotas'}. No phone call, push or incident email sender; a delivered text is not a drill. Keep your existing pager.`};
 if(status==='off')return {...row,limitation:'An SMS sender is configured, but no rota has paging switched on. No phone call, push or incident email sender. Keep your existing pager.'};
 return row;
}

/** Native readiness projection; each door retains its own current authority and read audit. */
export async function assembleReadiness(env:Bindings,now=Date.now(),ownerSignedIn=false):Promise<Readiness> {
  const [release,signals,mail,sms]=await Promise.all([readinessMatrix(env.DB),readinessSignals(env.DB,now),observeSignInMail(env),smsPaging(env.DB,env)]);
  const matrix=release.map(row=>row.id==='paging'?pagingRow(row,sms):row);
  const complete=mail.state!=='unavailable'&&!signals.some(row=>row.state==='unavailable')&&!matrix.some(row=>row.observation?.state==='unavailable');
  return {observedAt:new Date(now).toISOString(),complete,
   release:{...__ONCALL_RELEASE__,deployment:deploymentHealth(env).deployment},matrix,signals,
   installation:installationChecklist(matrix,mail,hostingChecks(env,signals,ownerSignedIn)),
   pagerCoverage:{state:'unproven',paging:pagingStatus(sms)==='on'?'on':'off',sender:sms.configured?'sms':'none',reason:coverageReason(sms)}};
}

export function installReadiness(api:any) {
 api.get('/api/readiness',async(c:any)=>{
  const authorize=()=>readinessMember(c.env,c.req.raw);
  const access=await authorize();
  if(!access)return c.json({error:'Sign in required'},401);
  if(access.member.role==='stakeholder')return c.json({error:'Current workspace member required'},403);
  const report=await assembleReadiness(c.env,Date.now(),access.ownerSignedIn);
  const current=await authorize();
  if(!current)return c.json({error:'Sign in required'},401);
  if(current.member.role==='stakeholder')return c.json({error:'Current workspace member required'},403);
  markReadinessReport(c.env.DB);
  return c.json(report,report.complete?200:503);
 });
}
