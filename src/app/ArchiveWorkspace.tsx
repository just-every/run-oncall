import { useLayoutEffect, useRef, useState } from 'react';
import { Field, Form } from '../forms';
import { request } from '../useWorkspace';
import type { AnyRecoveryCheckpoint } from '../family/response-operations/recovery-v2';
import type { Member, State } from '../family/response-operations/domain';

export function ArchiveWorkspace({ state, actor, busy, run, setError, setNotice, onRestored }: {
  state: State; actor: Member; busy: boolean;
  run: (path: string, data: unknown, success?: string) => Promise<any>;
  setError: (message: string) => void; setNotice: (message: string) => void; onRestored: () => void;
}) {
  const [archive, setArchive] = useState<State | null>(null);
  const [checkpoint, setCheckpoint] = useState<AnyRecoveryCheckpoint | null>(null);
  const [mapping, setMapping] = useState('');
  const [restored, setRestored] = useState(false);
  const outcome = useRef<HTMLParagraphElement>(null);
  // The outcome takes the form's place where Replace was pressed; keep it in view wherever the page was scrolled.
  useLayoutEffect(() => { if (restored) outcome.current?.scrollIntoView({ block: 'nearest' }); }, [restored]);
  const empty = !state.services.length && !state.incidents.length && !state.events.length && state.members.length === 1;
  const needsMapping = archive && !archive.members.some(member => member.id === actor.id && member.active && member.role === 'admin');
  const blocked = !!needsMapping && !empty;
  async function download() {
    try {
      const value: AnyRecoveryCheckpoint = await request('/api/recovery/checkpoint');
      const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `oncall-backup-${value.capturedAt.slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url);
      setNotice('Backup downloaded');
    } catch (error) { setError((error as Error).message); }
  }
  return <section className="panel padded">
    <h2>Back up your workspace</h2>
    {actor.role !== 'admin' ? <p>Ask an administrator to download or restore a backup.</p> : <>
      <p>Your backup includes alerts, incidents, rotas, overrides, contact methods and prepared updates. Passwords, sign-in sessions and private integration keys are excluded.</p>
      <button className="primary" onClick={download}>Download full backup</button>
      <details className="archive-restore"><summary>Restore a backup</summary>
      <p>Restore replaces your saved workspace records. Active notification work is paused and prepared updates need review again. Other sessions, source credentials and other member passwords are removed.
        Compatible and change integrations become inactive until their keys are configured again. Your current sign-in remains the only authenticated authority. An archive from another installation
        needs explicit administrator mapping, and the target must have only its initial administrator and no services, incidents or events.</p>
      <details open={blocked}>
        <summary>Move a local archive to hosting</summary>
        <ol>
          <li>On the local app, open Archive and press <strong>Download full backup</strong>. Keep the JSON file private.</li>
          <li>Export anything you need from this hosted workspace first. A workspace that already has records cannot accept another installation's administrator identity.</li>
          <li>In your hosting checkout, deploy a new, unused environment name using your private credentials file:
            <pre>~/.local/bin/rer deploy --environment move-in --env-file "$HOME/.config/oncall/production.env"</pre>
            Use a name other than <code>move-in</code> if it already exists. <a href="/docs/install#host-for-your-team">Install and run</a> explains how to prepare the owner and credentials file.</li>
          <li>Open the new app address, sign in as its configured owner and finish setup. Before creating services or team members, open Archive, choose the local JSON, select the archived administrator, type <code>REPLACE</code> and press <strong>Replace workspace with this archive</strong>.</li>
          <li>After “Restored”, reset the other team members' passwords and recreate monitoring source keys. Your full backup restores rotas and overrides too. Older alerts-and-incidents archives do not include them. Check Incidents and Team before using the new address.</li>
        </ol>
        <p>Deployment does not upload local records. The <code>.rer</code> installation archive and <code>~/.local/bin/rer import</code> restore local installations only; this screen takes the JSON backup downloaded here. Your existing hosted environment stays available.</p>
      </details>
      <label className="field">Choose backup file<input type="file" accept="application/json,.json" onChange={async event => {
        setRestored(false);
        try {
          const file = event.target.files?.[0]; if (!file) return;
          if (file.size > 1000000 + 5 * 1024 * 1024 + 1024) throw Error('This backup is too large to restore here.');
          const value = JSON.parse(await file.text());
          const full = value.kind === 'oncall-recovery-checkpoint';
          const records = full ? value.coordination : value;
          if (!Array.isArray(records?.members) || full && !Array.isArray(value.paging?.schedules)) throw Error('Choose the JSON backup downloaded from this page.');
          setCheckpoint(full ? value : null); setArchive(records); setMapping(''); setError('');
        } catch (error) { setError((error as Error).message); setArchive(null); setCheckpoint(null); }
      }} /></label>
      {archive && <div className="restore-preview">
        <p>Replacement: {archive.services?.length ?? '?'} services · {archive.incidents?.length ?? '?'} incidents · {archive.events?.length ?? '?'} events · {archive.intakeReceipts?.length ?? 0} monitoring receipts{checkpoint ? ` · ${checkpoint.paging.schedules.length} rotas` : ' · rotas are not included in this older archive'}</p>
        {blocked ? <p role="alert">This archive belongs to another installation, and this workspace already has records or additional members. Nothing has been replaced. Follow “Move a local archive to hosting” above to restore into a new empty environment.</p> : <>
          {needsMapping && <label className="field">Map current sign-in to archive administrator<select value={mapping} onChange={event => setMapping(event.target.value)}>
            <option value="">Choose explicitly</option>
            {archive.members.filter(member => member.active && member.role === 'admin').map(member => <option key={member.id} value={member.id}>{member.name} · {member.id}</option>)}
          </select></label>}
          <Form busy={busy} disabled={!!needsMapping && !mapping} label="Replace workspace with this archive" onSubmit={async data => {
            if (data.confirm !== 'REPLACE') { setError('Type REPLACE to confirm replacement'); return null; }
            const result = checkpoint
              ? await run('/api/recovery/restore', { mode: 'replace', checkpoint, adminMapping: mapping }, '')
              : await run('/api/restore', { mode: 'replace', archive, adminMapping: mapping }, '');
            if (result) { setArchive(null); setCheckpoint(null); onRestored(); setRestored(true); }
            return result;
          }}><Field name="confirm" label="Type REPLACE to confirm" /></Form>
        </>}
      </div>}
      {restored && <p role="status" ref={outcome}>Restored. Reset other passwords and recreate source keys.</p>}
      </details>
    </>}
  </section>;
}
