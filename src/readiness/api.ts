import {markReadinessReport} from './read-audit';
import {deploymentHealth} from '../base/deployment-health';
import {readinessMember} from './authority';
import {readinessMatrix} from './observations';
import {installationChecklist} from './matrix';
import {readinessSignals} from './signals';
import {observeSignInMail} from './sign-in-mail';
import {hostingChecks} from './hosting';
import type {Readiness} from './types';
import type {Bindings} from '../auth.server';

declare const __ONCALL_RELEASE__: Pick<Readiness['release'],'package'|'version'>;

/** Native readiness projection; each door retains its own current authority and read audit. */
export async function assembleReadiness(env:Bindings,now=Date.now(),ownerSignedIn=false):Promise<Readiness> {
  const [matrix,signals,mail]=await Promise.all([readinessMatrix(env.DB),readinessSignals(env.DB,now),observeSignInMail(env)]);
  const complete=mail.state!=='unavailable'&&!signals.some(row=>row.state==='unavailable')&&!matrix.some(row=>row.observation?.state==='unavailable');
  return {observedAt:new Date(now).toISOString(),complete,
   release:{...__ONCALL_RELEASE__,deployment:deploymentHealth(env).deployment},matrix,signals,
   installation:installationChecklist(matrix,mail,hostingChecks(env,signals,ownerSignedIn)),
   pagerCoverage:{state:'unproven',paging:'off',reason:'Paging is OFF. Web and storage health cannot prove pager coverage. No localhost test, demo or provider sandbox substitutes for live acceptance. Keep your existing pager.'}};
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
