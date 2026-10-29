// Use the installed CLI, including its production build, native bootstrap,
// signed Business binding and isolated provider-edge conformance runner.
import { checkAgentDoor } from '../node_modules/@runeditrun/rer/cli/agent-door.mjs';

// Published 0.2.90 keeps Base's replay admission and original approval outcome.
// Native schedule, team and erasure receipts classify committed effects while
// rechecking current authority, without requiring consumed preparation state.
// Every conformance point remains a real assertion.
const report = line => {
  // Keep the complete assertion count even when the parent command bounds logs.
  if (line.startsWith('Agent door conformance:')) process.stderr.write(line + '\n');
  else console.log(line);
};
try { await checkAgentDoor(process.cwd(), { report }); }
catch (error) {
  if (error.code !== 'agent_door_failed') throw error;
  console.error(error.message);
  process.exitCode = error.exitCode ?? 1;
}
