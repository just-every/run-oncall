import {rateFaultBody} from '../intake-rate/fault';
import {beginRate,saveRate,admittedCount} from '../intake-rate/admission';
import { fail, Fault } from '../family/response-operations/domain.ts';
import { normalizeMonitoring } from './providers.ts';
import { intakeCredential, credentialGuard, grafanaSigning, verifyGrafana, type IntakeDependencies } from './credentials.ts';
import { readIntakeRequest } from './request.ts';
import { receiveMonitoring } from './admission.ts';
import { incompleteEvidence, retainIncomplete } from './incomplete.ts';
import type { MonitoringProvider } from './types.ts';

export function installMonitoringIntake(api:any,deps:IntakeDependencies) {
  api.post('/api/monitoring/:source',async(c:any)=>{
    try {
      const state=await deps.load(c.env.DB),known=state.intakeSources?.find(s=>s.id===c.req.param('source'));
      const provider=known?.provider;
      if(!provider||!['alertmanager','grafana','datadog'].includes(provider)) {
        // Use the shared rejection path, including unknown/wrong-provider URLs.
        await intakeCredential(c,deps,'','monitoring',c.req.param('source'));fail('Unknown monitoring source',401);
      }
      const header=c.req.header('authorization')??'',key=header.startsWith('Bearer ')?header.slice(7):'';
      const configured=await intakeCredential(c,deps,key,provider,c.req.param('source'));
      const signing=provider==='grafana'?await grafanaSigning(c,configured.source):{ciphertext:null,key:null},timestamp=c.req.header('x-grafana-alerting-timestamp')??null;
      const request=await readIntakeRequest(c.req.raw,2*1024*1024,signing.key?{key:signing.key,timestamp}:undefined);
      if(signing.key)await verifyGrafana(c,deps,configured.state,configured.source,c.req.header('x-grafana-alerting-signature')??'',request.signature!,timestamp);
      const guard=credentialGuard(configured.source,configured.digest) as {sql:string;values:(string|number|null)[]};
      if(provider==='grafana'){guard.sql+=' AND EXISTS(SELECT 1 FROM oc_intake_credentials WHERE source=? AND signing_custody IS ?)';guard.values.push(configured.source.id,signing.ciphertext);}
      const rate=await beginRate(c,deps,configured.state,{id:'intake:'+configured.source.id,name:configured.source.name,owner:configured.source.routing?.owner??configured.source.createdBy},guard);
      const before=structuredClone(configured.state),result=await normalizeMonitoring(provider as MonitoringProvider,request.payload,signing.key?[configured.key,signing.key]:configured.key);
      const receipts=result.events.map(event=>{
        const admitted=receiveMonitoring(configured.state,configured.source,event,{provider:provider as MonitoringProvider,monitoring:{eventId:event.eventId,sourceGeneration:event.generation}});
        return {id:admitted.receipt.id,eventId:event.eventId,duplicate:admitted.duplicate};
      });
      const incomplete=request.incomplete||result.dropped!==0||!result.events.length;
      const held=incomplete?retainIncomplete(configured.state,configured.source,provider as MonitoringProvider,incompleteEvidence(request,result.events.map(e=>e.eventId),result.dropped,result.diagnostics)):undefined;
      if(JSON.stringify(configured.state)!==JSON.stringify(before))await saveRate(c,deps,configured.state,configured.state.revision,rate,admittedCount(before,configured.state));
      return c.json({status:'accepted',receipts,truncation:incomplete||result.truncated,...(held?{incomplete:{receipt:held.receipt.id}}:{})},202);
    } catch(error) {
      if(!(error instanceof Fault))throw error;
      return c.json({error:error.message,...rateFaultBody(error)},error.status===409?503:error.status);
    }
  });
}
