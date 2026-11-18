import type {Alert, Service} from '../family/response-operations/domain';
import type {IntakeRun} from '../intake/CompatibleTest';
import type {SourceRecord} from './catalog';
import {RequestExample} from './RequestExample';
import {ProviderRequest} from './ProviderRequest';
import {TestAlert} from './TestAlert';
export function SourceTest({source, service, busy, run, alerts = []}: {source: SourceRecord; service: Service; busy: boolean; run: IntakeRun; alerts?: (Alert & {title?: string})[]}) {
  if (source.kind === 'email' || source.kind === 'changes') return <TestAlert services={[service]} busy={busy} run={run} />;
  return <>
    {source.active && <TestAlert services={[service]} source={source.id} alerts={alerts} busy={busy} run={run} advanced />}
    <details><summary>Details</summary>{source.kind === 'events' ? <RequestExample source={source.id.slice(source.id.indexOf(':') + 1)} service={service} mode={source.native?.authentication || 'bearer'} /> : <ProviderRequest key={source.id} source={source} service={service} />}</details>
  </>;
}
