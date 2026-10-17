import {fail,type State} from '../family/response-operations/domain';
import {responseReport,exportResponseCsv} from './report';
import {reviewMaterial} from './material';
export function installReviews(api:any,authorizedState:(c:any)=>Promise<State>){
 const project=async(c:any)=>{
  const query=c.req.query();if(Object.keys(query).some(key=>!['from','to','service','at','revision'].includes(key)))fail('Unsupported response report filter');
  const {at,revision,...input}=query;
  if(at!==undefined&&(!Number.isFinite(Date.parse(at))||Date.parse(at)>Date.now()))fail('Observation time must be valid and no later than now');
  const state=await authorizedState(c);if(revision!==undefined&&String(state.revision)!==revision)fail('Workspace changed; refresh the report before exporting',409);
  return responseReport(state,input,at??new Date().toISOString());
 };
 api.get('/api/reports/response',async(c:any)=>c.json(await project(c)));
 api.get('/api/reports/response.csv',async(c:any)=>{
  const report=await project(c);c.header('Content-Type','text/csv; charset=utf-8');c.header('Content-Disposition','attachment; filename="oncall-response.csv"');return c.body(exportResponseCsv(report));
 });
 api.get('/api/reviews/:incident/material',async(c:any)=>c.json(reviewMaterial(await authorizedState(c),c.req.param('incident'))));
}
