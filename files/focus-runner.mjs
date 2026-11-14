import {agentRuntime} from '/workspace/run-oncall/tests/agent-door-runtime.mjs';
import {roleClearReplay} from '/workspace/run-oncall/tests/oncall-agent-role-clear-replay.mjs';
import {agedReplayRetention} from '/workspace/run-oncall/tests/oncall-agent-retention.mjs';
await agedReplayRetention();
const runtime=await agentRuntime({clock:null});
try{
 await runtime.adopt();
 // The normal specialist flow creates the foreign service used by scoped refusals.
 const response=await runtime.http('/api/workspace'),owner=(await response.json()).member;
 await runtime.http('/api/command',{type:'service',id:'agent-foreign-service',name:'Synthetic foreign service',environment:'production',owner:owner.id,runbook:[],pager:''});
 for(const [role,label] of [['scribe','Scribe'],['communications','Communications'],['commander','Commander']])await roleClearReplay(runtime,role,label);
}finally{await runtime.close()}
