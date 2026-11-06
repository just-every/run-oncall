import cp from 'node:child_process';
import {registerHooks,syncBuiltinESMExports} from 'node:module';
import {readFileSync} from 'node:fs';
import fs from 'node:fs/promises';
import {resolve} from 'node:path';
const original=resolve('../packet/original');
const read=fs.readFile;
fs.readFile=async function(path,...args) {
 if(process.env.PROBE_BEFORE==='1' && String(path).endsWith('/scripts/verify-shards.json'))return read(resolve(original,'scripts/verify-shards.json'),...args);
 return read(path,...args);
};
cp.spawnSync=(command,args,{env}={})=>{
 console.log('SELECTION '+JSON.stringify({command:command===process.execPath?'node':command,args,runtimePart:env?.ONCALL_RUNTIME_PART??null,triagePart:env?.ONCALL_TRIAGE_PART??null,lane:env?.ONCALL_VERIFY_LANE??null,prebuilt:env?.ONCALL_VERIFY_PREBUILT??null}));
 return {status:0};
};
syncBuiltinESMExports();
registerHooks({load(url,context,next){
 const result=next(url,context);
 if(process.env.PROBE_BEFORE==='1'&&url.endsWith('/tests/verify.mjs'))return {...result,source:readFileSync(resolve(original,'tests/verify.mjs'),'utf8')};
 return result;
}});
