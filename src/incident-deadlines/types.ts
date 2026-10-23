import type {RecordedResponseObligation} from '../alert-obligation';
export type AckTimeout = {version:number;minutes:number;by:string;at:string};
export type IncidentDeadline = {
 id:string;kind:'snooze'|'acknowledgment-timeout';state:'pending'|'fired'|'cancelled'|'held';
 actor:string;createdAt:string;dueAt:string;minutes:number;level:0|1|null;policyVersion:number;
 endedAt:string|null;outcome:string;obligation:RecordedResponseObligation|null;
};
