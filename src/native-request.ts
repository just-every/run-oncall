import {createHash,createHmac} from 'node:crypto';
import {openCredential,sourceCustody} from './changes/credentials';
import {runtimeBindings} from './auth.server';
import {presentedSourceKey,type NativeSource} from './native-sources';
export type NativeRequest={prefix:Uint8Array;raw:string;bytes:number;sha256:string;validUtf8:boolean};
/** Hash/authenticate the complete wire body while retaining only the native bound. */
export async function readNativeRequest(c:any,source?:NativeSource):Promise<NativeRequest&{key:string}> {
 const signingKey=source?.signing_custody?await openCredential(source.signing_custody,runtimeBindings(c.env).SESSION_SECRET,sourceCustody):undefined;
 const signature=signingKey?createHmac('sha256',signingKey).update((c.req.header('x-oncall-timestamp')??'')+'.'):undefined;
 const hash=createHash('sha256'),chunks:Uint8Array[]=[];let bytes=0,retained=0;
 const reader=c.req.raw.body?.getReader();
 if(reader)try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;hash.update(value);signature?.update(value);if(retained<65536){const part=value.slice(0,65536-retained);chunks.push(part);retained+=part.length;}}}finally{reader.releaseLock();}
 const prefix=new Uint8Array(retained);let offset=0;for(const chunk of chunks){prefix.set(chunk,offset);offset+=chunk.length;}
 let validUtf8=true,raw='';try{raw=new TextDecoder('utf-8',{fatal:true}).decode(prefix);}catch{validUtf8=false;raw=new TextDecoder().decode(prefix);}
 const key=source?await presentedSourceKey(c,source,{signature:signature?.digest('hex')??''}):'';
 return {prefix,raw,bytes,sha256:hash.digest('hex'),validUtf8,key};
}
