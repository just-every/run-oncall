import type {IncidentTemplate} from '../../incident-workflows/types-template';
export type TemplateDraft = Pick<IncidentTemplate, 'severityWording' | 'impactPrompt' | 'incidentTypes' | 'checklist'>;
const severities = ['critical', 'warning', 'info'] as const;
export function TemplateFields({value, change, readOnly = false}: {value: TemplateDraft; change: (value: TemplateDraft) => void; readOnly?: boolean}) {
  if (readOnly) return <div className="service-readonly"><dl>{severities.map(severity => <div key={severity}><dt>{severity[0].toUpperCase()+severity.slice(1)}</dt><dd>{value.severityWording[severity]}</dd></div>)}<dt>Impact prompt</dt><dd>{value.impactPrompt}</dd><dt>Incident types</dt><dd>{value.incidentTypes.join(', ') || 'None'}</dd></dl><ol>{value.checklist.map(item => <li key={item.id}>{item.text}</li>)}</ol></div>;
  return <fieldset disabled={readOnly} className="workflow-template-editor">
    {severities.map(severity => <label className="field" key={severity}><span>{severity[0].toUpperCase() + severity.slice(1)} severity wording</span><input required maxLength={300} value={value.severityWording[severity]} onChange={event => change({...value, severityWording: {...value.severityWording, [severity]: event.target.value}})}/></label>)}
    <label className="field">Impact prompt<textarea aria-label="Impact prompt" required maxLength={1000} rows={3} value={value.impactPrompt} onChange={event => change({...value, impactPrompt: event.target.value})}/></label>
    <label className="field">Incident types (one per line)<textarea aria-label="Incident types (one per line)" rows={3} value={value.incidentTypes.join('\n')} onChange={event => change({...value, incidentTypes: event.target.value.split('\n')})}/></label>
    <fieldset><legend>Response checklist</legend>
      {value.checklist.map((item, index) => <div className="workflow-template-row" key={item.id}><label className="field"><span>Checklist item {index + 1}</span><input required maxLength={500} value={item.text} onChange={event => change({...value, checklist: value.checklist.map(row => row.id === item.id ? {...row, text: event.target.value} : row)})}/></label>{!readOnly && <button type="button" onClick={() => change({...value, checklist: value.checklist.filter(row => row.id !== item.id)})}>Remove item {index + 1}</button>}</div>)}
      {!readOnly && <button type="button" disabled={value.checklist.length >= 30} onClick={() => change({...value, checklist: [...value.checklist, {id: crypto.randomUUID(), text: ''}]})}>Add checklist item</button>}
    </fieldset>
  </fieldset>;
}
