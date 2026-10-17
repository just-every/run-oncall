export type CompatibleProvider = 'pagerduty-v2' | 'pagerduty-v1' | 'opsgenie' | 'splunk';

export type CompatibleInput = {
  action: 'trigger' | 'recover' | 'acknowledge' | 'note';
  key: string;
  title: string;
  severity: 'critical' | 'warning' | 'info';
  priority: 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | null;
  observedAt: string | null;
  sender: string;
  links: string[];
  details: Record<string, unknown>;
  truncated: boolean;
};

export type CompatibleOptions = {
  alias?: string;
  action?: 'recover' | 'acknowledge' | 'note';
  routingKey?: string;
  secret?: string;
};
