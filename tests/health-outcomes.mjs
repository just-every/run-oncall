import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'

// Receipts go to the journey log, never into the installation or its archive.
export async function healthBuildIdentity() {
 const config=JSON.parse(await readFile('dist/server/wrangler.json','utf8'))
 return {
  sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  fingerprint:createHash('sha256').update(await readFile(resolve('dist/server',config.main))).digest('hex'),
 }
}

export async function recordHealthOutcome(mode,journey,observations) {
 console.log(JSON.stringify({
  clause:'OC-010',category:mode,outcome:'passed',recordedAt:new Date().toISOString(),
  provenance:{kind:'maintained-journey',journey,execution:'local',accountDeployment:false},
  build:await healthBuildIdentity(),observations,
 }))
}

export async function recordHealthFieldOutcomes() {
 const contract=await readFile('CONTRACT.md','utf8')
 const register=contract.split('## Field proof register\n')[1]?.split('\n## ')[0]
 if(!register)throw Error('Health outcomes require the contract field proof register')
 const rows=new Map(register.split('\n').filter(line=>/^\| R-\d+ \|/.test(line)).map(line=>{
  const [id,proof,clauses,state,date,receipt]=line.split('|').slice(1,-1).map(cell=>cell.trim())
  return [id,{proof,clauses,state,date:date||null,receipt:receipt.replaceAll('`','')||null}]
 }))
 for(const [id,category,section] of [
  ['R-1','provider','Hosted member coordination: OC-018'],
  ['R-2','provider','33. **OC-033'],
  ['R-8','human-drill',null],
 ]) {
  const row=rows.get(id)
  if(!row)throw Error(`Health outcomes require field proof ${id}`)
  let receipt=null
  if(row.receipt) {
   const source=await readFile(row.receipt,'utf8'),lines=source.split('\n')
   const start=lines.findIndex(line=>line.includes(section))
   if(start<0)throw Error(`Field proof ${id} receipt section is missing`)
   const end=lines.findIndex((line,index)=>index>start&&(/^(?:## |\d+\. \*\*)/.test(line)))
   const text=lines.slice(start,end<0?undefined:end).join('\n')
   receipt={path:row.receipt,section,sha256:createHash('sha256').update(source).digest('hex'),
    sourceShas:[...new Set([...text.matchAll(/\b[a-f0-9]{40}\b/g)].map(match=>match[0]))]}
  }
  console.log(JSON.stringify({clause:'OC-010',category,registerId:id,
   outcome:row.state,evidenceDate:row.date,proof:row.proof,clauses:row.clauses,
   provenance:{kind:row.state==='not run'?'not-run':'dated-prior-evidence',
    source:'CONTRACT.md',receipt,executedInThisRun:false},
  }))
 }
}
