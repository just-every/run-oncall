import { normalizeInbound } from '../modules/mail/src/inbound/index.mjs';
import { readStream } from '../modules/mail/src/inbound/bytes.mjs';
import { entity, multipart } from '../modules/mail/src/inbound/multipart.mjs';
import { address, parameterized } from '../modules/mail/src/inbound/headers.mjs';
export const emailLimits={maxRawBytes:512*1024,maxBodyBytes:512*1024,maxAttachments:20,maxAttachmentBytes:64*1024,maxTotalAttachmentBytes:128*1024};
const reject=code=>{throw Object.assign(new Error(code),{code});};
export async function parseEmail(message,secret) {
  if(!Number.isSafeInteger(message.rawSize)||message.rawSize<0||message.rawSize>emailLimits.maxRawBytes)reject('inbound_raw_limit');
  const bytes=await readStream(message.raw,emailLimits.maxRawBytes);
  let parts=0;
  function walk(part,depth=0) {
    if(++parts>100)reject('inbound_part_limit');if(depth>12)reject('inbound_mime_depth');
    const type=parameterized(part.headers.get('content-type')??'text/plain');
    if(type.type.startsWith('multipart/'))for(const child of multipart(part.body,type.params.get('boundary')))walk(entity(child),depth+1);
  }
  const root=entity(bytes);walk(root);
  // Only Cloudflare's first Authentication-Results result is considered. Sender-supplied
  // copies appended below it cannot turn a failed/missing provider result into a pass.
  const authentication=(message.headers.get('authentication-results')??'').split(/,\s*(?=[\w.-]+;)/)[0];
  const from=address(root.headers.get('from')??'');
  const domain=from.split('@')[1].toLowerCase();
  const dmarc=/;\s*dmarc=pass\b[^;]*\bheader\.from=([^\s;,)]+)/i.exec(authentication);
  if(!/^mx\.cloudflare\.net\s*;/i.test(authentication)||!dmarc||dmarc[1].toLowerCase()!==domain)reject('sender_authentication_failed');
  const result=await normalizeInbound({provider:'cloudflare',message:{...message,headers:message.headers,raw:new ReadableStream({start(c){c.enqueue(bytes);c.close();}}),rawSize:message.rawSize,from:message.from,to:message.to}},emailLimits);
  // Keep only text/plain. HTML is never rendered or converted; attachments die here.
  const text=new TextDecoder().decode(new TextEncoder().encode(result.text??'').slice(0,256*1024),{stream:true});
  if([result.subject,text,from].some(v=>v.toLowerCase().includes(secret.toLowerCase())))reject('address_key_in_content');
  if(result.subject.length>1000)reject('subject_limit');
  return {subject:result.subject,text,sender:from,messageId:result.messageId};
}
export function emailDiagnostic(error) {
  const code=error?.code;
  return typeof code==='string'&&/^(?:invalid_inbound|duplicate_inbound|inbound_|sender_authentication_failed|address_key_in_content|subject_limit)[a-z_]*$/.test(code)?code:'malformed_mime';
}
