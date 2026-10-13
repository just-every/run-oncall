#!/usr/bin/env node
import {localOrigin,privateSession,jsonInput,request,newExport} from './checkpoint-local.mjs'

const help=`Private local paired recovery checkpoint; paging remains OFF.
Usage: node scripts/checkpoint.mjs --origin URL --session-file FILE COMMAND

  export NEW_FILE [--version 1|2]   Capture one consistent checkpoint (default v2)
  restore FILE --replace           Explicitly replace coordination and scheduling
                                   (v2 also restores reviewed handoffs)
  --admin-mapping MEMBER_ID        Restore-only; explicit empty-target mapping
  --help                          No authentication or network

Origin must be HTTP loopback, without credentials/path/query/fragment. Redirects
are refused. Session file must be owned, regular, mode 0600, with no hard links.
It contains a held oncall_session cookie/token or the installation's local Base
session cookie; both cookies are retained after Base-backed restores. Never put
credentials in arguments, environment variables or shell history.
Exports use new mode-0600 files; existing files are refused. Restore serializes
access to the session file, keeps it unchanged on server refusal, and replaces
it privately with the successful rotated session. See docs/checkpoints.md for
recovery after interrupted transport or local file failure. Server validation,
current-admin checks, atomic replacement and mapping rules are authoritative.
No login, provider, account, delivery or paging action is performed.
`
function options(args){
 const result={positional:[],version:'2',replace:false}
 for(let i=0;i<args.length;i++){
  const key=args[i]
  if(key==='--help'||key==='-h')return {help:true}
  if(key==='--replace'){if(result.replace)throw Error('Duplicate --replace');result.replace=true;continue}
  if(['--origin','--session-file','--version','--admin-mapping'].includes(key)){
   if(result[key]!==undefined||!args[i+1]||args[i+1].startsWith('--'))throw Error('Missing or duplicated option value')
   result[key]=args[++i];continue
  }
  if(key.startsWith('--'))throw Error('Unknown option; use --help')
  result.positional.push(key)
 }
 return result
}
async function main(){
 const opt=options(process.argv.slice(2))
 if(opt.help||!opt.positional.length){process.stdout.write(help);return}
 const [command,path]=opt.positional
 if(opt.positional.length!==2||!['export','restore'].includes(command))throw Error('Use export NEW_FILE or restore FILE --replace')
 if(opt.replace!==(command==='restore'))throw Error('Restore requires --replace; export forbids it')
 if(command==='export'&&opt['--admin-mapping']!==undefined||command==='restore'&&opt['--version']!==undefined)throw Error('Mapping is restore-only; version is export-only')
 const version=opt['--version']??'2'
 if(!['1','2'].includes(version))throw Error('Supported checkpoint versions are 1 and 2')
 const origin=localOrigin(opt['--origin']),checkpoint=command==='restore'?await jsonInput(path):undefined
 const session=await privateSession(opt['--session-file'],origin)
 try{
  if(command==='export')await newExport(path,async()=>{
   const response=await request(origin,session.cookie,`/api/recovery/checkpoint?version=${version}`)
   try{return await response.json()}catch{throw Error('Local server returned invalid checkpoint JSON')}
  })
  else{
   await session.reserve()
   const response=await request(origin,session.cookie,'/api/recovery/restore',{mode:'replace',checkpoint,...(opt['--admin-mapping']===undefined?{}:{adminMapping:opt['--admin-mapping']})})
   await session.rotate(response)
  }
  process.stdout.write(JSON.stringify({[command==='export'?'exported':'restored']:true,paging:'OFF',...(command==='restore'?{sessionFileUpdated:true}:{authenticationIncluded:false})})+'\n')
 }finally{await session.close()}
}
main().catch(error=>{process.stderr.write(`checkpoint: ${error.code?'Local file operation failed ('+error.code+'); inspect private session/pending files before another restore':error.message}\n`);process.exitCode=1})
