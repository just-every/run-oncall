export type TemplateChecklistItem = { id: string; text: string };
export type TemplateCheck = { id: string; by: string; at: string; done: boolean };
export type IncidentTemplate = {
  version: number;
  by: string;
  at: string;
  reason: string;
  severityWording: { critical: string; warning: string; info: string };
  impactPrompt: string;
  incidentTypes: string[];
  checklist: TemplateChecklistItem[];
};
export type TemplateSnapshot = Omit<IncidentTemplate, 'checklist'> & {
  service: string;
  incidentType: string | null;
  checklist: (TemplateChecklistItem & { done: boolean; history: TemplateCheck[] })[];
};
