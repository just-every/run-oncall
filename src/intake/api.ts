import { fail, Fault, type State } from '../family/response-operations/domain.ts';
import { intakeHash } from './credentials';
import { providerInput } from './providers';
import { receiveCompatible } from './lifecycle';
import type { CompatibleProvider } from './provider-types';
import type { IntakeSource } from './model';

type Dependencies={load:(db:D1Database)=>Promise<State>;save:(db:D1Database,state:State,revision:number,guard:{sql:string;values:(string|number|null)[]})=>Promise<void>};
const validObject=(v:any)=>v&&typeof v==='object'&&!Array.isArray(v);
export function installCompatibleIntake(api:any,deps:Dependencies) {
  async function credential(c:any,key:unknown,provider:string) {
    if(typeof key!=='string'||key.length>200||!key)fail('Invalid integration credential',401);
    const digest=await intakeHash(key),row=await c.env.DB.prepare('SELECT source,key_digest FROM oc_intake_credentials WHERE key_digest=?').bind(digest).first();
    if(!row)fail('Invalid integration credential',401);
    const state=await deps.load(c.env.DB),source=state.intakeSources?.find(s=>s.id===row.source&&s.active&&s.provider===provider);
    if(!source)fail('Integration is inactive or uses another endpoint',401);
    return {state,source:source as IntakeSource,digest,key};
  }
  async function receive(c:any,provider:CompatibleProvider) {
    const raw=await c.req.text();
    if(new TextEncoder().encode(raw).length>512*1024)fail('Compatible request exceeds 512 KiB; no acceptance confirmed',413);
    let payload:any;try{payload=JSON.parse(raw)}catch{fail('Invalid JSON')}
    if(!validObject(payload))fail('Event must be a JSON object');
    const key=provider==='pagerduty-v2'?payload.routing_key:provider==='pagerduty-v1'?payload.service_key:provider==='opsgenie'?(c.req.header('authorization')??'').replace(/^GenieKey /,''):c.req.param('endpointKey');
    const configured=await credential(c,key,provider.startsWith('pagerduty')?'pagerduty':provider);
    const {state,source,digest}=configured,revision=state.revision;
    const action=provider==='opsgenie'&&c.req.param('action')?({close:'recover',acknowledge:'acknowledge',notes:'note'} as const)[c.req.param('action') as 'close'|'acknowledge'|'notes']:undefined;
    if(action&&c.req.query('identifierType')!=='alias')fail('Use identifierType=alias for compatible alert actions');
    const input=providerInput(provider,payload,{secret:configured.key,...(action?{action,alias:c.req.param('identifier')}:{}) ,...(provider==='splunk'?{routingKey:c.req.param('routingKey')}:{})});
    const receipt=receiveCompatible(state,source,provider,input);
    await deps.save(c.env.DB,state,revision,{sql:'EXISTS(SELECT 1 FROM oc_intake_credentials WHERE source=? AND key_digest=?)',values:[source.id,digest]});
    if(provider==='pagerduty-v2')return c.json({status:'success',message:'Event processed',dedup_key:receipt.key},202);
    if(provider==='pagerduty-v1')return c.json({status:'success',message:'Event processed',incident_key:receipt.key},200);
    if(provider==='opsgenie')return c.json({result:'Request will be processed',requestId:receipt.id,took:0},202);
    return c.json({result:'success',entity_id:receipt.key},200);
  }
  const wrapped=(provider:CompatibleProvider)=>async(c:any)=>{
    try{return await receive(c,provider)}catch(error){
      if(!(error instanceof Fault))throw error;
      const busy=error.status===409,status=busy?503:error.status;
      if(provider.startsWith('pagerduty'))return c.json({status:'invalid event',message:busy?'Admission changed; retry the request':'Event object is invalid',errors:[error.message]},(status===429?provider==='pagerduty-v1'?403:429:status>=500?status:400));
      if(provider==='opsgenie')return c.json({message:error.message,code:status*100},status===413?400:status);
      return c.json({result:'error',message:error.message},status);
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
      const key=(c.req.header('authorization')??'').replace(/^GenieKey /,''),{state,source}=await credential(c,key,'opsgenie');
      const receipt=state.intakeReceipts?.find(r=>r.id===c.req.param('requestId')&&r.source===source.id);
      if(!receipt)return c.json({message:'Request not found',code:40400},404);
      return c.json({data:{action:receipt.action==='trigger'?'Create':receipt.action==='recover'?'Close':receipt.action==='note'?'AddNote':'Acknowledge',processedAt:receipt.acceptedAt,isSuccess:true,status:receipt.outcome,alias:receipt.key},requestId:receipt.id,took:0});
    }catch(error){if(error instanceof Fault)return c.json({message:error.message,code:error.status*100},error.status);throw error;}
  });
  api.post('/integrations/generic/20131114/alert/:endpointKey/:routingKey',wrapped('splunk'));
}
