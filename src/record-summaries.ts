/** Preserve alert presentation from ordered event history without hydrating that history. */
export async function alertPageSummaries(db:D1Database,ids:string[]) {
 if(!ids.length)return {};
 const severity="MAX(CASE json_extract(e.data,'$.severity') WHEN 'critical' THEN 3 WHEN 'warning' THEN 2 ELSE 1 END)";
 const rows=await db.prepare(`SELECT a.id,
  (SELECT json_extract(e.data,'$.title') FROM oc_events e WHERE e.id=json_extract(a.data,'$.events[0]')) AS title,
  COALESCE(
   (SELECT ${severity} FROM json_each(a.data,'$.events') j JOIN oc_events e ON e.id=j.value WHERE json_extract(e.data,'$.intent')='trigger'),
   (SELECT ${severity} FROM json_each(a.data,'$.events') j JOIN oc_events e ON e.id=j.value)
  ) AS severity,
  (SELECT json_extract(e.data,'$.observedAt') FROM oc_events e WHERE e.id=COALESCE(
   (SELECT j.value FROM json_each(a.data,'$.events') j JOIN oc_events t ON t.id=j.value WHERE json_extract(t.data,'$.intent')='trigger' ORDER BY CAST(j.key AS INTEGER) LIMIT 1),
   json_extract(a.data,'$.events[0]')
  )) AS observedAt
  FROM oc_alerts a WHERE a.id IN (SELECT value FROM json_each(?))`).bind(JSON.stringify(ids)).all<{id:string;title:string;severity:number|null;observedAt:string|null}>();
 const names:Record<number,string>={1:'info',2:'warning',3:'critical'};
 return Object.fromEntries(rows.results.map(row=>[row.id,{title:row.title,severity:row.severity===null?null:names[row.severity],observedAt:row.observedAt}]));
}
