/** Shared words for the API client prerequisite and its REST refusal. */
export const apiClientPolicyUnset = 'Set agent policy before API clients can read or change records.';
export type ClientPolicyStatus = {
 state:'unset'|'set'|'paused'|'expired'|'unknown';
 setupUrl:string;
};
