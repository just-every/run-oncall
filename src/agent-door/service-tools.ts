import type { Bindings } from '../auth.server'
import { command, fail } from '../family/response-operations/domain'
import { ToolRefusal, type ToolDefinition } from '../modules/agent-door/index.ts'
import { changeHash } from '../changes/credentials'
import { nativeAccess, nativeActor, nativeAudit, nativeCall, persistNative } from './native'

/** The native versioned service edit, retaining its exact projected ETag. */
export function serviceTools(env: Bindings): ToolDefinition[] {
  const get = async (args: Record<string, unknown>, ctx: Parameters<typeof nativeAccess>[1]) => {
    const current = await nativeAccess(env, ctx, 'services:write', args.id)
    if (!current.client && current.member.role !== 'admin') throw new ToolRefusal('native_authority_required')
    const old = current.state.services.find(row => row.id === args.id)!
    const projected = { ...old, dependencies: (old.dependencies??[]).filter(id => current.services.includes(id)) }
    return { current, old, etag: await changeHash(JSON.stringify(projected)) }
  }
  return [{
    name: 'oncall.services.update', title: 'Update a service coordination record', description: 'Edit the existing native service record using its current projected ETag. Links and runbooks are inert; this never pages or executes a runbook.', scope: 'services:write', readOnly: false, classes: ['standard'], clauses: ['OC-003','OC-005','OC-053'], untrusted: true,
    inputSchema: { type: 'object', properties: { id: {type:'string',minLength:1,maxLength:100}, etag:{type:'string',pattern:'^[a-f0-9]{64}$'},name:{type:'string',minLength:1,maxLength:200},environment:{type:'string',minLength:1,maxLength:100},owner:{type:['string','null'],maxLength:100},runbook:{type:'array',items:{type:'string',minLength:1,maxLength:500},maxItems:30},pager:{type:'string',maxLength:2000},dependencies:{type:'array',items:{type:'string'},maxItems:100} },required:['id','etag','name','environment','owner','runbook','pager'],additionalProperties:false },
    outputSchema:{type:'object',properties:{id:{type:'string'},etag:{type:'string'}},required:['id','etag']},revisionType:'string',revision: (args,ctx)=>nativeCall(async()=>(await get(args,ctx)).etag),
    classify:(args,ctx)=>nativeCall(async()=>{await get(args,ctx);return [{class:'standard',facts:{measure:1}}]}),
    target:(args,ctx)=>nativeCall(async()=>({kind:'service',id:(await get(args,ctx)).old.id})),
    summary:(args,ctx)=>nativeCall(async()=>{const {old}=await get(args,ctx);return {target:{id:old.id,name:old.name},items:[`ETag ${args.etag}`,JSON.stringify(args)]}}),
    run:(args,ctx)=>nativeCall(async()=>{
      const {current,etag}=await get(args,ctx)
      if(args.etag!==etag)throw new ToolRefusal('revision_conflict')
      if(Array.isArray(args.dependencies)&&args.dependencies.some(id=>!current.services.includes(String(id))))throw new ToolRefusal('not_found')
      const result=command(current.state,nativeActor(current,ctx),{...args,type:'service'}) as {id:string;dependencies?:string[]}
      nativeAudit(env,ctx,'service.update',result.id);await persistNative(env,current)
      const uri=`oncall://services/${encodeURIComponent(result.id)}`;ctx.emit('service.changed',uri)
      return {result:{...result,etag:await changeHash(JSON.stringify({...result,dependencies:(result.dependencies??[]).filter(id=>current.services.includes(id))}))},resources:[{uri,name:String(args.name)}]}
    }),
  }]
}
