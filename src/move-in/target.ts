import type { D1TargetAdapter } from '../modules/import-kit/src/d1/types'
import type { TargetRow } from '../modules/import-kit/src/types'

const decode=(row:any):TargetRow=>({destination:'oncall',targetKind:row.kind,targetId:row.id,revision:row.revision,value:JSON.parse(row.data)})
export const targets:D1TargetAdapter={
 async read(db,destination,kind,id){const row=await db.prepare('SELECT * FROM move_in_objects WHERE kind=? AND id=?').bind(kind,id).first();return row?decode(row):undefined},
 matches(row,destination,kind,id){return row?{sql:'EXISTS(SELECT 1 FROM move_in_objects WHERE kind=? AND id=? AND revision=? AND data=?)',params:[kind,id,row.revision,JSON.stringify(row.value)]}:{sql:'NOT EXISTS(SELECT 1 FROM move_in_objects WHERE kind=? AND id=?)',params:[kind,id]}},
 matchesCount(count){return {sql:'(SELECT COUNT(*) FROM move_in_objects)=?',params:[count]}},
 write(row){return [{sql:'INSERT INTO move_in_objects(kind,id,revision,data) VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET revision=excluded.revision,data=excluded.data',params:[row.targetKind,row.targetId,row.revision,JSON.stringify(row.value)]}]},
 remove(destination,kind,id){return [{sql:'DELETE FROM move_in_objects WHERE kind=? AND id=?',params:[kind,id]}]},
 async list(db){const {results}=await db.prepare('SELECT * FROM move_in_objects ORDER BY kind,id').all();return results.map(decode)},
}
