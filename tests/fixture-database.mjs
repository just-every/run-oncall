import {DatabaseSync} from 'node:sqlite'
import {readdirSync,existsSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {resolve,join} from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const {unstable_splitSqlQuery:split}=require('wrangler')

// Fixture setup, failure injection and readback use the same on-disk D1 database
// as workerd. Product actions still go through HTTP; no application storage is
// substituted. Open only for the synchronous fixture operation, then release.
export function fixtureDatabase(persist,command) {
 const directory=resolve(persist,'v3/d1/miniflare-D1DatabaseObject')
 const files=(existsSync(directory)?readdirSync(directory):[]).filter(name=>name.endsWith('.sqlite')).filter(name=>{
  const probe=new DatabaseSync(join(directory,name),{readOnly:true})
  try{return Boolean(probe.prepare("SELECT name FROM sqlite_master WHERE name='d1_migrations'").get())}
  finally{probe.close()}
 })
 // Reset deliberately removes the receiving database. Let Wrangler create its
 // actual configured D1 store for empty-target inspection, just as setup does.
 // Migrated stores keep the fast direct fixture path above.
 if(files.length===0)return JSON.parse(execFileSync(process.execPath,[
  'node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local',
  '--persist-to',persist,'--command',command,'--json',
 ],{encoding:'utf8',env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'},stdio:['ignore','pipe','pipe'],maxBuffer:64*1024*1024})).map(result=>result.results)
 if(files.length!==1)throw Error('Expected the installation D1 database')
 const db=new DatabaseSync(join(directory,files[0]))
 try {
  db.exec('PRAGMA busy_timeout=10000')
  return split(command).map(statement=>db.prepare(statement).all().map(row=>({...row})))
 }finally{db.close()}
}
