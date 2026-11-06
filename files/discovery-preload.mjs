import cp from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
cp.spawnSync=(command,args,{env}={})=>{
 console.log('SELECTION '+JSON.stringify({command:command===process.execPath?'node':command,args,runtimePart:env?.ONCALL_RUNTIME_PART??null,lane:env?.ONCALL_VERIFY_LANE??null,prebuilt:env?.ONCALL_VERIFY_PREBUILT??null}));
 return {status:0};
};
syncBuiltinESMExports();
