import { X509Certificate, createVerify } from 'node:crypto';
import { fail, Fault, type State } from '../family/response-operations/domain';
import { intakeCredential, credentialGuard, type IntakeDependencies } from '../monitoring/credentials';
import { beginRate, saveRate, admittedCount } from '../intake-rate/admission';
import { rateFaultBody } from '../intake-rate/fault';
import { receiveCompatible } from './lifecycle';
import { intakeHash } from './credentials';
import type { IntakeSource } from './model';
import type { CompatibleInput } from './provider-types';

import {regions,record,field,type SnsConfiguration} from './sns-config';
function trustedUrl(value:unknown,config:SnsConfiguration,certificate:boolean):URL {
  const raw=field(value,certificate?'SigningCertURL':'SubscribeURL',4096),host=`sns.${config.region}.${config.region.startsWith('cn-')?'amazonaws.com.cn':'amazonaws.com'}`;
  let url:URL;try{url=new URL(raw);}catch{fail('Invalid SNS provider URL');}
  // Match the wire authority too: URL normalizes an explicit :443 away.
  if(!raw.startsWith('https://'+host+'/')||url.protocol!=='https:'||url.hostname!==host||url.username||url.password||url.port||url.hash)fail('SNS URL must use its trusted regional HTTPS endpoint');
  if(certificate&&(!/^\/SimpleNotificationService-[A-Za-z0-9_-]+\.pem$/.test(url.pathname)||url.search))fail('Invalid SNS signing certificate path');
  return url;
}
/** The sole SNS outbound helper: fixed trusted origin, no redirects, 5 seconds,
 * and a streaming 64 KiB cap, including bodies whose length is not advertised. */
async function boundedFetch(url:URL):Promise<string> {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
  let reader:ReadableStreamDefaultReader<Uint8Array>|undefined;
  try {
    const response=await fetch(url,{redirect:'manual',signal:controller.signal});
    if(response.status!==200)fail('SNS provider fetch failed',502);
    if(Number(response.headers.get('content-length'))>65536)fail('SNS provider response too large',502);
    reader=response.body?.getReader();let size=0;const chunks:Uint8Array[]=[];
    if(reader)for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536)fail('SNS provider response too large',502);chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  } catch(error) {if(error instanceof Fault)throw error;return fail('SNS provider fetch unavailable',502);}
  finally {controller.abort();await reader?.cancel().catch(()=>{});clearTimeout(timer);}
}
function canonical(message:Record<string,unknown>):string {
  const names=message.Type==='Notification'?['Message','MessageId',...(message.Subject!==undefined?['Subject']:[]),'Timestamp','TopicArn','Type']:['Message','MessageId','SubscribeURL','Timestamp','Token','TopicArn','Type'];
  return names.map(name=>name+'\n'+field(message[name],name,name==='Message'?2*1024*1024:4096)+'\n').join('');
}
function instant(value:unknown,name:string):string {
  const raw=field(value,name,100);
  if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?(?:Z|[+-]\d\d:\d\d)$/.test(raw)||!Number.isFinite(Date.parse(raw)))fail(`Invalid SNS ${name}`);
  return new Date(raw).toISOString();
}
async function verify(message:Record<string,unknown>,config:SnsConfiguration) {
  if(!['SubscriptionConfirmation','Notification','UnsubscribeConfirmation'].includes(String(message.Type)))fail('Unsupported SNS message type');
  if(message.TopicArn!==config.topic)fail('Foreign SNS topic or account',403);
  field(message.MessageId,'MessageId',200);
  const timestamp=Date.parse(instant(message.Timestamp,'Timestamp'));
  if(timestamp<Date.now()-86400000||timestamp>Date.now()+300000)fail('SNS timestamp outside the 24 hour replay window',403);
  const certUrl=trustedUrl(message.SigningCertURL,config,true);
  let subscribe:URL|undefined;
  if(message.Type==='SubscriptionConfirmation') {
    subscribe=trustedUrl(message.SubscribeURL,config,false);
    if(subscribe.pathname!=='/'||subscribe.searchParams.get('Action')!=='ConfirmSubscription'||subscribe.searchParams.get('TopicArn')!==config.topic||subscribe.searchParams.get('Token')!==message.Token||[...subscribe.searchParams.keys()].some(k=>!['Action','TopicArn','Token'].includes(k))||[...new Set(subscribe.searchParams.keys())].some(k=>subscribe!.searchParams.getAll(k).length!==1))fail('SNS confirmation URL does not match its signed topic and token');
  }
  if(message.SignatureVersion!=='1'&&message.SignatureVersion!=='2')fail('Unsupported SNS signature version',403);
  const signature=field(message.Signature,'Signature',4096);
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(signature))fail('Invalid SNS signature',403);
  const signed=canonical(message),pem=await boundedFetch(certUrl);
  try {
    const certificate=new X509Certificate(pem),now=Date.now();
    if(Date.parse(certificate.validFrom)>now||Date.parse(certificate.validTo)<now||certificate.publicKey.asymmetricKeyType!=='rsa')fail('Invalid SNS signing certificate',403);
    if(!createVerify(message.SignatureVersion==='1'?'RSA-SHA1':'RSA-SHA256').update(signed).verify(certificate.publicKey,signature,'base64'))fail('Forged SNS signature',403);
  } catch(error) {if(error instanceof Fault)throw error;fail('Invalid SNS signing certificate or signature',403);}
  return {subscribe,fingerprint:await intakeHash(signed)};
}
async function readMessage(request:Request):Promise<Record<string,unknown>> {
  const reader=request.body?.getReader();let size=0;const chunks:Uint8Array[]=[];
  try {if(reader)for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2*1024*1024)fail('SNS request exceeds 2 MiB',413);chunks.push(value);}}
  finally {await reader?.cancel().catch(()=>{});}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  let value:unknown;try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail('Invalid SNS JSON');}
  if(!record(value))fail('SNS message must be an object');return value;
}
async function alarmInput(message:Record<string,unknown>,source:IntakeSource,state:State):Promise<CompatibleInput> {
  let alarm:unknown;try{alarm=JSON.parse(String(message.Message));}catch{fail('Invalid CloudWatch alarm JSON');}
  if(!record(alarm))fail('CloudWatch alarm must be an object');
  const config=source.sns!,name=field(alarm.AlarmName,'AlarmName',255),account=field(alarm.AWSAccountId,'AWSAccountId',12),region=field(alarm.Region,'Region',100);
  if(account!==config.account)fail('Foreign CloudWatch account',403);
  // CloudWatch sends a display region (e.g. US East (N. Virginia)). Its signed
  // AlarmArn, when present, independently binds the machine-readable region.
  const displayRegions:Record<string,string>={'us-east-1':'US East (N. Virginia)','us-east-2':'US East (Ohio)','us-west-1':'US West (N. California)','us-west-2':'US West (Oregon)','us-gov-east-1':'AWS GovCloud (US-East)','us-gov-west-1':'AWS GovCloud (US-West)','cn-north-1':'China (Beijing)','cn-northwest-1':'China (Ningxia)'};
  if(region!==config.region&&region!==displayRegions[config.region])fail('Foreign CloudWatch region',403);
  const arn=`arn:${regions[config.region]}:cloudwatch:${config.region}:${account}:alarm:${name}`;
  if(alarm.AlarmArn!==undefined&&alarm.AlarmArn!==arn)fail('Foreign CloudWatch alarm ARN',403);
  if(!['ALARM','OK','INSUFFICIENT_DATA'].includes(String(alarm.NewStateValue)))fail('Unsupported CloudWatch state');
  const observedAt=instant(alarm.StateChangeTime,'StateChangeTime');
  if(Date.parse(observedAt)>Date.parse(String(message.Timestamp))+300000)fail('CloudWatch state time exceeds signed notification time');
  const trigger=alarm.Trigger;
  if(!record(trigger)||!Array.isArray(trigger.Dimensions)||trigger.Dimensions.length>30)fail('CloudWatch Trigger dimensions are required and bounded to 30');
  const dimensions=trigger.Dimensions.map(d=>{if(!record(d))fail('Invalid CloudWatch dimension');return {name:field(d.name,'dimension name',255),value:field(d.value,'dimension value',1024)};});
  const description=alarm.AlarmDescription==null||alarm.AlarmDescription===''?'':field(alarm.AlarmDescription,'AlarmDescription',1024),reason=field(alarm.NewStateReason,'NewStateReason',4096);
  const key='sns:'+await intakeHash(JSON.stringify([account,config.region,name]));
  const previous=(state.intakeReceipts??[]).filter(r=>r.source===source.id&&r.key===key&&r.observedAt).sort((a,b)=>Date.parse(b.observedAt!)-Date.parse(a.observedAt!))[0];
  const reordered=!!previous&&Date.parse(previous.observedAt!)>=Date.parse(observedAt);
  const details={AlarmName:name,AlarmArn:arn,AlarmDescription:description,NewStateValue:alarm.NewStateValue,NewStateReason:reason,StateChangeTime:observedAt,Region:region,region:config.region,AWSAccountId:account,Trigger:{Dimensions:dimensions},reordered};
  if(new TextEncoder().encode(JSON.stringify(details)).length>8192)fail('CloudWatch retained alarm context exceeds 8 KiB');
  return {action:reordered||alarm.NewStateValue==='INSUFFICIENT_DATA'?'note':alarm.NewStateValue==='OK'?'recover':'trigger',key,title:name.slice(0,300),severity:alarm.NewStateValue==='ALARM'?'critical':'info',priority:null,observedAt,sender:'sns:'+config.region,links:[],details,truncated:false};
}
export function installSnsIntake(api:any,deps:IntakeDependencies) {
  api.post('/api/sns/:source/:key',async(c:any)=>{
    try {
      const {state,source,digest}=await intakeCredential(c,deps,c.req.param('key'),'sns',c.req.param('source'));
      if(!source.sns||!source.routing)fail('SNS integration not configured',403);
      const message=await readMessage(c.req.raw),verified=await verify(message,source.sns);
      const previous=state.intakeReceipts?.find(r=>r.source===source.id&&r.sns?.messageId===message.MessageId);
      if(previous) {if(previous.sns!.fingerprint!==verified.fingerprint)fail('SNS MessageId content changed',409);return c.json({duplicate:true,id:previous.id},200);}
      const rate=await beginRate(c,deps,state,{id:'intake:'+source.id,name:source.name,owner:source.routing.owner},credentialGuard(source,digest)),before=structuredClone(state);
      const notification=message.Type==='Notification',input=notification?await alarmInput(message,source,state):{action:'note' as const,key:'sns:subscription',title:String(message.Type),severity:'info' as const,priority:null,observedAt:instant(message.Timestamp,'Timestamp'),sender:'sns:'+source.sns.region,links:[],details:{type:message.Type,topic:source.sns.topic},truncated:false};
      if(JSON.stringify(input).includes(c.req.param('key')))fail('Keep the integration credential out of alarm content');
      // Foreign/forged/unsafe messages have performed no mutation or confirmation.
      if(verified.subscribe) {
        const current=await intakeCredential(c,deps,c.req.param('key'),'sns',source.id);
        if(current.state.revision!==state.revision)fail('Admission changed; retry the request',409);
        await boundedFetch(verified.subscribe);
        source.sns.status='confirmed';
      } else if(message.Type==='UnsubscribeConfirmation')source.sns.status='unsubscribed';
      if(notification)source.sns.lastNotification=new Date().toISOString();
      const receipt=receiveCompatible(state,source,'sns',input);
      receipt.sns={messageId:String(message.MessageId),fingerprint:verified.fingerprint,type:String(message.Type)};
      state.audit.push({id:crypto.randomUUID(),at:new Date().toISOString(),actor:'source:intake:'+source.id,kind:'sns-intake',text:`SNS ${message.Type}; integration owner ${source.routing.owner}; status ${source.sns.status}; paging OFF`});
      await saveRate(c,deps,state,state.revision,rate,admittedCount(before,state));
      return c.json({duplicate:false,id:receipt.id,status:source.sns.status},202);
    } catch(error) {if(!(error instanceof Fault))throw error;return c.json({error:error.message,...rateFaultBody(error)},error.status===409?503:error.status);}
  });
}
