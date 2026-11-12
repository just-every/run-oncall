import {readFile,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'

const credential=/^(?:password|passwd|secret|token|credentials?|authorization|cookie)$|(?:api|access|auth|integration|routing|service|signing|private|client|refresh|session)[_-]?(?:key|secret|token)$|^webhook[_-]?(?:url|secret)$/i
/** A Splunk URL routing label is distinct from the endpoint credential. Give it
 * an unambiguous field name before the shared import kit inspects the file.
 * Every other property, including unsupported conditions, is preserved. */
export function prepareSplunkRouting(value) {
 let labels=0
 const walk=(item,path=[])=>{
  if(Array.isArray(item))return item.map((child,index)=>walk(child,[...path,String(index)]))
  if(!item||typeof item!=='object')return item
  const result={}
  for(const [key,child] of Object.entries(item)) {
   const route=key==='routingKey'&&/^integrations(?:\.integrations)?\.\d+\.routingKeys\.\d+$/.test(path.join('.'))
   if(route) {
    if(typeof child!=='string'||!child||child.length>200||Object.hasOwn(item,'routingLabel'))throw Error('Routing labels need 1–200 characters and must not already have a routingLabel field')
    result.routingLabel=child;labels++
   } else {
    if(credential.test(key))throw Error('Remove the endpoint credential and all other credential fields before preparing the saved file')
    Object.defineProperty(result,key,{value:walk(child,[...path,key]),enumerable:true,configurable:true,writable:true})
   }
  }
  return result
 }
 const prepared=walk(value)
 if(!labels)throw Error('No non-secret Splunk URL routing labels found in the integrations collection')
 return prepared
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
 try {
  if(process.argv.length!==4)throw Error('Usage: node scripts/prepare-routed-splunk.mjs INPUT.json OUTPUT.json')
  const prepared=prepareSplunkRouting(JSON.parse(await readFile(process.argv[2],'utf8')))
  await writeFile(process.argv[3],JSON.stringify(prepared,null,2)+'\n',{flag:'wx',mode:0o600})
  console.log('Prepared credential-free routing labels; unsupported settings are unchanged. Review the new file before importing.')
 } catch(error){console.error(error instanceof SyntaxError?'The saved response is not valid JSON; use a complete export.':error.message);process.exitCode=1}
}
