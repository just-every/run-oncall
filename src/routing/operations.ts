import { authority, fail, text } from '../family/response-operations/domain.ts';
import { incompleteRouting } from '../monitoring/incomplete.ts';
import { receiveMonitoring } from '../monitoring/admission.ts';
import { receiveCompatible } from '../intake/lifecycle.ts';
import { exact, routingRules } from './definition.ts';
import { evaluateRouting } from './engine.ts';
import { previewRouting } from './preview.ts';
import { routingSave, routingSource, type RoutingDependencies } from './management.ts';

export function installRoutingOperations(api:any,deps:RoutingDependencies) {
  api.post('/api/routing/keys/:id/publish',async(c:any)=>{
    const input=await deps.body(c),state=await deps.state(c,true),actor=c.get('actor');authority(state,actor,true);
    exact(input,['baseVersion','rules','catchAll']);
    const source=routingSource(state,c.req.param('id')),current=source.routing.versions.at(-1)!,at=new Date().toISOString();
    if(!Number.isSafeInteger(input.baseVersion)||input.baseVersion<1)fail('A valid draft base version is required');
    if(input.baseVersion!==current.version) {
      state.audit.push({id:crypto.randomUUID(),at,actor:actor.id,kind:'routing-publish-refused',text:`Refused stale publish for ${source.id}: base ${input.baseVersion}; current ${current.version}`});
      await routingSave(c,deps,state);fail('Routing base version is stale; reload and replay before publishing',409);
    }
    if(source.routing.versions.length>=10000)fail('Routing version capacity reached; export before extending capacity',429);
    const version={version:current.version+1,...routingRules(source.routing.scope,input.rules,input.catchAll),publishedBy:actor.id,publishedAt:at};
    source.routing.versions.push(version);source.revision++;source.updatedAt=at;
    state.audit.push({id:crypto.randomUUID(),at,actor:actor.id,kind:'routing-published',text:`Published routed key ${source.id} rule version ${version.version} from base ${current.version}`});
    await routingSave(c,deps,state);return c.json(version,201);
  });
  api.post('/api/routing/keys/:id/preview',async(c:any)=>{
    const input=await deps.body(c),state=await deps.state(c,true),actor=c.get('actor');authority(state,actor,true);
    exact(input,['baseVersion','rules','catchAll'],['receiptIds','from','to']);
    const source=routingSource(state,c.req.param('id')),current=source.routing.versions.at(-1)!;
    if(input.baseVersion!==current.version)fail('Routing base version is stale; reload before replay',409);
    const draft={...current,...routingRules(source.routing.scope,input.rules,input.catchAll)};
    return c.json(previewRouting(state,source,draft,input));
  });
  api.post('/api/routing/keys/:id/readmit',async(c:any)=>{
    const input=await deps.body(c),state=await deps.state(c,true),actor=c.get('actor');authority(state,actor,true);
    exact(input,['receipt','service','operationId']);
    const source=routingSource(state,c.req.param('id')),operationId=text(input.operationId,'Re-admission operation ID',100);
    if(operationId!==input.operationId)fail('Use an exact re-admission operation ID');
    if(!source.routing.scope.includes(input.service))fail('Re-admission service is outside key scope');
    const original=state.intakeReceipts?.find(r=>r.id===input.receipt&&r.source===source.id&&r.outcome==='unrouted');
    if(!original?.routingInput)fail('Choose a retained unrouted receipt for this key',404);
    const previous=state.intakeReceipts?.find(r=>r.source===source.id&&r.routing?.readmission?.operationId===operationId);
    if(previous) {
      if(previous.routing!.readmission!.receipt!==original.id||previous.service!==input.service)fail('Re-admission operation already used for another request',409);
      return c.json(previous);
    }
    const at=new Date().toISOString(),explanation=original.incomplete?incompleteRouting(source)!:evaluateRouting(state,source.id,source.routing,source.routing.versions.at(-1)!,original.routingInput);
    explanation.kind='readmission';explanation.service=input.service;explanation.readmission={receipt:original.id,operationId,by:actor.id};
    explanation.diagnostics.push(`Re-admitted retained receipt ${original.id} by ${actor.id} to ${input.service}`);
    const {action,key,title,severity,priority,observedAt,sender,links,details,truncated}=original;
    const receipt=original.monitoring||original.incomplete
      ?receiveMonitoring(state,source,{eventId:original.monitoring?.eventId??'incomplete:'+original.incomplete!.sha256,key,generation:original.monitoring?.sourceGeneration??'incomplete:'+original.incomplete!.sha256,intent:action==='recover'?'recover':'trigger',title,severity,observedAt:observedAt??at,details,links,routingInput:original.routingInput,truncated},{provider:original.provider,monitoring:original.monitoring,incomplete:original.incomplete,explanation,readmission:true},at).receipt
      :receiveCompatible(state,source,original.provider as import('../intake/provider-types.ts').CompatibleProvider,{action,key,title,severity,priority,observedAt,sender,links:structuredClone(links),details:structuredClone(details),truncated},at,{input:original.routingInput,explanation});
    state.audit.push({id:crypto.randomUUID(),at,actor:actor.id,kind:'routing-readmitted',text:`Re-admitted ${original.id} as ${receipt.id} to ${receipt.service}`,operationId});
    await routingSave(c,deps,state);return c.json(receipt,201);
  });
}
