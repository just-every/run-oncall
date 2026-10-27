import type {Service} from '../family/response-operations/domain';
import type {IntakeRun} from '../intake/CompatibleTest';
import {addPath} from './catalog';
/** Kept for installs opening the old panel while the Settings shell rolls out. */
export function MonitoringIngress(_props:{admin:boolean;services:Service[];busy:boolean;run:IntakeRun}) {
 return <section className="panel padded integrations"><h2>Events API</h2><a className="integration-link" href={addPath('events')}>Add Events API source</a></section>;
}
