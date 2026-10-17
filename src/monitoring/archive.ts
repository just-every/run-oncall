import { fail, type State } from '../family/response-operations/domain.ts';
import type { IntakeReceipt, IntakeSource } from '../intake/model.ts';
import { exact } from '../routing/definition.ts';
import type { MonitoringProvider } from './types.ts';
const monitoringProviders:MonitoringProvider[]=['alertmanager','grafana','datadog'];
const count=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>=0;
export function validateMonitoringReceipt(state:State,source:IntakeSource,receipt:IntakeReceipt) {
  const monitoring=monitoringProviders.includes(receipt.provider as MonitoringProvider);
  if(monitoring&&!receipt.monitoring&&!receipt.incomplete)fail('Missing monitoring receipt identity');
  if(receipt.monitoring!==undefined) {
    exact(receipt.monitoring,['eventId','sourceGeneration']);
    const metadata=receipt.monitoring;
    if(!monitoring||typeof metadata.eventId!=='string'||!new RegExp('^'+receipt.provider+':[a-f0-9]{64}$').test(metadata.eventId)||typeof metadata.sourceGeneration!=='string'||!metadata.sourceGeneration.length||metadata.sourceGeneration.length>200||receipt.generation!==null&&metadata.sourceGeneration!==receipt.generation||!['trigger','recover'].includes(receipt.action)||receipt.action==='recover'&&receipt.outcome!=='unrouted'&&receipt.outcome!=='recovered')fail('Invalid monitoring source generation');
    if(state.intakeReceipts?.some(r=>r!==receipt&&r.source===source.id&&r.service===receipt.service&&!r.routing?.readmission&&!receipt.routing?.readmission&&r.monitoring?.eventId===metadata.eventId))fail('Duplicate monitoring receipt identity');
  }
  if(receipt.incomplete!==undefined) {
    const evidence=receipt.incomplete;exact(evidence,['bytes','sha256','readableIds','dropped','unreadBytes','diagnostics']);
    if(!count(evidence.bytes)||typeof evidence.sha256!=='string'||!/^[a-f0-9]{64}$/.test(evidence.sha256)||!count(evidence.unreadBytes)||evidence.unreadBytes>evidence.bytes||evidence.dropped!==null&&!count(evidence.dropped)||!Array.isArray(evidence.readableIds)||evidence.readableIds.length>64||new Set(evidence.readableIds).size!==evidence.readableIds.length||evidence.readableIds.some(v=>typeof v!=='string'||!v.length||v.length>200)||!Array.isArray(evidence.diagnostics)||evidence.diagnostics.length>30||evidence.diagnostics.some(v=>typeof v!=='string'||v.length>500)||receipt.action!=='trigger'||receipt.severity!=='critical'||!receipt.truncated||receipt.key!=='incomplete:'+evidence.sha256||receipt.generation!==null&&receipt.generation!=='incomplete:'+evidence.sha256||JSON.stringify(receipt.details.incomplete)!==JSON.stringify(evidence))fail('Invalid incomplete intake evidence');
    if(receipt.monitoring!==undefined)fail('Incomplete intake has a request identity, not a provider alert identity');
    if(state.intakeReceipts?.some(r=>r!==receipt&&r.source===source.id&&r.service===receipt.service&&!r.routing?.readmission&&!receipt.routing?.readmission&&r.incomplete?.sha256===evidence.sha256))fail('Duplicate incomplete intake identity');
  }
}
