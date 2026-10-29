import type { RecordedResponseObligation } from '../alert-obligation';
export type AssignmentRule = {version:number;mode:'repeat'|'escalate';minutes:number;policy:string;by:string;at:string};
export type ResponderRequest = {id:string;requester:string;message:string;at:string;status:'pending'|'accepted'|'declined'|'cancelled'|'ended'|'held';response:{by:string;at:string}|null;obligation:RecordedResponseObligation;notice:RecordedResponseObligation|null};
export type ManualPage = {erasedCreator?:true;erasedAcknowledgment?:true;creator:string;operation:string;fingerprint:string;description:string;assignment:AssignmentRule;obligations:RecordedResponseObligation[];acknowledgment:{by:string;at:string;kind?:'agent'}|null};
export type ResponseTarget = {kind:'user'|'policy'|'service';id:string;policyRevision?:number};
