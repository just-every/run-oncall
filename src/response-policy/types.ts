export type ResponseMode = 'alert-only' | 'incident';
export type RecoveredNoticeMode = 'silent' | 'notified';
export type ResponseRule = {
  id: string;
  urgency: '*' | 'high' | 'low';
  severity: '*' | 'critical' | 'warning' | 'info';
  policy: string;
  mode: ResponseMode;
};
export type ResponsePolicy = {
  version: number;
  by: string;
  at: string;
  defaultMode: ResponseMode;
  recoveredNotice: RecoveredNoticeMode;
  rules: ResponseRule[];
  reason: string;
};
export type ResponseDecision = {
  version: number;
  mode: ResponseMode;
  recoveredNotice: RecoveredNoticeMode;
  rule: string | null;
};
export type RecoveryNotice = {
  state: 'recorded' | 'silent';
  automatic: false;
  label: 'no sender until OC-026';
  mode: RecoveredNoticeMode;
  recipients: string[];
};
export type AutomaticDeclaration = {
  alert: string;
  event: string;
  receipt: string;
  policyVersion: number;
  rule: string | null;
  by: string;
};
export type IncidentSourceRecovery = {
  at: string;
  receipt: string | null;
  reminder: {
    id: string;
    commander: string | null;
    automatic: false;
    label: 'no timer until OC-027';
    state: 'recorded' | 'completed';
  };
};
