export type MonitoringProvider = 'alertmanager' | 'grafana' | 'datadog';

export type MonitoringEvent = {
  eventId: string;
  key: string;
  generation: string;
  intent: 'trigger' | 'recover';
  title: string;
  severity: 'critical' | 'warning' | 'info';
  observedAt: string;
  details: Record<string, unknown>;
  links: string[];
  routingInput: Record<string, unknown>;
  truncated: boolean;
};

export type MonitoringResult = {
  events: MonitoringEvent[];
  dropped: number | null;
  truncated: boolean;
  diagnostics: string[];
};

export type MonitoringMetadata = {eventId:string;sourceGeneration:string};
export type IncompleteEvidence = {bytes:number;sha256:string;readableIds:string[];dropped:number|null;unreadBytes:number;diagnostics:string[]};
