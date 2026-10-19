import type { ProjectedReport } from './load.ts';

function cell(value: unknown): string {
  let text = value == null ? '' : String(value);
  if (/^[\s\u0000-\u001f]*[=+@-]/u.test(text) || /^[\t\r\n]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function exportResponseCsv(report: ProjectedReport): string {
  const metrics = ['mtta', 'mttr', 'recovery', 'sourceRecovery'] as const;
  const fields = ['status', 'seconds', 'sourceEntryId', 'sourceAt', 'sourceKind', 'reason', 'evidence'] as const;
  const metadata = [report.revision, report.load.schedulingRevision, report.generatedAt, report.cohort.from, report.cohort.to,
    report.cohort.service, report.cohort.observationAt, report.cohort.count, report.cohort.unassignableDeclarations];
  const incidentHeader = ['incidentId', 'title', 'serviceId', 'serviceName', 'state', 'severity', 'incidentRevision', 'declaredAt', 'drilldown',
    ...metrics.flatMap(metric => fields.map(field => `${metric}.${field}`))];
  const loadHeader = ['loadSubjectId', 'loadSubjectName', 'scheduledPrimarySeconds', 'scheduledBackupSeconds', 'uncoveredPrimarySeconds',
    'loadIncidents', 'loadAcknowledgements', 'acknowledgementsOutsideCoverage', 'per24PrimaryHours', 'acknowledgementShare', 'primaryHourShare', 'loadToCoverage'];
  const noiseHeader = ['noiseSource', 'noiseKey', 'noiseTitle', 'noiseAlerts', 'noiseTriggers', 'noiseSuppressed', 'noiseActive'];
  const header = ['recordType', 'revision', 'schedulingRevision', 'generatedAt', 'cohortFrom', 'cohortTo', 'cohortService', 'observationAt', 'cohortCount',
    'unassignableDeclarations', ...incidentHeader, ...loadHeader, ...noiseHeader];
  const blankIncident = Array<string>(incidentHeader.length).fill(''), blankLoad = Array<string>(loadHeader.length).fill(''), blankNoise = Array<string>(noiseHeader.length).fill('');
  const rows = [
    ...report.incidents.map(i => ['incident', ...metadata, i.id, i.title, i.service, i.serviceName, i.state, i.severity,
      i.incidentRevision, i.declaredAt, i.href, ...metrics.flatMap(metric => fields.map(field => i[metric][field])), ...blankLoad, ...blankNoise]),
    ...report.load.responders.map(r => ['responder-load', ...metadata, ...blankIncident, r.member, r.name, r.primarySeconds, r.backupSeconds, null,
      null, r.acknowledgements, r.outsideCoverage, r.per24PrimaryHours, r.acknowledgementShare, r.primaryShare, r.loadToCoverage, ...blankNoise]),
    ...report.load.services.map(s => ['service-load', ...metadata, ...blankIncident, s.service, s.name, s.primarySeconds, null, s.uncoveredPrimarySeconds,
      s.incidents, s.acknowledgements, null, s.per24PrimaryHours, null, null, null, ...blankNoise]),
    ...report.noise.noisy.map(k => ['noisy-key', ...metadata, ...blankIncident, k.service, null, ...Array<string>(loadHeader.length - 2).fill(''),
      k.source, k.key, k.title, k.alerts, k.triggers, k.suppressed, k.active]),
  ];
  if (!rows.length) rows.push(['cohort', ...metadata, ...blankIncident, ...blankLoad, ...blankNoise]);
  return [header, ...rows].map(row => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
