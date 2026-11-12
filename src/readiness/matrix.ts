import {integrationKinds} from '../integrations/catalog';
import {changeProviderNames} from '../changes/model';
import type {MatrixRow, InstallationChecklist, InstallationDependency} from './types';
declare const __ONCALL_FIELD_PROOF__: InstallationDependency['fieldProof'];

type Definition = Omit<MatrixRow, 'observation'> & {source?: 'intake' | 'events' | 'email' | 'changes'; provider?: string};
const none = {kind: 'none' as const, reference: null};
const journey = (reference: string) => ({kind: 'maintained-journey' as const, reference});
// A maintained local journey establishes local behavior only. No external live
// evidence exists for these adapters; configuration never promotes their state.
export const matrixDefinitions: Definition[] = [
 {id:'coordination',area:'Coordination',state:'working-here',evidence:journey('tests/runtime.mjs / tests/coordination-health.mjs'),limitation:'Coordination beside your existing pager; local storage and authority proof only.'},
 {id:'paging',area:'Native paging',state:'off',evidence:journey('tests/runtime.mjs — paging refusal'),limitation:'No phone, SMS, push or incident email sender. Keep your existing pager.'},
 {id:'hosted-mail',area:'Hosted sign-in mail',state:'unproven-live',evidence:none,limitation:'A remote mail provider and verified sender must be configured and tested for this installation; local owner entry proves no mail delivery.'},
 {id:'bridges',area:'Zoom and Microsoft Teams bridges',state:'not-built',evidence:none,limitation:'No working conference bridge adapter or real inbound-call acceptance.'},
 {id:'regulated-data',area:'Regulated-data agreements and controls',state:'unproven-live',evidence:none,limitation:'Applicable agreements and validated controls have not been established; use redacted descriptions.'},
 {id:'us-emergency',area:'US emergency boundary',state:'working-here',evidence:journey('tests/product-browser.mjs — limitationsBrowser'),limitation:'Oncall is not a 911 dispatch service. Call 911 directly for US emergencies; do not wait for Oncall.'},
 {id:'standby',area:'Independent standby',state:'not-built',evidence:none,limitation:'No independent authority, takeover or failback proof.'},
 ...Object.entries(integrationKinds).map(([id,area]):Definition => ({id,area,state:'unproven-live',source:id==='events'?'events':id==='email'?'email':id==='changes'?'changes':'intake',provider:id,
  evidence:journey(id==='changes'?'tests/changes.mjs':id==='email'?'tests/intake.mjs':id==='events'?'tests/runtime.mjs':['alertmanager','grafana','datadog'].includes(id)?'tests/monitoring.mjs':'tests/intake.mjs'),
  limitation:'Local intake behavior only. No dated live acceptance; accepted events do not prove paging.'})),
 ...Object.entries(changeProviderNames).map(([provider,name]):Definition=>({id:'change-'+provider,area:name+' change source',state:'unproven-live',source:'changes',provider,evidence:journey('tests/changes.mjs'),limitation:'Local adapter proof only; live sender acceptance is unproven.'})),
 ...['Slack','Microsoft Teams'].map(name=>({id:'chat-'+name.toLowerCase().replaceAll(' ','-'),area:name+' chat',state:'not-built' as const,evidence:none,limitation:'No live chat action or delivery adapter.'})),
 {id:'sso',area:'Single sign-on',state:'not-built',evidence:none,limitation:'Product SSO is not configured; installation owner email and workspace passwords are separate.'},
 ...['iOS','Android'].map(name=>({id:name.toLowerCase(),area:name,state:'not-built' as const,evidence:none,limitation:'No native mobile app, push receipt or real-device cutover proof.'})),
 {id:'canary',area:'Canary and external missed-deadline watch',state:'not-built',evidence:none,limitation:'No scheduled end-to-end canary, distinct test recipient or independent external observer.'},
 {id:'drills',area:'Human-confirmed drills',state:'unproven-live',evidence:none,limitation:'No dated human-confirmed drill evidence (OC-047).'},
 {id:'reference-load',area:'OC-064 reference load',state:'unproven-live',evidence:none,limitation:'Sustained/burst intake, escalation, failover, recovery and archive p50/p95/p99/max are unmeasured.'},
 {id:'cutover',area:'Buyer cutover',state:'unproven-live',evidence:none,limitation:'Actual services and responders have no real-device acceptance checklist evidence.'},
 {id:'backup',area:'Backup and restore',state:'unproven-live',evidence:journey('tests/transfer.mjs / tests/checkpoint-cli.mjs'),limitation:'Local installation archives and private checkpoints exist. Hosted recovery, recovery time and reference-load capacity remain unproven.'},
 {id:'support',area:'Support and escalation',state:'unproven-live',evidence:none,limitation:'No product support channel, hours, response commitment or escalation contact is defined.'},
];

// Read the release's actual register, rather than a second set of passing flags.
// No installation configuration or local acceptance can promote field evidence.
const register = new Map(__ONCALL_FIELD_PROOF__.map(row=>[row.id,row]));
type Dependency = {id:string;name:string;clauses:string[];matrix:string[];proof:string[];requirement:string;boundary?:boolean};
const dependencies:Dependency[] = [
 {id:'hosting',name:'Hosting account and deployment identity',clauses:['OC-018'],matrix:['coordination'],proof:['R-1'],requirement:'Not done for this installation: authorize its Cloudflare account and deployment operation, bind the source SHA, artifact fingerprint and version, and verify owner access and removal. R-1 is dated prior evidence, not this deployment.'},
 {id:'mail',name:'Remote mail for hosted sign-in',clauses:['OC-018'],matrix:['hosted-mail'],proof:['R-1'],requirement:'Not done: configure a remote mail provider, credentials and verified sender, then prove a real hosted sign-in email. Local owner entry is not mail delivery; prior R-1 does not verify this sender. R-2 proves inbound intake only.'},
 {id:'us-sending',name:'Registered US voice and SMS sending',clauses:['OC-026','OC-066'],matrix:['paging'],proof:['R-5'],requirement:'Not done: register US A2P 10DLC brand and campaign, sender numbers and caller identity; establish consent, opt-out handling and carrier tests. Paging remains OFF; account configuration grants no sending authority.'},
 {id:'push',name:'APNs and FCM entitlements',clauses:['OC-029'],matrix:['ios','android'],proof:['R-7'],requirement:'Not done: provision APNs and FCM, iOS Critical Alerts entitlement, Android full-screen and Do Not Disturb permissions, and device acceptance. No native push adapter is built.'},
 {id:'native-apps',name:'Native apps and store distribution',clauses:['OC-029'],matrix:['ios','android'],proof:['R-7'],requirement:'Not done: build and distribute iOS and Android apps through the App Store and Google Play, with native-device proof. A web app or local test is not distribution evidence.'},
 {id:'bridges',name:'Zoom or Microsoft Teams bridges',clauses:['OC-035'],matrix:['bridges'],proof:['R-12','R-6'],requirement:'Not done: authorize a real Zoom or Teams tenant, build the bridge integration and prove live inbound call routing. No bridge or provider request is supplied by this checklist.'},
 {id:'chat',name:'Slack and Microsoft Teams apps',clauses:['OC-034','OC-067'],matrix:['chat-slack','chat-microsoft-teams'],proof:['R-12'],requirement:'Not done: install and authorize the scoped Slack and Teams apps and prove real chat actions. Neither connected app is built.'},
 {id:'standby',name:'Independent standby, takeover and real-phone drills',clauses:['OC-028','OC-047','OC-054'],matrix:['standby','drills'],proof:['R-8'],requirement:'Not done: establish independent account and identity authority, takeover and failback, and human-confirmed real-phone loss drills. Required for paging cutover; hosted coordination may run beside the existing pager without standby.'},
 {id:'handsets',name:'Live handset delivery',clauses:['OC-026','OC-029','OC-035','OC-064','OC-066','OC-071','OC-080','OC-082'],matrix:['cutover'],proof:['R-6'],requirement:'Not done: prove registered real-handset voice with DTMF, SMS replies and links, push and email, plus provider-disable and inbound-call drills. Local receipts and provider sandboxes prove no live receipt.'},
 {id:'reference-load',name:'OC-064 reference load',clauses:['OC-064','OC-054'],matrix:['reference-load'],proof:['R-6'],requirement:'Not done: measure sustained and burst intake, escalation, failover, recovery and archive capacity with p50, p95, p99 and maximum against OC-064. R-6 covers related live delivery, not a passing reference-load measurement.'},
 {id:'regulated-data',name:'Applicable regulated-data agreements and validated controls',clauses:['OC-044'],matrix:['regulated-data'],proof:[],requirement:'Not done: applicable agreements and validated controls are absent, and no field-proof row records them. Make no HIPAA or regulated-data suitability claim; use redacted incident descriptions and separately authorized references.'},
 {id:'911',name:'911 emergency boundary',clauses:['OC-044'],matrix:['us-emergency'],proof:[],boundary:true,requirement:'Oncall is not a 911 dispatch service. For a US emergency, call 911 directly; do not send it to Oncall or wait for an alert or acknowledgment. This is guidance, not an emergency-service capability; no field-proof row applies.'},
];
export function installationChecklist(matrix:MatrixRow[]):InstallationChecklist {
 return {country:'US',reviewedOn:'2026-11-12',items:dependencies.map(item=>{
  const rows=item.matrix.map(id=>{const row=matrix.find(row=>row.id===id);if(!row)throw Error('Missing installation matrix dependency');return {id,state:row.state};});
  // The least-ready constituent wins; registration and receipts stay separate.
  const state=rows.map(row=>row.state).sort((a,b)=>['off','not-built','unproven-live','working-here'].indexOf(a)-['off','not-built','unproven-live','working-here'].indexOf(b))[0];
  return {id:item.id,name:item.name,clauses:item.clauses,state,completion:item.boundary?'guidance-only':'not-done',matrix:rows,
   fieldProof:item.proof.map(id=>{const row=register.get(id);if(!row)throw Error('Missing installation field proof');return row;}),requirement:item.requirement} satisfies InstallationDependency;
 })};
}
