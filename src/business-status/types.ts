import type { StatusNoticeObligation } from '../alert-obligation.ts';
export type InternalStatus = 'operational' | 'degraded' | 'major outage';
export type StatusOverride = { value: InternalStatus; reason: string; by: string; at: string };
export type StatusSubscription = { member: string; channel: 'email' | 'push' | 'chat'; active: boolean; by: string; at: string };
export type EmailListSubscriber={id:string;category:'email-list';address:string;channel:'email';active:boolean;by:string;at:string};
export type BusinessService = {
  id: string; name: string; owningTeam: string; supporting: string[]; communicationsOwner: string;
  audience: string[]; highUrgencyImpact: boolean; active: boolean; revision: number;
  derived: InternalStatus; impactRevision: number; override: StatusOverride | null;
  emailLists?:EmailListSubscriber[];
  subscriptions: StatusSubscription[]; notices: StatusNoticeObligation[];
};
