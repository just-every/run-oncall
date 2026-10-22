import {countRows} from './workspace-accounting.ts';
import {Buffer} from 'node:buffer';
import type {NativeRequest} from './native-request';
import { fail, Fault, signalInput, type State } from './family/response-operations/domain';
import { intakeHash } from './intake/credentials';
import type { IntakeSource } from './intake/model';
import { retainIncomplete } from './monitoring/incomplete';
import { refuseKeyEcho, type NativeSource } from './native-sources';

const maximum = 65536;

/** Oversized native prefixes are evidence only, never structured routing input. */
export function parseNativeRequest(body:NativeRequest): {input:any; signal:ReturnType<typeof signalInput>} | undefined {
  if(body.bytes>maximum||!body.validUtf8)return;
  const raw=body.raw;
  let input:any;
  try {input=JSON.parse(raw);} catch {return;}
  try {return {input,signal:signalInput(input)};}
  catch(error) {if(error instanceof Fault&&error.status===400)return;throw error;}
}

function refuseRetainedCredential(raw:string,key:string) {
  // Check both wire spelling and JSON escape spellings without parsing a prefix.
  const unescaped=raw.replace(/\\u([a-f0-9]{4})/gi,(_,code)=>String.fromCharCode(parseInt(code,16))).replace(/\\(["\\/])/g,'$1');
  const candidates=[raw,unescaped],variants=new Set([key,JSON.stringify(key).slice(1,-1),encodeURI(key)]);
  let decoded=unescaped;
  for(let depth=0;depth<3;depth++) {
    decoded=decoded.replace(/(?:%[a-f0-9]{2})+/gi,part=>{
      try {return decodeURIComponent(part);} catch {return part.replace(/%([0-7][a-f0-9])/gi,(_,code)=>String.fromCharCode(parseInt(code,16)));}
    });
    candidates.push(decoded);
  }
  let encoded=key;
  for(let depth=0;depth<3;depth++){encoded=encodeURIComponent(encoded);variants.add(encoded);}
  for(const variant of variants)refuseKeyEcho(candidates,variant);
}

/** Ordinary credentials have no workspace source; retain their custody using the
 * existing integration collections, without minting another credential. Scope
 * changes create another immutable snapshot so old receipts stay valid. */
export async function nativeIncompleteIdentity(identity:string,credential:NativeSource):Promise<string> {
  const scope=[...new Set<string>(JSON.parse(credential.scopes))].sort();
  return 'native:'+await intakeHash(JSON.stringify({identity,scope}));
}
export async function nativeIncompleteSource(state:State,identity:string,credential:NativeSource):Promise<IntakeSource> {
  const scope=[...new Set<string>(JSON.parse(credential.scopes))].sort();
  if(!scope.length||scope.some(id=>!state.services.some(service=>service.id===id)))fail('Native source scope is unavailable',503);
  const id=await nativeIncompleteIdentity(identity,credential);
  const previous=state.intakeSources?.find(source=>source.id===id);
  if(previous) {
    const version=previous.routing?.versions.at(-1);
    if(!version||previous.provider!=='native'||JSON.stringify(previous.routing?.scope)!==JSON.stringify(scope)||version?.catchAll!==(scope.length===1?scope[0]:null)||version.rules.length)
      fail('Held native incomplete custody does not match this credential scope',409);
    return previous;
  }
  if(countRows(state,'intakeSources')>=10000)fail('Local intake source capacity reached; export before extending capacity',429);
  const owner=state.members.find(member=>member.active&&member.role==='admin'&&!member.machine);
  if(!owner)fail('Native incomplete intake needs an active installation administrator',503);
  const at=new Date().toISOString();
  const source:IntakeSource={id,name:'Native incomplete: '+identity,provider:'native',service:scope[0],active:false,revision:1,createdBy:owner.id,updatedAt:at,authentication:credential.signing_custody===null?'bearer':'signed',routing:{scope,owner:owner.id,versions:[{version:1,rules:[],catchAll:scope.length===1?scope[0]:null,publishedBy:owner.id,publishedAt:at}]}};
  (state.intakeSources??=[]).push(source);
  return source;
}

export async function retainNativeIncomplete(state:State,source:IntakeSource,body:NativeRequest,key:string) {
  refuseRetainedCredential(body.raw,key);
  const oversized=body.bytes>maximum;
  const result=retainIncomplete(state,source,'native',{bytes:body.bytes,sha256:body.sha256,readableIds:[],dropped:null,unreadBytes:body.bytes,diagnostics:[oversized?'Native request exceeded 65536 bytes; retained prefix was not parsed':'Native request was unparseable or incomplete; retained prefix was not treated as an event']});
  if(!result.duplicate)result.receipt.details.nativePrefix={encoding:'base64',value:Buffer.from(body.prefix).toString('base64')};
  return result;
}
