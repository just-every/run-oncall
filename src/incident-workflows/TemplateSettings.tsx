import { useState } from 'react';
import { Field, Form } from '../forms';
import type { Member, Service, State } from '../family/response-operations/domain';
import type { IncidentTemplate } from './types-template';
import './workflows.css';

type Props = { state: State; service: Service; member: Member; send: (command: any) => Promise<any> };
const severities = ['critical', 'warning', 'info'] as const;

export function ServiceTemplateSettings({ state, service, member, send }: Props) {
  const [editing, setEditing] = useState(false);
  const versions = service.incidentTemplates ?? [];
  const current = versions.at(-1);
  const name = (id: string) => state.members.find(m => m.id === id)?.name ?? 'Erased member';
  return <section className="response-controls incident-workflows" aria-label={`Response template for ${service.name}`}>
    <h3>Incident response template</h3>
    {current ? <>
      <p>Version {current.version} · published by {name(current.by)} · {new Date(current.at).toLocaleString()}</p>
      <dl className="response-roles">{severities.map(severity => <div key={severity}><dt>{severity}</dt><dd>{current.severityWording[severity]}</dd></div>)}</dl>
      <p>Impact prompt: {current.impactPrompt}</p>
      <p>Incident types: {current.incidentTypes.length ? current.incidentTypes.join(', ') : 'None'}</p>
      {current.checklist.length > 0 && <ol className="workflow-history">{current.checklist.map(item => <li key={item.id}>{item.text}</li>)}</ol>}
    </> : <p>No response template is published. Incident declaration keeps its current defaults.</p>}
    <p className="workflow-help">Published versions are retained. New incidents copy the current version; existing incidents keep their snapshot.</p>
    {member.active && member.role === 'admin' && !member.machine && <>
      <button type="button" disabled={versions.length >= 100 && !editing} onClick={() => setEditing(value => !value)}>{editing ? 'Cancel template edit' : current ? 'Edit response template' : 'Create response template'}</button>
      {editing && <TemplateEditor service={service} initial={current} send={send} saved={() => setEditing(false)} />}
      {versions.length >= 100 && <p>The service has reached its 100 retained template versions.</p>}
    </>}
    {versions.length > 0 && <details><summary>Published template history</summary>
      {[...versions].reverse().map(version => <details key={version.version}>
        <summary>Version {version.version} · {new Date(version.at).toLocaleString()}</summary>
        <p>Published by {name(version.by)}. {version.reason}</p>
        <dl className="response-roles">{severities.map(severity => <div key={severity}><dt>{severity}</dt><dd>{version.severityWording[severity]}</dd></div>)}</dl>
        <p>Impact prompt: {version.impactPrompt}</p><p>Incident types: {version.incidentTypes.join(', ') || 'None'}</p>
        {version.checklist.length > 0 && <ol className="workflow-history">{version.checklist.map(item => <li key={item.id}>{item.text}</li>)}</ol>}
      </details>)}
    </details>}
  </section>;
}

function TemplateEditor({ service, initial, send, saved }: { service: Service; initial?: IncidentTemplate; send: Props['send']; saved: () => void }) {
  const [baseVersion] = useState(initial?.version ?? 0);
  const [checklist, setChecklist] = useState(initial?.checklist.map(item => ({ ...item })) ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const latest = service.incidentTemplates?.at(-1)?.version ?? 0;
  return <>
    <p>Editing from version {baseVersion}.</p>
    {latest !== baseVersion && <p role="alert">A newer version was published while you were editing. Cancel and reopen to use it; this draft cannot overwrite it.</p>}
    <Form busy={busy} label="Publish response template" onSubmit={async data => {
      setBusy(true);
      setError('');
      try {
        const result = await send({ type: 'service-template', service: service.id, baseVersion,
          severityWording: { critical: data.critical, warning: data.warning, info: data.info },
          impactPrompt: data.impactPrompt,
          incidentTypes: data.incidentTypes.split('\n').map((value: string) => value.trim()).filter(Boolean),
          checklist, reason: data.reason });
        if (result) saved();
        else setError('Template was not published. Check the workspace error before trying again.');
        return result;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Template could not be published.');
        return null;
      } finally { setBusy(false); }
    }}>
      <div className="workflow-template-editor">
        {severities.map(severity => <label className="field" key={severity}><span>{severity[0].toUpperCase() + severity.slice(1)} severity wording</span>
          <input name={severity} required maxLength={300} defaultValue={initial?.severityWording[severity] ?? severity} />
        </label>)}
        <label className="field"><span>Impact prompt</span><textarea aria-label="Impact prompt" name="impactPrompt" required maxLength={1000} rows={3} defaultValue={initial?.impactPrompt ?? 'What is affected?'} /></label>
        <Field name="incidentTypes" label="Incident types (one per line)" type="textarea" required={false} value={initial?.incidentTypes.join('\n') ?? ''} help="Up to 20 types, each up to 100 characters." />
        <fieldset><legend>Response checklist</legend>
          {checklist.map((item, index) => <div className="workflow-template-row" key={item.id}>
            <label className="field"><span>Checklist item {index + 1}</span><input required maxLength={500} value={item.text}
              onChange={e => setChecklist(items => items.map(value => value.id === item.id ? { ...value, text: e.target.value } : value))} /></label>
            <button type="button" aria-label={`Remove checklist item ${index + 1}`} onClick={() => setChecklist(items => items.filter(value => value.id !== item.id))}>Remove</button>
          </div>)}
          <button type="button" disabled={checklist.length >= 30} onClick={() => setChecklist(items => [...items, { id: crypto.randomUUID(), text: '' }])}>Add checklist item</button>
        </fieldset>
        <label className="field"><span>Reason for template change</span><textarea aria-label="Reason for template change" name="reason" required maxLength={3000} rows={3} /></label>
      </div>
    </Form>
    {error && <p role="alert">{error}</p>}
  </>;
}
