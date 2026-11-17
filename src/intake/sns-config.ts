import {fail} from '../family/response-operations/domain.ts';
export type SnsConfiguration = {account:string;region:string;topic:string;status:'awaiting confirmation'|'confirmed'|'unsubscribed';lastNotification?:string;failure?:string};
export type SnsReceipt = {messageId:string;fingerprint:string;type:string};
export const regions:Record<string,string> = {'us-east-1':'aws','us-east-2':'aws','us-west-1':'aws','us-west-2':'aws','us-gov-east-1':'aws-us-gov','us-gov-west-1':'aws-us-gov','cn-north-1':'aws-cn','cn-northwest-1':'aws-cn'};
export const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function field(v:unknown,name:string,max=2048):string {
  if(typeof v!=='string'||!v.trim()||v.length>max||(name==='Message'||name==='AlarmDescription'||name==='NewStateReason'?/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/:/[\x00-\x1f\x7f]/).test(v))fail(`Invalid SNS ${name}`);
  return v;
}
export function snsConfiguration(value:unknown):SnsConfiguration {
  if(!record(value))fail('AWS account, region and topic ARN are required');
  const account=field(value.account,'account',12),region=field(value.region,'region',30),topic=field(value.topic,'topic',256);
  if(!/^\d{12}$/.test(account)||!regions[region]||!new RegExp('^arn:'+regions[region]+':sns:'+region+':'+account+':[A-Za-z0-9_-]{1,256}(?:\\.fifo)?$').test(topic))fail('Choose an allowed AWS region and a topic ARN matching its account and partition');
  return {account,region,topic,status:'awaiting confirmation'};
}
