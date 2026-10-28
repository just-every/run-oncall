import {matrixDefinitions} from './matrix';
import type {MatrixRow} from './types';

type Observation = NonNullable<MatrixRow['observation']>;
async function observe(db:D1Database, definition:typeof matrixDefinitions[number]):Promise<Observation|null> {
 if (!definition.source) return null;
 const kind=definition.source,provider=definition.provider;
 let queries:D1PreparedStatement[];
 if (kind==='intake') {
  queries=[db.prepare(`SELECT COUNT(*) AS configured,COALESCE(SUM(json_extract(s.data,'$.active')=1 AND c.source IS NOT NULL),0) AS active
   FROM oc_intake_sources s LEFT JOIN oc_intake_credentials c ON c.source=s.id WHERE json_extract(s.data,'$.provider')=?`).bind(provider),
   db.prepare(`SELECT MAX(json_extract(r.data,'$.acceptedAt')) AS lastAcceptedAt FROM oc_intake_receipts r
    JOIN oc_intake_sources s ON s.id=json_extract(r.data,'$.source') WHERE json_extract(s.data,'$.provider')=?`).bind(provider)];
 } else if (kind==='events') {
  queries=[db.prepare("SELECT COUNT(*) AS configured,COUNT(*) AS active FROM sources WHERE id NOT LIKE 'email:%' AND id NOT LIKE 'intake:%'"),
   db.prepare("SELECT MAX(json_extract(data,'$.acceptedAt')) AS lastAcceptedAt FROM oc_events WHERE json_extract(data,'$.source') NOT LIKE 'email:%' AND json_extract(data,'$.source') NOT LIKE 'intake:%'")];
  // Routed native keys also implement the Events API, but live in intake storage.
  const routed=await db.batch<{configured:number;active:number;lastAcceptedAt:string|null}>([
   db.prepare(`SELECT COUNT(*) AS configured,COALESCE(SUM(json_extract(s.data,'$.active')=1 AND c.source IS NOT NULL),0) AS active
    FROM oc_intake_sources s LEFT JOIN oc_intake_credentials c ON c.source=s.id WHERE json_extract(s.data,'$.provider')='native'`),
   db.prepare("SELECT MAX(json_extract(data,'$.acceptedAt')) AS lastAcceptedAt FROM oc_intake_receipts WHERE json_extract(data,'$.provider')='native'")]);
  const result=await db.batch<{configured:number;active:number;lastAcceptedAt:string|null}>(queries);
  return {state:'available',configured:result[0].results[0].configured+routed[0].results[0].configured,active:result[0].results[0].active+routed[0].results[0].active,lastAcceptedAt:[result[1].results[0].lastAcceptedAt,routed[1].results[0].lastAcceptedAt].filter((v):v is string=>!!v).sort().at(-1)??null};
 } else if(kind==='email') {
  queries=[db.prepare(`SELECT COUNT(*) AS configured,COALESCE(SUM(json_extract(s.data,'$.active')=1 AND EXISTS(SELECT 1 FROM oc_email_credentials c WHERE c.address=s.id AND c.active=1)),0) AS active
   FROM oc_email_addresses s`),
   db.prepare("SELECT MAX(json_extract(data,'$.at')) AS lastAcceptedAt FROM oc_email_receipts WHERE json_extract(data,'$.outcome') NOT IN ('refused','quarantined')")];
 } else {
  const where=provider==='changes'?'1=1':"json_extract(s.data,'$.provider')=?";
  queries=[db.prepare(`SELECT COUNT(*) AS configured,COALESCE(SUM(json_extract(s.data,'$.active')=1 AND c.source IS NOT NULL),0) AS active
   FROM oc_change_sources s LEFT JOIN oc_change_credentials c ON c.source=s.id WHERE ${where}`),
   db.prepare(`SELECT MAX(json_extract(r.data,'$.acceptedAt')) AS lastAcceptedAt FROM oc_changes r JOIN oc_change_sources s ON s.id=json_extract(r.data,'$.source') WHERE ${where}`)];
  if(provider!=='changes')queries=queries.map(query=>query.bind(provider));
 }
 const result=await db.batch<{configured:number;active:number;lastAcceptedAt:string|null}>(queries);
 return {state:'available',configured:result[0].results[0].configured,active:result[0].results[0].active,lastAcceptedAt:result[1].results[0].lastAcceptedAt};
}
export async function readinessMatrix(db:D1Database):Promise<MatrixRow[]> {
 return Promise.all(matrixDefinitions.map(async definition=>{
  const {source:_,provider:__,...row}=definition;
  try {return {...row,observation:await observe(db,definition)};}
  catch {return {...row,observation:{state:'unavailable' as const,configured:null,active:null,lastAcceptedAt:null}};}
 }));
}
