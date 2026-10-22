import {rateFaultBody} from '../intake-rate/fault';
import {beginRate,saveRate,admittedCount} from '../intake-rate/admission';
import { fail, Fault } from '../family/response-operations/domain.ts';
import { providerInput } from './providers';
import { receiveCompatible } from './lifecycle';
import type { CompatibleProvider } from './provider-types';
import { routingInput } from '../routing/input';
import { readIntakeRequest } from '../monitoring/request.ts';
import { intakeCredential, credentialGuard, type IntakeDependencies } from '../monitoring/credentials.ts';
import { incompleteEvidence, retainIncomplete } from '../monitoring/incomplete.ts';
import { monitoringSanitizer } from '../monitoring/sanitize.ts';

const validObject=(v:any)=>v&&typeof v==='object'&&!Array.isArray(v);
export function installCompatibleIntake(api:any,deps:IntakeDependencies) {
  async function receive(c:any,provider:CompatibleProvider) {
    const request=await readIntakeRequest(c.req.raw,512*1024),payload=validObject(request.payload)?request.payload as Record<string,unknown>:{};
    const key=provider==='pagerduty-v2'?payload.routing_key:provider==='pagerduty-v1'?payload.service_key:provider==='opsgenie'?(c.req.header('authorization')??'').replace(/^GenieKey /,''):c.req.param('endpointKey');
    const configured=await intakeCredential(c,deps,key,provider.startsWith('pagerduty')?'pagerduty':provider);
    const {state,source,digest}=configured,revision=state.revision;
    const rate=await beginRate(c,deps,state,{id:"intake:"+source.id,name:source.name,owner:source.routing?.owner??source.createdBy},credentialGuard(source,digest)),before=structuredClone(state);
    const action=provider==='opsgenie'&&c.req.param('action')?({close:'recover',acknowledge:'acknowledge',notes:'note'} as const)[c.req.param('action') as 'close'|'acknowledge'|'notes']:undefined;
    if(action&&c.req.query('identifierType')!=='alias')fail('Use identifierType=alias for compatible alert actions');
    let input:ReturnType<typeof providerInput>|undefined,diagnostic:string|undefined;
    try {input=providerInput(provider,payload,{secret:configured.key,...(action?{action,alias:c.req.param('identifier')}:{}) ,...(provider==='splunk'?{routingKey:c.req.param('routingKey')}:{})});}
    catch(error) {if(!(error instanceof Fault))throw error;diagnostic=error.message;}
    const receipt=input?receiveCompatible(state,source,provider,input,new Date().toISOString(),source.routing?{input:routingInput(provider,payload,input,configured.key,provider==='splunk'?c.req.param('routingKey'):undefined)}:undefined):undefined;
    const incomplete=request.incomplete||!input;
    const rawIdentity=provider==='pagerduty-v2'?payload.dedup_key:provider==='pagerduty-v1'?payload.incident_key:provider==='opsgenie'?c.req.param('identifier')??payload.alias:payload.entity_id;
    const readable=receipt?[receipt.key]:typeof rawIdentity==='string'&&rawIdentity? [monitoringSanitizer(configured.key).bound(rawIdentity,200)]:[];
    const held=incomplete?retainIncomplete(state,source,provider,incompleteEvidence(request,readable,input?0:1,diagnostic?[diagnostic]:[])):undefined;
    await saveRate(c,deps,state,revision,rate,admittedCount(before,state));
    const accepted=receipt??held!.receipt,truncation=incomplete?{truncation:true}:{};
    if(provider==='pagerduty-v2')return c.json({status:'success',message:'Event processed',dedup_key:accepted.key,...truncation},202);
    if(provider==='pagerduty-v1')return c.json({status:'success',message:'Event processed',incident_key:accepted.key,...truncation},incomplete?202:200);
    if(provider==='opsgenie')return c.json({result:'Request will be processed',requestId:accepted.id,took:0,...truncation},202);
    return c.json({result:'success',entity_id:accepted.key,...truncation},incomplete?202:200);
  }
  const wrapped=(provider:CompatibleProvider)=>async(c:any)=>{
    try{return await receive(c,provider)}catch(error){
      if(!(error instanceof Fault))throw error;
      const busy=error.status===409,status=busy?503:error.status;
      if(provider.startsWith('pagerduty'))return c.json({status:'invalid event',message:busy?'Admission changed; retry the request':'Event object is invalid',errors:[error.message],...rateFaultBody(error)},(status===429?429:status>=500?status:400));
      if(provider==='opsgenie')return c.json({message:error.message,code:status*100,...rateFaultBody(error)},status===413?400:status);
      return c.json({result:'error',message:error.message,...rateFaultBody(error)},status);
    }
  };
  api.post('/v2/enqueue',wrapped('pagerduty-v2'));
  api.post('/generic/2010-04-15/create_event.json',wrapped('pagerduty-v1'));
  api.post('/v2/alerts',wrapped('opsgenie'));
  api.post('/v2/alerts/:identifier/:action',async(c:any)=>{
    if(!['close','acknowledge','notes'].includes(c.req.param('action')))return c.json({message:'Not found'},404);
    return wrapped('opsgenie')(c);
  });
  api.get('/v2/alerts/requests/:requestId',async(c:any)=>{
    try {
      const key=(c.req.header('authorization')??'').replace(/^GenieKey /,''),{state,source,digest}=await intakeCredential(c,deps,key,'opsgenie');
      await beginRate(c,deps,state,{id:'intake:'+source.id,name:source.name,owner:source.routing?.owner??source.createdBy},credentialGuard(source,digest));
      const receipt=state.intakeReceipts?.find(r=>r.id===c.req.param('requestId')&&r.source===source.id);
      if(!receipt)return c.json({message:'Request not found',code:40400},404);
      return c.json({data:{action:receipt.action==='trigger'?'Create':receipt.action==='recover'?'Close':receipt.action==='note'?'AddNote':'Acknowledge',processedAt:receipt.acceptedAt,isSuccess:true,status:receipt.outcome,alias:receipt.key},requestId:receipt.id,took:0});
    }catch(error){if(error instanceof Fault)return c.json({message:error.message,code:error.status*100,...rateFaultBody(error)},error.status);throw error;}
  });
  api.post('/integrations/generic/20131114/alert/:endpointKey/:routingKey',wrapped('splunk'));
}
