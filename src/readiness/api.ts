import {markReadinessReport} from './read-audit';
import {deploymentHealth} from '../base/deployment-health';
import {readinessMember} from './authority';
import {readinessMatrix} from './observations';
import {readinessSignals} from './signals';
import type {Readiness} from './types';

declare const __ONCALL_RELEASE__: Pick<Readiness['release'],'package'|'version'>;

export function installReadiness(api:any) {
 api.get('/api/readiness',async(c:any)=>{
  const authorize=async()=>{
   const member=await readinessMember(c.env,c.req.raw);
   if(!member)return c.json({error:'Sign in required'},401);
   if(member.role==='stakeholder')return c.json({error:'Current workspace member required'},403);
   return null;
  };
  const denied=await authorize();if(denied)return denied;
  const now=Date.now();
  const [matrix,signals]=await Promise.all([readinessMatrix(c.env.DB),readinessSignals(c.env.DB,now)]);
  const revoked=await authorize();if(revoked)return revoked;
  const complete=!signals.some(row=>row.state==='unavailable')&&!matrix.some(row=>row.observation?.state==='unavailable');
  const report:Readiness={observedAt:new Date(now).toISOString(),complete,
   release:{...__ONCALL_RELEASE__,deployment:deploymentHealth(c.env).deployment},matrix,signals,
   pagerCoverage:{state:'unproven',paging:'off',reason:'Paging is OFF. Web and storage health cannot prove pager coverage. No localhost test, demo or provider sandbox substitutes for live acceptance. Keep your existing pager.'}};
  markReadinessReport(c.env.DB);
  return c.json(report,complete?200:503);
 });
}
