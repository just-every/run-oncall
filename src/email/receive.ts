import type { Bindings } from '../auth.server';
import { auditedDatabase } from '../audit-database';
import { auditIdentity, auditOutcome, type AuditContext } from '../audit-store';
import { loadWorkspace, workspaceWrite } from '../workspace-store';
import { changeHash } from '../changes/credentials';
import { fail } from '../family/response-operations/domain';
import { parseEmail, emailDiagnostic } from './parse.mjs';
import { applyEmail } from './lifecycle';
import type { EmailReceipt } from './types';
export function inboundDomain(env:Pick<Bindings,'INBOUND_EMAIL_DOMAIN'>) {
  const value=env.INBOUND_EMAIL_DOMAIN?.trim().toLowerCase()??'';
  return /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(value)?value:null;
}
export async function receiveEmail(message:ForwardableEmailMessage,env:Bindings) {
  const context:AuditContext={feature:'email',kind:'email.receive',source:{kind:'transport',id:'cloudflare-email-routing'},actor:{kind:'transport',id:'cloudflare-email-routing'},commits:0,storageFailed:false};
  const audit=auditedDatabase(env.DB,context),db=audit.db;
  try {
    const digest=await changeHash(message.to.toLowerCase()),credential=await db.prepare('SELECT address,active FROM oc_email_credentials WHERE digest=?').bind(digest).first<{address:string;active:number}>();
    const state=await loadWorkspace(db),revision=state.revision,address=state.emailAddresses?.find(a=>a.id===credential?.address),at=new Date().toISOString();
    if(address)auditIdentity(db,{actor:{kind:'email-address',id:address.id},source:{kind:'email-address',id:address.id},subject:{kind:'email-address',id:address.id}});
    const domain=inboundDomain(env);
    let reason=!domain?'inbound_domain_not_configured':message.to.split('@')[1]?.toLowerCase()!==domain?'unknown_address':!address?'unknown_address':!credential?.active||!address.active?'revoked_address':!state.services.some(s=>s.id===address.service&&s.environment===address.environment)?'unmapped_service_environment':!state.members.some(m=>m.id===address.owner&&m.active&&m.role==='admin')?'integration_owner_inactive':'';
    if((state.emailReceipts??[]).filter(r=>r.address===(address?.id??null)&&Date.parse(r.at)>Date.now()-60000).length>=60)reason='address_rate_limit';
    const receipt:EmailReceipt={id:crypto.randomUUID(),address:address?.id??null,at,lastDelivery:at,messageDigest:null,deliveries:1,sample:null,decision:null,outcome:'refused',diagnostic:reason,alert:null,event:null,generation:null,obligation:null,stop:null};
    if(!reason) {
      let parsed:Awaited<ReturnType<typeof parseEmail>>|undefined;
      try {parsed=await parseEmail(message,message.to.split('@')[0]);}catch(error){reason=emailDiagnostic(error);}
      if(parsed) {
        receipt.messageDigest=parsed.messageId?await changeHash(parsed.messageId):null;
        const previous=receipt.messageDigest?state.emailReceipts?.find(r=>r.address===address!.id&&r.messageDigest===receipt.messageDigest):undefined;
        if(previous) {
          previous.deliveries++;previous.lastDelivery=at;
          auditOutcome(db,'refused');
          const result=await db.batch(workspaceWrite(db,state,revision,{sql:'1=1',values:[]}));
          if(result[0].meta.changes!==1)fail('Email admission changed; provider must retry',409);
          message.setReject('duplicate_message_id; original receipt retained');return;
        }
        const sample={id:receipt.id,address:address!.id,subject:parsed.subject,text:parsed.text,sender:parsed.sender,at};
        (state.emailSamples??=[]).push(sample);receipt.sample=sample.id;
        const version=state.emailRules?.filter(v=>v.address===address!.id).at(-1);
        if(!version)reason='email_mode_missing';
        else applyEmail(state,address!,version,sample,receipt);
      }
    }
    if(reason){receipt.outcome='quarantined';receipt.diagnostic=reason;}
    (state.emailReceipts??=[]).push(receipt);
    if(['quarantined','refused'].includes(receipt.outcome)) {
      (state.emailQuarantine??=[]).push({id:receipt.id,receipt:receipt.id,address:receipt.address,reason:receipt.diagnostic});
      auditOutcome(db,'refused');
    }
    if(state.emailReceipts.length>10000)fail('Email receipt capacity reached',429);
    const result=await db.batch(workspaceWrite(db,state,revision,{sql:'1=1',values:[]}));
    if(result[0].meta.changes!==1)fail('Email admission changed; provider must retry',409);
    if(['quarantined','refused'].includes(receipt.outcome))message.setReject(receipt.diagnostic);
  } catch {
    if(!context.storageFailed)await audit.record('failed');
    // Throwing keeps provider delivery failed, never an accepted-looking success.
    throw new Error('Email not committed; inspect installation storage and retry delivery');
  }
}
