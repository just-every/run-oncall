import { requireNewSubjectIdentity } from '../subject-erasure-identity.ts'
import { syncErasureFences } from '../erasure-fence'
import { authority, fail, text, type State } from '../family/response-operations/domain.ts';
import { workspaceWrite } from '../workspace-store.ts';
import { auditIdentity, auditKind } from '../audit-store.ts';
import { changeHash } from '../changes/credentials.ts';
import { refuseKeyEcho } from '../native-sources.ts';
import { createPortability } from '../modules/portability/index.mjs';
import { portabilityPolicy } from '../portability-policy.mjs';
import { emailDraft, decideEmail } from './rules.ts';
import { inboundDomain } from './receive.ts';
import type { EmailAddress, EmailVersion } from './types.ts';
import { editEmailField } from './edit';
type Deps={body:(c:any)=>Promise<any>;state:(c:any,admin?:boolean)=>Promise<State>;guard:(c:any)=>{sql:string;values:(string|number|null)[]}};
export function installEmailManagement(api:any,deps:Deps) {
  const current=async(c:any)=>{const state=await deps.state(c,true);authority(state,c.get('actor'),true);return state;};
  api.get('/api/email',async(c:any)=>{const state=await current(c);return c.json({domain:inboundDomain(c.env),addresses:state.emailAddresses??[],versions:state.emailRules??[],samples:state.emailSamples??[],receipts:state.emailReceipts??[],quarantine:state.emailQuarantine??[]});});
  async function commit(c:any,state:State,extra:(token:string)=>D1PreparedStatement[]=()=>[]) {
    const token=crypto.randomUUID(),result=await c.env.DB.batch([...workspaceWrite(c.env.DB,state,state.revision,deps.guard(c),token),...extra(token)]);
    if(result[0].meta.changes!==1)fail('Workspace or authority changed; reload',409);
  }
  api.post('/api/email/addresses',async(c:any)=>{
    const state=await current(c),input=await deps.body(c),domain=inboundDomain(c.env);
    if(!domain)fail('Inbound email is off: configure INBOUND_EMAIL_DOMAIN first');
    const id=text(input.id,'Address ID',80);if(!/^[a-zA-Z0-9_-]+$/.test(id)||state.emailAddresses?.some(a=>a.id===id))fail('Choose a new address ID');
    await requireNewSubjectIdentity(state,'email',id)
    const service=state.services.find(s=>s.id===input.service);if(!service)fail('Choose a mapped service and environment');
    const owner=state.members.find(m=>m.id===input.owner&&m.active&&m.role==='admin');if(!owner)fail('Choose an active integration administrator');
    const draft=emailDraft(input),at=new Date().toISOString();
    const address:EmailAddress={id,name:text(input.name,'Address name',100),service:service.id,environment:service.environment,owner:owner.id,active:true,revision:1,at};
    const local=text(input.localPart,'Private local part',64).toLowerCase();
    if(!/^[a-z0-9][a-z0-9-]{31,63}$/.test(local))fail('Use an installation-generated random local part of 32–64 letters, digits or hyphens');
    refuseKeyEcho([JSON.stringify(address),JSON.stringify(draft)],local);
    const digest=await changeHash(local+'@'+domain);
    if(await c.env.DB.prepare('SELECT 1 FROM oc_email_credentials WHERE digest=?').bind(digest).first())fail('Choose a fresh address local part');
    (state.emailAddresses??=[]).push(address);
    (state.emailRules??=[]).push({...draft,id:crypto.randomUUID(),address:id,version:1,by:c.get('actor').id,at});
    auditKind(c.env.DB,'email.create');auditIdentity(c.env.DB,{source:{kind:'email-address',id},subject:{kind:'email-address',id}});
    await commit(c,state,token=>[c.env.DB.prepare('INSERT INTO oc_email_credentials(digest,address,active) SELECT ?,?,1 WHERE EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)').bind(digest,id,token)]);
    return c.json(address,201);
  });
  api.post('/api/email/addresses/:id/:action',async(c:any)=>{
    const state=await current(c),input=await deps.body(c),address=state.emailAddresses?.find(a=>a.id===c.req.param('id')),action=c.req.param('action');
    if(!address)fail('Unknown email address',404);
    auditIdentity(c.env.DB,{source:{kind:'email-address',id:address.id},subject:{kind:'email-address',id:address.id}});
    if(input.revision!==address.revision)fail('Address changed; reload',409);
    if(action==='field') {
      if(!editEmailField(state,address,input))return c.json({...address,changed:false,message:'Nothing to change'});
      auditKind(c.env.DB,'email.'+input.field);await commit(c,state);return c.json(address);
    }
    if(action==='preview') {
      const draft=emailDraft(input),last=state.emailRules?.filter(v=>v.address===address.id).at(-1)!;
      if(!Array.isArray(input.samples)||input.samples.length>100||input.samples.some((id:unknown)=>!state.emailSamples?.some(s=>s.id===id&&s.address===address.id)))fail('Choose up to 100 saved mails on this address');
      const version:EmailVersion={...last,...draft,version:last.version+1};
      return c.json({sideEffects:false,decisions:input.samples.map((id:string)=>{const sample=state.emailSamples!.find(s=>s.id===id)!;return {sample:id,historical:state.emailReceipts?.find(r=>r.sample===id)?.decision,proposed:decideEmail(version,sample,id)};})});
    }
    auditKind(c.env.DB,'email.'+({publish:'publish',rotate:'rotate',revoke:'revoke',erase:'erase'}[action as string]??'request'));
    if(action==='publish') {
      const draft=emailDraft(input),previous=state.emailRules?.filter(v=>v.address===address.id).at(-1)!;
      if(input.baseVersion!==undefined&&input.baseVersion!==previous.version)fail('Email rules changed; review the newer version before publishing',409);
      if(JSON.stringify(draft)===JSON.stringify({mode:previous.mode,fallback:previous.fallback,rules:previous.rules}))return c.json({...address,changed:false,message:'Nothing to change'});
      (state.emailRules??=[]).push({...draft,id:crypto.randomUUID(),address:address.id,version:previous.version+1,by:c.get('actor').id,at:new Date().toISOString()});
      address.revision++;await commit(c,state);return c.json(address);
    }
    if(action==='erase') {
      // OC-052: saved source mail is erasable; operational generation receipts remain.
      // The portability epoch fences every old native archive, including deleted samples.
      const portability=await createPortability({db:c.env.DB,policy:portabilityPolicy});
      const fence=await portability.redactionStatements(),transfers=await portability.invalidateTransfersStatements();
      const erased=(state.emailSamples??[]).filter(s=>s.address===address.id).map(s=>s.id);
      state.emailSamples=(state.emailSamples??[]).filter(s=>s.address!==address.id);
      state.emailQuarantine=(state.emailQuarantine??[]).filter(q=>q.address!==address.id);
      for(const r of state.emailReceipts??[])if(r.address===address.id)r.sample=null;
      address.active=false;address.revision++;
      await commit(c,state,token=>[...fence,c.env.DB.prepare(syncErasureFences),...transfers,...erased.map(id=>c.env.DB.prepare('INSERT OR IGNORE INTO oc_email_erased_samples(id) SELECT ? WHERE EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)').bind(id,token)),c.env.DB.prepare('UPDATE oc_email_credentials SET active=0 WHERE address=? AND EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)').bind(address.id,token)]);
      return c.json({erased:'saved mail and quarantine',receipts:'retained operational history',address});
    }
    if(!['rotate','revoke'].includes(action))fail('Unknown address action',404);
    const local=action==='rotate'?text(input.localPart,'Private local part',64).toLowerCase():null,domain=inboundDomain(c.env);
    if(local&&(!domain||!/^[a-z0-9][a-z0-9-]{31,63}$/.test(local)))fail('Configure a domain and a fresh 32–64 character random local part');
    const digest=local?await changeHash(local+'@'+domain):null;
    if(digest&&await c.env.DB.prepare('SELECT 1 FROM oc_email_credentials WHERE digest=?').bind(digest).first())fail('Choose a fresh address');
    if(local)refuseKeyEcho([JSON.stringify(state)],local);
    address.active=action==='rotate';address.revision++;
    await commit(c,state,token=>[c.env.DB.prepare('UPDATE oc_email_credentials SET active=0 WHERE address=? AND EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)').bind(address.id,token),...(digest?[c.env.DB.prepare('INSERT INTO oc_email_credentials(digest,address,active) SELECT ?,?,1 WHERE EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)').bind(digest,address.id,token)]:[])]);
    return c.json(address);
  });
}
