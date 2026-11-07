import {agentRuntime} from '/workspace/oncall-f209/tests/agent-door-runtime.mjs';
import {droppedReassignmentReplay} from '/workspace/oncall-f209/tests/oncall-agent-incident-replay.mjs';
const runtime=await agentRuntime();
try {await droppedReassignmentReplay(runtime)} finally {await runtime.close()}
