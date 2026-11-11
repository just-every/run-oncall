import {registerHooks} from 'node:module';
const realNow=Date.now.bind(Date),offset=30*86400000;
Date.now=()=>realNow()+offset;
console.log('FUTURE_CLOCK '+JSON.stringify({offsetDays:30,testNow:new Date(Date.now()).toISOString(),wallNow:new Date(realNow()).toISOString()}));
registerHooks({load(url,context,nextLoad){
 const result=nextLoad(url,context);
 if(url==='file:///workspace/run-oncall/tests/oncall-agent-flow.mjs'){
  const source=String(result.source),boundary='\nconst runtime=await agentRuntime();';
  if(!source.includes('\nawait agedReplayRetention();\n')||!source.includes(boundary))throw Error('Cannot isolate existing agedReplayRetention');
  return {...result,source:source.slice(0,source.indexOf(boundary))+"\nconsole.log('PASS future agedReplayRetention: all existing assertions under both policies at Date.now + 30 days');\n"};
 }
 return result;
}});
