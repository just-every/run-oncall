import { registerHooks } from 'node:module';

const comparison = `
  const {writeFile}=await import('node:fs/promises');
  const contract=await readFile('CONTRACT.md','utf8');
  const table=contract.split('### Agent surface\\n').at(-1).split('**Table status.**')[0];
  const rows=new Map(table.split('\\n').filter(row=>row.startsWith('| \`oncall.')).map(row=>{
   const [,name,description,clauses,classes,today]=row.split('|').map(cell=>cell.trim());
   return [name.slice(1,-1),{description,clauses,classes,today}];
  }));
  const tools=listed.result.tools.map(({name,_meta})=>({name,_meta}));
  const name='oncall.responders.list';
  assert.equal(tools.filter(tool=>tool.name===name).length,1);
  const responder=tools.find(tool=>tool.name===name);
  assert.deepEqual(responder._meta,{
   'com.runeditrun/classes':['standard','sensitive'],
   'com.runeditrun/clauses':['OC-053'],
   'com.runeditrun/scope':'responders:read',
  });
  assert.deepEqual(tools.filter(tool=>!rows.has(tool.name)).map(tool=>tool.name),process.env.RER_SURFACE_PHASE==='before'?[name]:[]);
  if(rows.has(name)) assert.deepEqual(rows.get(name),{
   description:'Look up active responder and administrator IDs and names',
   clauses:'OC-053',
   classes:'standard (+ sensitive)',
   today:'Shipped read with \`responders:read\`',
  });
  const manifest=new Map(surface.tools.map(tool=>[tool.name,tool]));
  for(const tool of tools) {
   const {clauses,classes,scope}=manifest.get(tool.name);
   assert.deepEqual(tool._meta['com.runeditrun/clauses'],clauses,tool.name);
   assert.deepEqual(tool._meta['com.runeditrun/classes'],classes,tool.name);
   assert.equal(tool._meta['com.runeditrun/scope'],scope,tool.name);
  }
  assert.deepEqual(edge,[]);
  await writeFile(process.env.RER_SURFACE_OUTPUT+'.'+label+'.json',JSON.stringify({
   phase:process.env.RER_SURFACE_PHASE,policy:label,responder,tools,contractHasResponder:rows.has(name),
   missingToolNames:tools.filter(tool=>!rows.has(tool.name)).map(tool=>tool.name),
   nativeAndPagingUnchanged:true,outboundRequests:0,
  },null,2)+'\\n');
  console.log('SURFACE-001 comparison '+process.env.RER_SURFACE_PHASE+' '+label+': '+tools.length+' tools, exact responder metadata, native and paging unchanged, zero outbound requests');
`;
registerHooks({
 load(url, context, nextLoad) {
  const loaded=nextLoad(url,context);
  if(!url.endsWith('/tests/oncall-agent-flow.mjs')) return loaded;
  const anchor="  console.log("+String.fromCharCode(96)+"PROBE BASE-AGENT-013 1";
  const source=loaded.source.toString();
  if(source.split(anchor).length!==2) throw Error('Inventory proof insertion point changed');
  return {...loaded,source:source.replace(anchor,comparison+anchor)};
 },
});
