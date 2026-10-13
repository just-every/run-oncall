import {execFileSync,spawn} from 'node:child_process'
import {mkdtemp,symlink,mkdir,cp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {dirname,join,relative} from 'node:path'
import {fileURLToPath} from 'node:url'

/** Managed setup/reset journeys always use committed source in a fresh clone.
 * Neither an owner's installation nor the outer verify lock is test data. */
export async function isolatedEntrypoint(url){
 const root=dirname(dirname(fileURLToPath(url))),script=relative(root,fileURLToPath(url))
 if(process.env.ONCALL_NATIVE_CLONE===script)return null
 const temp=await mkdtemp(join(tmpdir(),'oncall-native-')),checkout=join(temp,'checkout')
 let child
 try{
  execFileSync('git',['clone','--quiet','--local',root,checkout],{stdio:'ignore'})
  await symlink(join(root,'node_modules'),join(checkout,'node_modules'),'dir')
  const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:checkout,encoding:'utf8'}).trim()
  console.log(`Fresh-clone ${script}: ${sha}`)
  const env={...process.env,ONCALL_NATIVE_CLONE:script};delete env.RER_LOCAL_OPERATION
  child=spawn(process.execPath,[...process.execArgv,script],{cwd:checkout,env,stdio:'inherit'})
  return await new Promise(resolve=>{child.once('exit',code=>resolve(code??1));child.once('error',()=>resolve(1))})
 }finally{
  if(child&&child.exitCode===null){child.kill('SIGTERM');await new Promise(r=>child.once('exit',r))}
  await mkdir(join(root,'evidence'),{recursive:true})
  await cp(join(checkout,'evidence/browser'),join(root,'evidence/browser'),{recursive:true}).catch(error=>{if(error.code!=='ENOENT')throw error})
  await rm(temp,{recursive:true,force:true})
 }
}
