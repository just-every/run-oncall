import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const {agentRuntime}=await import(pathToFileURL(resolve('tests/agent-door-runtime.mjs')));
const {analyticsFixture}=await import(pathToFileURL(resolve('tests/oncall-agent-fixtures.mjs')));
console.log('Baseline runtime',process.version,new Date().toISOString());
const runtime=await agentRuntime({clock:Date.UTC(2026,10,12,12)});
try {
 await analyticsFixture(runtime);
 throw Error('Expected the unchanged analytics session failure');
} catch(error) {
 console.error(error);
 console.log('Session expiry diagnostic',JSON.stringify((await runtime.db.prepare("SELECT expires, datetime(expires/1000,'unixepoch') AS expires_utc, round((julianday('now')-2440587.5)*86400000) AS sqlite_now_ms, expires>round((julianday('now')-2440587.5)*86400000) AS wall_clock_valid, (SELECT count(*) FROM oc_current_sessions) AS current_sessions FROM sessions WHERE operator_session IS NULL").all()).results));
 assert.equal(error.actual,401);assert.equal(error.expected,200);
} finally {await runtime.close()}
