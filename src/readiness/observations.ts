import {matrixDefinitions} from './matrix';
import {directEvent,newest,routedEvent} from './storage';
import type {MatrixRow} from './types';

type Observation = NonNullable<MatrixRow['observation']>;
type Counts = {configured:number;active:number};
type Acceptance = {lastAcceptedAt:string|null};
type Provider = Counts & Acceptance & {provider:string};
const observation = (counts: Counts, lastAcceptedAt: string | null): Observation =>
 ({state:'available',configured:counts.configured,active:counts.active,lastAcceptedAt});

async function byProvider(db:D1Database, kind:'intake'|'change') {
 const receipts=kind==='intake'?'oc_intake_receipts':'oc_changes';
 // The IDs are strings. Remove the outer column's SQLite affinity so the
 // equality can seek into the JSON-expression index.
 const result=await db.prepare(`SELECT json_extract(s.data,'$.provider') AS provider,
  COUNT(*) AS configured,COALESCE(SUM(json_extract(s.data,'$.active')=1 AND c.source IS NOT NULL),0) AS active,
  MAX((SELECT json_extract(r.data,'$.acceptedAt') FROM ${receipts} r
   WHERE json_extract(r.data,'$.source')=+s.id ORDER BY json_extract(r.data,'$.acceptedAt') DESC LIMIT 1)) AS lastAcceptedAt
  FROM oc_${kind}_sources s LEFT JOIN oc_${kind}_credentials c ON c.source=s.id GROUP BY provider`).all<Provider>();
 return result.results;
}

const providerObservation = (providers: Provider[], provider: string | undefined) => {
 const row=providers.find(row=>row.provider===provider);
 return observation(row??{configured:0,active:0},row?.lastAcceptedAt??null);
};

async function observeEvents(db:D1Database) {
 // Routed native keys live in intake storage. Their retained admissions still
 // contribute even after a definition disappears.
 const [direct,routed,directAccepted,routedAccepted]=(await db.batch<Counts & Acceptance>([
  db.prepare("SELECT COUNT(*) AS configured,COUNT(*) AS active FROM sources WHERE id NOT LIKE 'email:%' AND id NOT LIKE 'intake:%'"),
  db.prepare(`SELECT COUNT(*) AS configured,COALESCE(SUM(json_extract(s.data,'$.active')=1 AND c.source IS NOT NULL),0) AS active
   FROM oc_intake_sources s LEFT JOIN oc_intake_credentials c ON c.source=s.id WHERE json_extract(s.data,'$.provider')='native'`),
  db.prepare(`SELECT MAX(json_extract(data,'$.acceptedAt')) AS lastAcceptedAt FROM oc_events WHERE ${directEvent}=1`),
  db.prepare(`SELECT MAX(json_extract(data,'$.acceptedAt')) AS lastAcceptedAt FROM oc_intake_receipts WHERE ${routedEvent}=1`),
 ])).map(result=>result.results[0]);
 return observation({configured:direct.configured+routed.configured,active:direct.active+routed.active},newest([directAccepted.lastAcceptedAt,routedAccepted.lastAcceptedAt]));
}

async function observeEmail(db:D1Database) {
 const [counts,accepted]=await db.batch<Counts & Acceptance>([
  db.prepare(`SELECT COUNT(*) AS configured,COALESCE(SUM(json_extract(s.data,'$.active')=1 AND EXISTS(SELECT 1 FROM oc_email_credentials c WHERE c.address=s.id AND c.active=1)),0) AS active
   FROM oc_email_addresses s`),
  db.prepare("SELECT MAX(json_extract(data,'$.at')) AS lastAcceptedAt FROM oc_email_receipts WHERE json_extract(data,'$.outcome') NOT IN ('refused','quarantined')"),
 ]);
 return observation(counts.results[0],accepted.results[0].lastAcceptedAt);
}

export async function readinessMatrix(db:D1Database):Promise<MatrixRow[]> {
 const intake=byProvider(db,'intake'),changes=byProvider(db,'change');
 const events=observeEvents(db),email=observeEmail(db);
 return Promise.all(matrixDefinitions.map(async ({source,provider,...row})=>{
  try {
   let current:Observation|null=null;
   if(source==='events')current=await events;
   if(source==='email')current=await email;
   if(source==='intake')current=providerObservation(await intake,provider);
   if(source==='changes'){
    const providers=await changes;
    current=provider==='changes'?observation({
     configured:providers.reduce((total,row)=>total+row.configured,0),
     active:providers.reduce((total,row)=>total+row.active,0),
    },newest(providers.map(row=>row.lastAcceptedAt))):providerObservation(providers,provider);
   }
   return {...row,observation:current};
  } catch {return {...row,observation:{state:'unavailable' as const,configured:null,active:null,lastAcceptedAt:null}};}
 }));
}
