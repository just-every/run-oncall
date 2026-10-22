import { fail } from '../family/response-operations/domain.ts';
import type { ResponseReport } from './report.ts';

type NoisyKey = {source: string; service: string; key: string; title: string; alerts: number; triggers: number; suppressed: number; active: number};
type NoiseRow = {revision: number; alerts: number; triggers: number; repeatedAlerts: number; suppressedAlerts: number; noisyKeys: number; candidates: string};

/** Aggregate the complete machine history; workspace projections only hold recent machine records. */
export async function alertNoise(db: D1Database, report: ResponseReport) {
  const row = await db.prepare(`WITH
    cohort AS (SELECT julianday(?) AS start, julianday(?) AS stop, ? AS service, ? AS revision),
    triggers AS (
      SELECT a.id,a.ordinal,json_extract(a.data,'$.source') AS source,json_extract(a.data,'$.service') AS service,
        json_extract(a.data,'$.key') AS key,json_extract(a.data,'$.suppressed') AS suppressed,
        json_extract(a.data,'$.state')='active' AS active,json_extract(e.data,'$.title') AS title,
        COUNT(*) OVER (PARTITION BY a.id) AS triggers,
        ROW_NUMBER() OVER (PARTITION BY a.id ORDER BY CAST(j.key AS INTEGER) DESC) AS event_rank
      FROM oc_alerts a JOIN json_each(a.data,'$.events') j JOIN oc_events e ON e.id=j.value
        CROSS JOIN cohort c JOIN workspace_control w ON w.id=1 AND w.revision=c.revision
      WHERE (c.service IS NULL OR json_extract(a.data,'$.service')=c.service)
        AND json_extract(e.data,'$.intent')='trigger'
        AND julianday(json_extract(e.data,'$.acceptedAt'))>=c.start
        AND julianday(json_extract(e.data,'$.acceptedAt'))<c.stop
    ),
    alerts AS (
      SELECT *,ROW_NUMBER() OVER (PARTITION BY source,service,key ORDER BY ordinal DESC,id DESC) AS title_rank,
        FIRST_VALUE(id) OVER (PARTITION BY source,service,key ORDER BY ordinal,id) AS first_id
      FROM triggers WHERE event_rank=1
    ),
    keys AS (
      SELECT source,service,key,MAX(CASE WHEN title_rank=1 THEN title END) AS title,COUNT(*) AS alerts,
        SUM(triggers) AS triggers,SUM(suppressed) AS suppressed,SUM(active) AS active,
        MIN(ordinal) AS first_ordinal,first_id
      FROM alerts GROUP BY source,service,key HAVING COUNT(*)>1 OR SUM(triggers)>1
    ),
    ranked AS (SELECT *,RANK() OVER (ORDER BY triggers DESC,alerts DESC) AS place FROM keys)
    SELECT (SELECT revision FROM workspace_control WHERE id=1) AS revision,
      (SELECT COUNT(*) FROM alerts) AS alerts,(SELECT COALESCE(SUM(triggers),0) FROM alerts) AS triggers,
      (SELECT COUNT(*) FROM alerts WHERE triggers>1) AS repeatedAlerts,
      (SELECT COUNT(*) FROM alerts WHERE suppressed) AS suppressedAlerts,(SELECT COUNT(*) FROM keys) AS noisyKeys,
      (SELECT json_group_array(json_object('source',source,'service',service,'key',key,'title',title,
        'alerts',alerts,'triggers',triggers,'suppressed',suppressed,'active',active))
        FROM (SELECT * FROM ranked WHERE place<=20 ORDER BY first_ordinal,first_id)) AS candidates
  `).bind(report.cohort.from, report.cohort.to, report.cohort.service, report.revision).first<NoiseRow>();
  if (!row || row.revision !== report.revision) fail('Workspace changed; refresh the report before exporting', 409);
  // SQLite's binary collation differs from localeCompare. Keep the entire numeric boundary tie
  // (group aggregates only), then apply the existing locale order and stable insertion-order tie.
  const noisy = (JSON.parse(row.candidates) as NoisyKey[])
    .sort((a, b) => b.triggers - a.triggers || b.alerts - a.alerts || a.key.localeCompare(b.key) || a.source.localeCompare(b.source)).slice(0, 20);
  return {alerts: row.alerts, triggers: row.triggers, repeatedAlerts: row.repeatedAlerts,
    suppressedAlerts: row.suppressedAlerts, noisyKeys: row.noisyKeys, noisy,
    definition: 'Alerts with a trigger event accepted in the cohort range [from,to), suppressed alerts included. An alert repeats when it has more than one trigger in range; a source/service/key is noisy when it repeats or opens more than one alert generation in range. The 20 noisiest keys are listed; the counts cover all of them.'};
}
export type AlertNoise = Awaited<ReturnType<typeof alertNoise>>;
