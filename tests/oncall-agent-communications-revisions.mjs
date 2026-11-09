import {staleRoleExpectedRevision} from './oncall-agent-role-revisions.mjs';

/** Communications diagnoses stale optional revisions through the native MCP door. */
export async function staleCommunicationsExpectedRevision(runtime){
 await staleRoleExpectedRevision(runtime,'communications','Communications');
}
