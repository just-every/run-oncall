import { createHash } from 'node:crypto';
import { readableJSON } from './partial-json.ts';

export type IntakeRequest = {payload:unknown;bytes:number;sha256:string;unreadBytes:number;incomplete:boolean;diagnostics:string[]};
/** Drain and hash the complete transport, retaining only the provider's prefix. */
export async function readIntakeRequest(request:Request,maximum:number):Promise<IntakeRequest> {
  const digest=createHash('sha256'),chunks:Uint8Array[]=[];
  let bytes=0,retained=0,interrupted=false;
  const reader=request.body?.getReader();
  if(reader)try {
    for(;;) {
      const {done,value}=await reader.read();if(done)break;
      bytes+=value.byteLength;digest.update(value);
      if(retained<maximum) {const part=value.slice(0,maximum-retained);chunks.push(part);retained+=part.byteLength;}
    }
  } catch {interrupted=true;} finally {reader.releaseLock();}
  const prefix=new Uint8Array(retained);let offset=0;
  for(const chunk of chunks){prefix.set(chunk,offset);offset+=chunk.byteLength;}
  const parsed=readableJSON(new TextDecoder().decode(prefix));
  const diagnostics=[...(bytes>maximum?[`Request exceeds ${maximum} byte provider bound`]:[]),...(interrupted?['Request transport interrupted']:[]),...parsed.diagnostics];
  return {payload:parsed.payload,bytes,sha256:digest.digest('hex'),unreadBytes:bytes-retained+new TextEncoder().encode(new TextDecoder().decode(prefix).slice(parsed.readTo)).length,incomplete:bytes>maximum||interrupted||!parsed.complete,diagnostics};
}
