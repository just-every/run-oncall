import type { Entry, Incident } from '../family/response-operations/domain.ts';

export type IncidentRelationAttribution = { by: string; at: string; reason: string };
export type IncidentRelations = {
  mergedInto?: IncidentRelationAttribution & { target: string };
  /** Direct retained aliases; nested merges remain on their original sources. */
  mergedSources?: string[];
  splitFrom?: IncidentRelationAttribution & { incident: string; alerts: string[] };
};
export type RelatedIncident = Incident & IncidentRelations;
export type RetainedTimelineEntry = Entry & { sourceIncident?: string };
