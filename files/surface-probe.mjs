import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),packet=process.env.SURFACE_PACKET,phase=process.argv[2];
const {agentRuntime,agentReadSnapshot,assertAgentReadUnchanged}=await import(pathToFileURL(root+'/tests/agent-door-runtime.mjs'));
const {autonomousPolicy,heldPolicy}=await import(pathToFileURL(root+'/src/modules/agent-door/conformance/crypto.mjs'));
const targets=['automation.replay','clients.update','endpoints.update','incidents.declare','incidents.resolve','incidents.update','privacy.erase','schedules.coverage','schedules.update','services.update'].map(name=>'oncall.'+name);
const guards=['automation.dispatch','schedules.create','schedules.override','changes.read','analytics.read'].map(name=>'oncall.'+name);
const contract=await readFile('CONTRACT.md','utf8');
const rows=new Map([...contract.matchAll(/^\| `(oncall\.[^`]+)` \| [^|]+ \| ([^|]+) \|/gm)].map(([,name,clauses])=>[name,clauses.trim().split(', ').sort()]));
const omitClauses=tools=>tools.map(({_meta,...tool})=>{const {'com.runeditrun/clauses':ignored,...meta}=_meta;return {...tool,_meta:meta}});
const result={phase,modes:[],targets,guards};
const runtime=await agentRuntime({clock:null});
try{
 for(const [mode,policy] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]){
  assert.equal((await runtime.adopt(policy)).status,200);
  const before=await agentReadSnapshot(runtime),edge=await runtime.outboundRequests();
  const discovery=await runtime.mcp('server/discover'),listing=await runtime.mcp('tools/list'),templates=await runtime.mcp('resources/templates/list');
  assert.equal(discovery.status,200);assert.equal(listing.status,200);assert.equal(templates.status,200);
  assert.equal(listing.body.error,undefined);assert.equal(listing.result.nextCursor,undefined);
  const tools=listing.result.tools;
  const associations=[...targets,...guards].map(name=>{
   const actual=tools.find(row=>row.name===name);assert.ok(actual,name);
   const clauses=[...actual._meta['com.runeditrun/clauses']].sort(),expected=rows.get(name);
   return {name,clauses,expected,aligned:JSON.stringify(clauses)===JSON.stringify(expected)};
  });
  const mismatches=associations.filter(row=>!row.aligned).map(row=>row.name);
  assert.deepEqual(mismatches,phase==='before'?targets:[]);
  if(phase==='after'){
   const prior=JSON.parse(await readFile(packet+'/before.json','utf8')).modes.find(row=>row.mode===mode);
   assert.deepEqual(omitClauses(tools),omitClauses(prior.tools),'Every emitted descriptor byte outside clause metadata stays unchanged');
   for(const name of guards)assert.deepEqual(tools.find(row=>row.name===name),prior.tools.find(row=>row.name===name),name+' remains unchanged');
  }
  const response=await runtime.http('/docs/agents');assert.equal(response.status,200);const html=await response.text();
  assert.ok(html.includes('Current tool inventory'));
  const after=await agentReadSnapshot(runtime);assertAgentReadUnchanged(before,after);
  assert.deepEqual(await runtime.outboundRequests(),edge);assert.deepEqual(edge,[]);
  const auditBefore=new Set(before.records.oc_admin_audit.map(row=>row.id));
  const appended=after.records.oc_admin_audit.filter(row=>!auditBefore.has(row.id));
  result.modes.push({mode,associations,mismatches,toolCount:tools.length,tools,nativeAndPagingUnchanged:true,readAudit:appended.map(({kind,workspace_before,workspace_after,paging_before,paging_after,handoff_before,handoff_after})=>({kind,workspace_before,workspace_after,paging_before,paging_after,handoff_before,handoff_after})),outboundRequests:0});
  console.log(`PROBE SURFACE-001 1 ${phase} ${mode}: emitted Worker discovery and complete tools listing -> ${tools.length} tools, ${mismatches.length} selected mismatches; five guard associations checked; native and paging retained; value-free read audit only; zero outbound requests`);
 }
 await writeFile(packet+'/'+phase+'.json',JSON.stringify(result,null,2)+'\n');
}finally{await runtime.close()}
