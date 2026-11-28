import {createHash,createHmac,type Hash} from 'node:crypto';
import {openCredential,sourceCustody} from './changes/credentials';
import {runtimeBindings} from './auth.server';
import {presentedSourceKey,type NativeSource} from './native-sources';
export type NativeRequest={prefix:Uint8Array;raw:string;bytes:number;sha256:()=>string;validUtf8:boolean};
const bound=65536;
/** Authenticate the complete wire body while retaining only the native bound. */
export async function readNativeRequest(c:any,source?:NativeSource,attributedBearer=false):Promise<NativeRequest&{key:string}> {
 const signingKey=source?.signing_custody?await openCredential(source.signing_custody,runtimeBindings(c.env).SESSION_SECRET,sourceCustody):undefined;
 const signature=signingKey?createHmac('sha256',signingKey).update((c.req.header('x-oncall-timestamp')??'')+'.'):undefined;
 const chunks:Uint8Array[]=[];let bytes=0,retained=0,hash:Hash|undefined;
 const reader=c.req.raw.body?.getReader();
 if(reader)try{
  for(;;){
   const {done,value}=await reader.read();if(done)break;
   bytes+=value.length;
   // Oversized evidence needs a digest of even the discarded bytes. Otherwise
   // the retained bytes can be hashed only when the recipient needs evidence.
   if(bytes>bound&&!hash){
    hash=createHash('sha256');
    for(const chunk of chunks)hash.update(chunk);
   }
   hash?.update(value);signature?.update(value);
   if(retained<bound){const part=value.slice(0,bound-retained);chunks.push(part);retained+=part.length;}
  }
 }finally{reader.releaseLock();}
 const prefix=new Uint8Array(retained);let offset=0;for(const chunk of chunks){prefix.set(chunk,offset);offset+=chunk.length;}
 let validUtf8=true,raw='';try{raw=new TextDecoder('utf-8',{fatal:true}).decode(prefix);}catch{validUtf8=false;raw=new TextDecoder().decode(prefix);}
 const key=source?await presentedSourceKey(c,source,signature?.digest('hex')??'',signingKey,attributedBearer):'';
 const fullDigest=hash?.digest('hex');
 return {prefix,raw,bytes,sha256:()=>fullDigest??createHash('sha256').update(prefix).digest('hex'),validUtf8,key};
}
