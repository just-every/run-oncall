import type {IntakeSource} from './model';
export type CompatibleIntakeSource=IntakeSource&{provider:'pagerduty'|'opsgenie'|'splunk'};
export type IntakeRun=(path:string|(()=>Promise<any>),data?:any,message?:string)=>Promise<any>;
export {SourceTest as CompatibleTest} from '../integrations/SourceTest';
