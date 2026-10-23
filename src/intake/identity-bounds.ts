/** Confirmed PagerDuty/Opsgenie limits; Splunk keeps the documented local 200-unit profile. */
export const identityLimit=(provider:string)=>provider==='opsgenie'?512:provider.startsWith('pagerduty')?255:200;
export const cleanIdentity=(value:string)=>value===value.trim()&&!/[\x00-\x1f\x7f]/.test(value)&&![...value].some(character=>{const point=character.codePointAt(0)!;return point>=0xd800&&point<=0xdfff});
