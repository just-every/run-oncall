import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {agentEffectSnapshot} from './agent-door-runtime.mjs';
import {autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

import {staleRoleExpectedRevision,staleRoleNativeRevision} from './oncall-agent-role-revisions.mjs';

/** Communications diagnoses stale optional revisions through the native MCP door. */
export async function staleCommunicationsExpectedRevision(runtime){
 await staleRoleExpectedRevision(runtime,'communications','Communications');
}

/** Communications retains the common native revision journey. */
export async function staleCommunicationsNativeRevision(runtime){
 await staleRoleNativeRevision(runtime,'communications','Communications');
}
