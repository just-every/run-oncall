import { stored, boundary } from '../modules/import-kit/src/d1/jobs'
import { authorize, readAtomic } from '../modules/import-kit/src/d1/database'
import { requestContext } from '../modules/import-kit/src/d1/budget'
import { nativeStagingScope } from '../modules/import-kit/src/d1/native-staging-context'
import type { D1ImportContext } from '../modules/import-kit/src/d1/types'

/** Read the retained plan even after undo removes its native schedule rows.
 * Use the kit's exact read fence so erasure and current authority still apply. */
export async function readMoveInJournal(id:string,context:D1ImportContext) {
 context=requestContext(context)
 await authorize(context,'read')
 const {job,plan}=await stored(id,context)
 await readAtomic(context,[...boundary(job,plan)],nativeStagingScope(job,plan))
 const schedules=plan.entries.filter(entry=>entry.source.kind==='schedules'&&!entry.erased).map(entry=>{
  const value=entry.source.payload as any
  return String(value?.name??value?.summary??entry.source.sourceId)
 })
 const files=plan.source.artifacts.map(artifact=>artifact.name)
 // Exporter filenames carry the export time. Legacy journals never recorded
 // an import timestamp; do not manufacture one from the current time.
 const stamp=files.map(name=>name.match(/-export-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})(?:\.\d+)?Z\.json$/)).find(Boolean)
 const exportedAt=stamp?`${stamp[1]}T${stamp[2]}:${stamp[3]}:${stamp[4]}Z`:undefined
 const comparisons=[...new Set(plan.entries.filter(entry=>!entry.erased).flatMap(entry=>entry.effects).filter(effect=>effect.targetKind==='schedule').flatMap(effect=>{
  const comparison=(effect.value as any).equivalence
  return comparison?.from&&comparison?.to?[`${comparison.from} → ${comparison.to}`]:[]
 }))]
 return {...job,schedules,files,exportedAt,comparisons}
}
