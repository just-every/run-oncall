import {integrationKinds} from '../integrations/catalog';
import {changeProviderNames} from '../changes/model';
import type {MatrixRow} from './types';

type Definition = Omit<MatrixRow, 'observation'> & {source?: 'intake' | 'events' | 'email' | 'changes'; provider?: string};
const none = {kind: 'none' as const, reference: null};
const journey = (reference: string) => ({kind: 'maintained-journey' as const, reference});
// A maintained local journey establishes local behavior only. No external live
// evidence exists for these adapters; configuration never promotes their state.
export const matrixDefinitions: Definition[] = [
 {id:'coordination',area:'Coordination',state:'working-here',evidence:journey('tests/runtime.mjs / tests/coordination-health.mjs'),limitation:'Coordination beside your existing pager; local storage and authority proof only.'},
 {id:'paging',area:'Native paging',state:'off',evidence:journey('tests/runtime.mjs — paging refusal'),limitation:'No phone, SMS, push or incident email sender. Keep your existing pager.'},
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
