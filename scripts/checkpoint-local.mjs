// Private local checkpoint file and transport operations. Never log credentials.
import {constants} from 'node:fs'
import {open,lstat,mkdir,rmdir,rename,unlink} from 'node:fs/promises'
import {dirname,basename,join} from 'node:path'
import {randomUUID} from 'node:crypto'

export function localOrigin(value) {
 let url
 try {url=new URL(value)} catch {throw Error('Explicit HTTP loopback --origin required')}
 if(url.protocol!=='http:'||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)
  throw Error('Origin must be HTTP loopback without credentials, path, query or fragment')
 return url.origin
}
function privateFile(info) {
 if(!info.isFile()||(info.mode&0o777)!==0o600||info.nlink!==1||(process.getuid&&info.uid!==process.getuid()))
  throw Error('Session file must be an owned, regular, unlinked mode-0600 file')
}
export function cookies(value,origin) {
 const input=value.trim(),port=new URL(origin).port
 const entries=input.includes('=')?input.split(';').map(v=>v.trim()):[`oncall_session=${input}`],seen=new Set()
 for(const entry of entries){
  const match=/^([A-Za-z0-9_]+)=([A-Za-z0-9_-]{16,200})$/.exec(entry)
  if(!match||!['oncall_session',`operator_session_local_${port||'80'}`].includes(match[1])||seen.has(match[1]))
   throw Error('Session file must contain local session cookies for this origin, or a held Oncall token')
  seen.add(match[1])
 }
 if(!entries.length)throw Error('Session file is empty')
 return entries.join('; ')
}
export async function privateSession(path,origin) {
 if(!path)throw Error('Explicit --session-file required')
 const lock=path+'.lock'
 try{await mkdir(lock,{mode:0o700})}catch{throw Error('Session file is locked or its directory is unavailable; no request was made')}
 let handle,temp,temporary,committed=false,saved=false
 try{
  privateFile(await lstat(path))
  handle=await open(path,constants.O_RDWR|constants.O_NOFOLLOW)
  const info=await handle.stat();privateFile(info)
  if(info.size>1024)throw Error('Session file is too large')
  const cookie=cookies(await handle.readFile('utf8'),origin)
  return {cookie,
   async reserve(){
    temporary=join(dirname(path),`.${basename(path)}.${randomUUID()}.pending`)
    temp=await open(temporary,constants.O_CREAT|constants.O_EXCL|constants.O_RDWR|constants.O_NOFOLLOW,0o600)
    // Verify local persistence before a server operation can rotate authority.
    await temp.writeFile(cookie+'\n');await temp.sync();await temp.truncate(0)
   },
   async rotate(response){
    const rotated=response.headers.getSetCookie().map(v=>v.split(';')[0]).filter(v=>v.startsWith('oncall_session='))
    if(rotated.length!==1)throw Error('Replacement succeeded but returned no unique rotated session; sign in again')
    committed=true
    const next=cookies([...cookie.split('; ').filter(v=>!v.startsWith('oncall_session=')),rotated[0]].join('; '),origin)
    const bytes=Buffer.from(next+'\n');await temp.write(bytes,0,bytes.length,0);await temp.truncate(bytes.length);await temp.sync()
    const current=await lstat(path);privateFile(current)
    if(current.dev!==info.dev||current.ino!==info.ino)throw Error('Session path changed during restore; rotated cookie retained privately in pending file')
    await rename(temporary,path);saved=true
    const directory=await open(dirname(path),constants.O_RDONLY)
    try{await directory.sync()}finally{await directory.close()}
   },
   async close(){
    await temp?.close();await handle.close()
    if(temporary&&(!committed||saved))await unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error})
    await rmdir(lock)
   }
  }
 }catch(error){await handle?.close();await rmdir(lock);throw error}
}
export async function jsonInput(path) {
 const file=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW)
 try{
  const info=await file.stat(),max=7*1024*1024
  if(!info.isFile()||info.size>max)throw Error('Checkpoint input must be a regular JSON file no larger than 7 MiB')
  const buffer=Buffer.alloc(max+1);let bytes=0
  while(bytes<buffer.length){const {bytesRead}=await file.read(buffer,bytes,buffer.length-bytes,null);if(!bytesRead)break;bytes+=bytesRead}
  if(bytes>max)throw Error('Checkpoint input exceeds 7 MiB')
  let value;try{value=JSON.parse(buffer.subarray(0,bytes).toString('utf8'))}catch{throw Error('Invalid checkpoint JSON')}
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Checkpoint input must be a JSON object')
  return value
 }finally{await file.close()}
}
export async function request(origin,cookie,path,body) {
 let response
 try{response=await fetch(origin+path,{method:body===undefined?'GET':'POST',redirect:'error',headers:{origin,cookie,accept:'application/json',...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(30000)})}
 catch{throw Error('Local request failed; outcome is unconfirmed. Inspect the installation before another restore')}
 if(!response.ok)throw Error(`HTTP ${response.status}: checkpoint request refused; session file unchanged`)
 return response
}
export async function newExport(path,read) {
 const file=await open(path,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY|constants.O_NOFOLLOW,0o600)
 let complete=false
 try{const value=await read();await file.writeFile(JSON.stringify(value)+'\n');await file.sync();complete=true}
 finally{await file.close();if(!complete)await unlink(path)}
}
