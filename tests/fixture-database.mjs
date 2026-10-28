import {DatabaseSync} from 'node:sqlite'
import {readdirSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const {unstable_splitSqlQuery:split}=require('wrangler')

// Fixture setup, failure injection and readback use the same on-disk D1 database
// as workerd. Product actions still go through HTTP; no application storage is
// substituted. Open only for the synchronous fixture operation, then release.
export function fixtureDatabase(persist,command) {
 const directory=resolve(persist,'v3/d1/miniflare-D1DatabaseObject')
 const files=readdirSync(directory).filter(name=>name.endsWith('.sqlite')).filter(name=>{
  const probe=new DatabaseSync(join(directory,name),{readOnly:true})
  try{return Boolean(probe.prepare("SELECT name FROM sqlite_master WHERE name='d1_migrations'").get())}
  finally{probe.close()}
 })
 if(files.length!==1)throw Error('Expected the installation D1 database')
 const db=new DatabaseSync(join(directory,files[0]))
 try {
  db.exec('PRAGMA busy_timeout=10000')
  return split(command).map(statement=>db.prepare(statement).all().map(row=>({...row})))
 }finally{db.close()}
}
