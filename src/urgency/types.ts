export type Urgency = 'high' | 'low';
export type UrgencyWindow = {day: number; start: string; end: string};
export type UrgencyRule = {
  version: number;
  mode: Urgency | 'severity' | 'support-hours';
  timezone: string;
  weekly: UrgencyWindow[];
  holidays: string[];
  inside: Urgency;
  outside: Urgency;
  reason: string;
  by: string;
  at: string;
};
export type UrgencyDecision = {
  urgency: Urgency;
  version: number;
  reason: string;
  evaluatedAt: string;
  rule: UrgencyRule | null;
};
export type AlertUrgencyEntry = {
  id: string;
  at: string;
  by: string;
  from: Urgency | null;
  to: Urgency;
  reason: string;
  ruleVersion: number | null;
};
export type UrgencyDraft = Omit<UrgencyRule, 'version' | 'by' | 'at'>;
