import {fail,type State} from '../family/response-operations/domain';
import {pagingSnapshot} from '../paging-store';
import {responseReport} from './report';
import {exportResponseCsv} from './csv';
import {coverageLoad,type ProjectedReport} from './load';
import {alertNoise} from './noise';
import {reviewMaterial} from './material';
export function installReviews(api:any,authorizedState:(c:any)=>Promise<State>){
 const project=async(c:any):Promise<ProjectedReport>=>{
  const query=c.req.query();if(Object.keys(query).some(key=>!['from','to','service','at','revision','schedulingRevision'].includes(key)))fail('Unsupported response report filter');
  const {at,revision,schedulingRevision,...input}=query;
  if(at!==undefined&&(!Number.isFinite(Date.parse(at))||Date.parse(at)>Date.now()))fail('Observation time must be valid and no later than now');
  await authorizedState(c);
  // Incidents and schedules come from one snapshot, so the report and its coverage share a moment.
  const s=await pagingSnapshot(c.env.DB),state=s.workspace;
  if(!state.members.some(m=>m.id===c.get('actor').id&&m.active))fail('Access revoked',401);
  if(revision!==undefined&&String(state.revision)!==revision)fail('Workspace changed; refresh the report before exporting',409);
  if(schedulingRevision!==undefined&&String(s.revision)!==schedulingRevision)fail('Schedules changed; refresh the report before exporting',409);
  const report=responseReport(state,input,at??new Date().toISOString());
  return {...report,load:coverageLoad(state,{revision:s.revision,schedules:s.archive.schedules},report),noise:alertNoise(state,report)};
 };
 api.get('/api/reports/response',async(c:any)=>c.json(await project(c)));
 api.get('/api/reports/response.csv',async(c:any)=>{
  const report=await project(c);c.header('Content-Type','text/csv; charset=utf-8');c.header('Content-Disposition','attachment; filename="oncall-response.csv"');return c.body(exportResponseCsv(report));
 });
 api.get('/api/reviews/:incident/material',async(c:any)=>c.json(reviewMaterial(await authorizedState(c),c.req.param('incident'))));
}
