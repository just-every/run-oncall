import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {accessToken, autonomousPolicy, heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';
import {agentEffectSnapshot, agentRuntime} from './agent-door-runtime.mjs';

/** Same production MCP and native approval doors as the specialist journey. */
export async function scheduleReplay(runtime) {
 const {tool,http,adopt}=runtime;
 const code=answer=>answer.result?._meta?.['com.runeditrun/error']?.code??answer.body?.error?.data?.code;
 const snapshot=async()=>({workspace:await (await http('/api/state')).json(),paging:await (await http('/api/paging/archive')).json()});
 const held=autonomousPolicy();
 held.rules.unshift(...['sensitive','live'].map(risk=>({id:'schedule-'+risk,class:risk,do:'approval',approver:['sponsor'],wait:'PT1H'})));
 const source=(await tool('oncall.schedules.read',{id:'agent-schedule'})).result.structuredContent.schedules[0];
 const scheduleId=randomUUID();
 assert.equal((await http('/api/paging/schedules',{...source,id:scheduleId,name:'Receipt coordination rota',revision:0})).status,200);
 let last;
 for(const operation of ['update','override']) {
  assert.equal((await adopt()).status,200);
  const schedule=(await tool('oncall.schedules.read',{id:scheduleId})).result.structuredContent.schedules[0];
  const from=Date.now(),to=from+3600000;
  const proposal={...schedule,name:'Payments reviewed receipt rota'};
  const review=operation==='update'?(await tool('oncall.schedules.review',{id:schedule.id,revision:schedule.revision,schedule:proposal,from,to})).result.structuredContent:null;
  const args={id:schedule.id,revision:schedule.revision,expected_revision:schedule.revision,idempotency_key:randomUUID(),
   ...(review?{schedule:proposal,from,to,digest:review.digest}:{override:{id:randomUUID(),role:'primary',start:new Date(from+60000).toISOString(),end:new Date(to).toISOString(),member:null}})};
  const name='oncall.schedules.'+operation;
  assert.equal((await adopt(held)).status,200);
  const pending=await tool(name,args),approval=pending.result?._meta?.['com.runeditrun/approval'];
  assert.ok(approval,JSON.stringify(pending.body));
  const saved=(await (await http('/agents/api/approvals/'+approval.id)).json()).approval;
  const approved=await http('/agents/api/approvals/'+approval.id+'/approve',{revision:saved.revision,summary_sha256:saved.summary_sha256});
  assert.equal((await approved.json()).approval.state,'executed');
  const once=await snapshot(),first=await tool(name,args),again=await tool(name,args);
  assert.equal(first.result?.isError,false,JSON.stringify(first.body));
  assert.ok(first.result._meta['com.runeditrun/receipt']);
  assert.equal(first.result.structuredContent.schedule.revision,schedule.revision+1);
  assert.deepEqual(again.result.structuredContent,first.result.structuredContent);
  assert.deepEqual(await snapshot(),once,'Exact receipt replay has no second native effect');
  assert.equal(code(await tool(name,{...args,idempotency_key:randomUUID()})),'revision_conflict','A new key cannot reuse consumed review/revision evidence');
  assert.equal(code(await tool(name,{...args,revision:schedule.revision+1})),'idempotency_conflict');
  assert.equal(code(await tool(name,args,{scope:'incidents:read'})),'insufficient_scope');
  assert.equal((await http('/agents/api/pause',{paused:true})).status,200);
  const paused=await tool(name,args);assert.equal(code(paused),'agents_paused');assert.equal(paused.result.structuredContent,undefined);
  assert.equal((await http('/agents/api/pause',{paused:false})).status,200);
  assert.deepEqual(await snapshot(),once,'Refused retries preserve the committed native effect');
  last={name,args};
 }
 // A cached approval never supplies native role authority after demotion.
 const owner=(await (await http('/api/workspace')).json()).member,password=randomBytes(32).toString('hex');
 const other=await (await http('/api/members',{name:'Receipt authority administrator',role:'admin',password})).json();
 const changedWorkspace=await tool(last.name,last.args);
 assert.equal(code(changedWorkspace),'revision_conflict');assert.equal(changedWorkspace.result.structuredContent,undefined);
 const login=await http('/api/login',{name:other.name,password});
 assert.equal(login.status,200);
 const cookie=login.headers.getSetCookie().map(value=>value.split(';',1)[0]).join('; ');await login.body?.cancel();
 assert.equal((await http('/api/command',{type:'member',id:owner.id,role:'viewer',active:true})).status,200);
 const demoted=await tool(last.name,last.args);assert.equal(demoted.status,401);assert.equal(demoted.result?.structuredContent,undefined);
 const restore=await runtime.request(runtime.origin+'/api/command',{method:'POST',headers:{Origin:runtime.origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({type:'member',id:owner.id,role:'admin',active:true})});
 assert.equal(restore.status,200);await restore.body?.cancel();
 assert.equal((await adopt()).status,200);
 console.log('PASS held schedule receipts: update/override replay once; exact review/revision, changed key/arguments, scopes, Pause and current native role remain fenced');
}

/** A scoped override reports the current rota revision before claiming approval or write custody. */
export async function staleOverrideRevision(runtime, {optionalExpectedRevision = false} = {}) {
  const {db, http, tool, adopt, context} = runtime;
  const read = async (path, input, status = 200) => {
    const response = await http(path, input);
    assert.equal(response.status, status, path);
    return response.json();
  };
  const name = 'oncall.schedules.override';
  const fixture = optionalExpectedRevision ? ' optional' : '';
  const credential = 'synthetic-oncall-' + randomUUID();
  const client = await read('/api/automation/clients', {
    name: 'Scoped rota revision client' + fixture, key: credential, services: ['agent-service'],
    permissions: ['schedules:read', 'schedules:write'],
  }, 201);
  const agent = 'oncall-client:' + client.id;
  const sponsor = (await read('/api/workspace')).member;
  const call = args => tool(name, args, {}, credential);
  const snapshot = () => agentEffectSnapshot(runtime);
  const paging = () => read('/api/paging/state');
  const audit = async () => (await db.prepare('SELECT * FROM agent_door_audit ORDER BY sequence').all()).results;
  const source = (await paging()).schedules.find(row => row.id === 'agent-schedule');
  // Admit the scoped credential before taking snapshots of its identity and authority.
  const admitted = await tool('oncall.schedules.read', {id: source.id}, {}, credential);
  assert.equal(admitted.result.isError, false);
  assert.deepEqual(admitted.result.structuredContent.schedules, [source]);
  const foreign = await read('/api/paging/schedules', {
    ...source, id: randomUUID(), name: 'Private inventory rota' + fixture, service: 'agent-foreign-service', revision: 0,
  });
  const refusalDetails = ({status, body, result}) => {
    assert.equal(status, 200);
    assert.equal(body.error, undefined);
    assert.equal(result.isError, true);
    assert.equal(result.structuredContent, undefined);
    assert.equal(result._meta['com.runeditrun/approval'], undefined);
    assert.equal(result.content.length, 1);
    assert.equal(result.content[0].type, 'text');
    const details = result._meta['com.runeditrun/error'];
    assert.deepEqual(JSON.parse(result.content[0].text), details);
    return details;
  };

  const retained = [];
  for (const mode of ['autonomous', 'held']) {
    const policy = autonomousPolicy();
    if (mode === 'held') {
      policy.rules.unshift({id: 'rota-participant-approval', class: 'sensitive', do: 'approval', approver: ['sponsor'], wait: 'PT1H'});
    }
    const adoption = await adopt(policy);
    assert.equal(adoption.status, 200);
    await adoption.body?.cancel();

    const rota = await read('/api/paging/schedules', {
      ...source, id: randomUUID(), name: 'Payments coordination rota ' + mode + fixture, revision: 0,
    });
    const from = Math.floor(context.now() / 60000) * 60000 + 86400000;
    const to = from + 3600000;
    const holder = await read('/api/members', {
      name: 'Rota relief ' + mode + fixture, role: 'responder', password: 'synthetic-oncall-' + randomUUID(),
    }, 201);
    const override = {
      id: randomUUID(), role: 'primary', member: holder.id,
      start: new Date(from).toISOString(), end: new Date(to).toISOString(),
    };
    const edit = {schedule: {...rota, name: 'Payments retained rota ' + mode + fixture}, from, to};
    const path = '/api/schedules/' + rota.id;
    const review = await read(path + '/review', edit);
    const edited = (await read(path + '/apply', {...edit, digest: review.digest, confirmed: true})).schedule;
    assert.equal(edited.name, edit.schedule.name);
    assert.equal(edited.revision, rota.revision + 1);
    const input = {
      id: rota.id, revision: optionalExpectedRevision ? edited.revision : rota.revision,
      override, idempotency_key: randomUUID(),
      ...(optionalExpectedRevision ? {expected_revision: rota.revision} : {}),
    };
    assert.deepEqual(edited.overrides, []);
    const pagingBefore = await paging();
    assert.deepEqual(pagingBefore.schedules.find(row => row.id === rota.id), edited);
    assert.deepEqual(pagingBefore.schedules.find(row => row.id === foreign.id), foreign);
    const before = await snapshot();
    assert.ok(before.records.agent_door_calls.some(row => row.outcome), 'Compare populated original call and outcome custody');
    assert.ok(before.records.agent_door_approvals.length, 'Compare populated approval custody');
    assert.ok(before.records.oc_schedule_records.some(row => JSON.parse(row.data).kind === 'notice'), 'Compare retained schedule notices');
    const beforeAudit = await audit();

    const stale = refusalDetails(await call(input));
    assert.deepEqual(stale, {code: 'revision_conflict', current_revision: edited.revision});
    const hiddenInput = optionalExpectedRevision
      ? {...input, revision: foreign.revision, expected_revision: foreign.revision - 1}
      : {...input, revision: 0};
    const scopedOut = await call({...hiddenInput, id: foreign.id, idempotency_key: randomUUID()});
    const absent = await call({...hiddenInput, id: randomUUID(), idempotency_key: randomUUID()});
    assert.deepEqual(refusalDetails(scopedOut), {code: 'not_found'});
    assert.deepEqual(refusalDetails(absent), {code: 'not_found'});
    assert.deepEqual(absent.result, scopedOut.result);
    assert.deepEqual(await snapshot(), before, 'Refusals preserve native records, control revisions, notices, mutation audit, original calls and outcomes, approvals, reviews and paging');
    assert.deepEqual(await paging(), pagingBefore);
    const refused = await audit();
    assert.deepEqual(refused.slice(0, beforeAudit.length), beforeAudit);
    const refusals = refused.slice(beforeAudit.length).map(entry => JSON.parse(entry.row));
    assert.deepEqual(refusals.map(row => ({tool: row.tool, outcome: row.outcome, code: row.code, agent: row.agent.id})),
      [stale.code, 'not_found', 'not_found'].map(code => ({tool: name, outcome: 'refused', code, agent})));
    assert.equal(refusals[0].idempotency_key, input.idempotency_key);
    assert.deepEqual(refusals[0].resource, {kind: 'schedule', id: rota.id});
    assert.deepEqual(await runtime.outboundRequests(), []);

    const correctedRevision = optionalExpectedRevision ? 'expected_revision' : 'revision';
    const fresh = {...input, [correctedRevision]: stale.current_revision, idempotency_key: randomUUID()};
    const first = await call(fresh);
    assert.equal(first.status, 200);
    assert.equal(first.body.error, undefined);
    assert.equal(first.decision.disposition, mode === 'held' ? 'approval' : 'autonomous');
    let approvalId;
    if (mode === 'held') {
      assert.equal(first.result.resultType, 'input_required');
      const approval = first.result._meta['com.runeditrun/approval'];
      approvalId = approval.id;
      const approvalPath = '/agents/api/approvals/' + approvalId;
      const saved = (await read(approvalPath)).approval;
      assert.equal(saved.prepared_by.for.id, sponsor.id);
      assert.equal(saved.state, 'pending');
      const pending = await snapshot();
      assert.deepEqual(pending.application, before.application);
      for (const table of ['workspace_control', 'paging_control', 'paging_schedules', 'oc_schedule_records', 'oc_admin_audit', 'agent_door_reviews']) {
        assert.deepEqual(pending.records[table], before.records[table], 'Pending approval preserves ' + table);
      }
      assert.deepEqual(await paging(), pagingBefore);
      const approved = (await read(approvalPath + '/approve', {revision: saved.revision, summary_sha256: saved.summary_sha256})).approval;
      assert.equal(approved.state, 'executed');
      assert.deepEqual(approved.approvals.map(row => row.person), [sponsor.id]);
    } else {
      assert.equal(first.result.isError, false);
    }
    const once = await snapshot();
    const saved = {...edited, revision: edited.revision + 1, overrides: [override]};
    assert.deepEqual(await paging(), {
      ...pagingBefore, revision: pagingBefore.revision + 1, workspaceRevision: pagingBefore.workspaceRevision + 1,
      schedules: pagingBefore.schedules.map(row => row.id === rota.id ? saved : row),
    }, 'A single primary override changes just its rota and the two control revisions');
    const priorCommits = before.records.oc_admin_audit;
    const commits = once.records.oc_admin_audit;
    for (const record of priorCommits) assert.deepEqual(commits.find(row => row.id === record.id), record);
    const oldCommitIds = new Set(priorCommits.map(row => row.id));
    const addedCommits = commits.filter(row => !oldCommitIds.has(row.id));
    assert.equal(addedCommits.length, 1);
    const [commit] = addedCommits;
    assert.equal(commit.kind, 'agent-schedule-override');
    assert.equal(commit.outcome, 'accepted');
    assert.equal(commit.workspace_after, commit.workspace_before + 1);
    assert.equal(commit.paging_after, commit.paging_before + 1);
    const identities = once.records.oc_audit_identities;
    assert.equal(commit.actor, identities.find(row => row.kind === 'agent' && row.entity_id === agent).label);
    assert.equal(commit.subject, identities.find(row => row.kind === 'entity' && row.entity_id === rota.id).label);
    assert.equal(commit.source, identities.find(row => row.kind === 'member' && row.entity_id === sponsor.id).label);
    const approvals = once.records.agent_door_approvals;
    for (const prior of before.records.agent_door_approvals) assert.deepEqual(approvals.find(row => row.id === prior.id), prior);
    assert.equal(approvals.length, before.records.agent_door_approvals.length + Number(mode === 'held'));
    if (approvalId) assert.equal(approvals.find(row => row.id === approvalId).state, 'executed');
    assert.deepEqual(once.records.agent_door_reviews, before.records.agent_door_reviews);
    const effects = once.records.agent_door_calls.filter(row => row.agent === agent && row.key === fresh.idempotency_key);
    assert.equal(effects.length, 1);
    assert.equal(effects[0].state, 'done');
    const stored = JSON.parse(effects[0].outcome);
    const completed = mode === 'held' ? await call(fresh) : first;
    assert.equal(completed.result.isError, false);
    assert.deepEqual(completed.result.structuredContent.schedule, saved);
    assert.equal(stored.outcome, 'done');
    assert.deepEqual(stored.result, completed.result.structuredContent);
    assert.equal(stored.receipt?.approval_id, approvalId);
    const notices = once.records.oc_schedule_records.map(row => JSON.parse(row.data)).filter(row =>
      row.kind === 'notice' && row.data.key.startsWith(rota.id + ':' + saved.revision + ':'));
    assert.ok(notices.length > 0);
    assert.deepEqual(new Set(completed.result.structuredContent.notices), new Set(notices.map(row => row.id)));
    for (const notice of notices) {
      assert.equal(notice.data.obligation.paging, 'off');
      assert.equal(notice.data.obligation.automatic, false);
    }
    const replay = await call(fresh);
    assert.notEqual(replay.body.id, completed.body.id);
    assert.equal(replay.result.isError, false);
    assert.deepEqual(replay.result.structuredContent, completed.result.structuredContent);
    assert.deepEqual(replay.result._meta['com.runeditrun/receipt'], completed.result._meta['com.runeditrun/receipt']);
    assert.deepEqual(await snapshot(), once, 'Completed retrieval creates no additional effect, approval, review or call');
    assert.deepEqual(await runtime.outboundRequests(), []);
    console.log('PROBE BASE-AGENT-012 4 ' + mode + ': override native revision ' + input.revision +
      (optionalExpectedRevision ? ', stale expected_revision ' + input.expected_revision : ', no expected_revision') +
      ' -> revision_conflict, current_revision ' + stale.current_revision + ' in metadata and text; scoped-out and absent indistinguishable; fresh revision -> one native override and audit, ' +
      (mode === 'held' ? 'one exact sponsor approval' : 'autonomous') + '; replay unchanged; zero outbound requests');
    retained.push({mode, schedule: saved, holder: holder.name});
  }
  assert.equal((await adopt()).status, 200);
  return retained;
}

export function scheduleCreateArgs(rota, name) {
  return {schedule: {...rota, id: randomUUID(), name, revision: 0}, idempotency_key: randomUUID()};
}

/** A completed native rota creation is returned intact across a full day. */
export async function agedScheduleCreateRetention({observe = async () => {}} = {}) {
  // Native sessions also check SQLite's clock. Age the platform clock once
  // the real owner session exists, then renew the signed policy at each retry.
  const started = Math.floor(Date.now() / 1000) * 1000;
  const day = 86_400_000;
  for (const [mode, policy] of [['autonomous', autonomousPolicy()], ['held', heldPolicy()]]) {
    const runtime = await agentRuntime({clock: started});
    try {
      const {db, http, tool, context} = runtime;
      const name = 'oncall.schedules.create';
      const rows = async (sql, ...values) => (await db.prepare(sql).bind(...values).all()).results;
      const read = async (path, input) => {
        const response = await http(path, input);
        assert.equal(response.status, 200, path);
        return response.json();
      };
      const snapshot = () => agentEffectSnapshot(runtime);
      const audits = () => rows('SELECT * FROM agent_door_audit ORDER BY sequence');
      const relay = () => rows('SELECT * FROM agent_door_relay ORDER BY sequence');
      const permanent = () => rows('SELECT * FROM oc_admin_audit ORDER BY ordinal');
      const envelope = async () => JSON.parse((await db.prepare('SELECT envelope FROM agent_door_state WHERE id=1').first()).envelope);
      const policyAuthority = ({iat, exp, ...authority}) => authority;
      const token = () => accessToken(context, {scope: 'schedules:read schedules:write',
        act: {sub: context.agentId, name: 'Responder assistant', specialist: 'oncall-responder'}});
      const tokenClaims = value => JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString());
      const tokenAuthority = ({iat, exp, jti, ...authority}) => authority;
      const approvalPath = '/agents/api/approvals/';

      assert.equal((await runtime.adopt(policy)).status, 200);
      const signedPolicy = await envelope();
      const owner = (await read('/api/workspace')).member;
      const initialPaging = await read('/api/paging/state');
      const source = initialPaging.schedules.find(row => row.id === 'agent-schedule' && row.service === 'agent-service');
      assert.ok(source);
      const args = scheduleCreateArgs(source, 'Payments retained ' + mode + ' rota');
      const bearer = await token();
      const originalClaims = tokenClaims(bearer);
      assert.equal(originalClaims.iat, started / 1000);
      assert.equal(originalClaims.exp - originalClaims.iat, 300);

      const before = await snapshot();
      const first = await tool(name, args, {}, bearer);
      assert.equal(first.status, 200);
      assert.equal(first.body.error, undefined);
      assert.deepEqual(first.decision.classes.map(row => row.class), ['standard', 'sensitive', 'live']);
      assert.equal(first.decision.disposition, mode === 'held' ? 'approval' : 'autonomous');

      let handle, approved;
      if (mode === 'held') {
        assert.equal(first.result.resultType, 'input_required');
        assert.equal(first.result.structuredContent, undefined);
        handle = first.result._meta['com.runeditrun/approval'];
        assert.ok(handle);
        assert.equal(handle.url, runtime.origin + '/agents/approvals/' + handle.id);
        const {approval} = await read(approvalPath + handle.id);
        assert.equal(approval.state, 'pending');
        assert.equal(approval.decision_id, first.decision.id);
        assert.equal(approval.revision, context.revision);
        assert.match(approval.summary_sha256, /^[a-f0-9]{64}$/);
        assert.deepEqual(approval.approvers, ['sponsor']);
        assert.deepEqual(approval.summary.target, {id: args.schedule.id, name: args.schedule.name});
        assert.equal(approval.prepared_by.for.id, owner.id);
        const pending = await snapshot();
        assert.deepEqual(pending.application, before.application);
        for (const [table, records] of Object.entries(before.records)) {
          if (/^(?:oc_|paging_|workspace_)/.test(table)) assert.deepEqual(pending.records[table], records, table);
        }
        const execution = await read(approvalPath + handle.id + '/approve', {
          revision: approval.revision, summary_sha256: approval.summary_sha256,
        });
        assert.equal(execution.approval.state, 'executed');
        ({approval: approved} = await read(approvalPath + handle.id));
        assert.equal(approved.state, 'executed');
      } else {
        assert.equal(first.result.isError, false);
      }

      const once = await snapshot();
      const retained = once.records.agent_door_calls.filter(row => row.agent === context.agentId && row.key === args.idempotency_key);
      assert.equal(retained.length, 1);
      const [call] = retained;
      const saved = JSON.parse(call.outcome);
      const schedule = {...args.schedule, revision: 1};
      assert.equal(call.state, 'done');
      assert.equal(call.decision_id, first.decision.id);
      assert.equal(call.created_at, started);
      assert.ok(call.expires_at >= started + day + 1000);
      assert.equal(saved.outcome, 'done');
      assert.deepEqual(saved.decision, first.decision);
      assert.deepEqual(saved.result.schedule, schedule);
      assert.equal(saved.result.paging, 'OFF');
      const scheduleRows = once.records.paging_schedules.filter(row => row.id === schedule.id);
      assert.equal(once.records.paging_schedules.length, before.records.paging_schedules.length + 1);
      assert.equal(scheduleRows.length, 1);
      assert.equal(scheduleRows[0].revision, 1);
      assert.deepEqual(JSON.parse(scheduleRows[0].data), schedule);
      assert.deepEqual((await read('/api/paging/state')).schedules.filter(row => row.id === schedule.id), [schedule]);

      const notices = once.application.scheduleRecords.filter(row => row.kind === 'notice' && row.data.schedule === schedule.id);
      const recipients = [...new Set([owner.id, ...schedule.primary.members, ...schedule.backup.members])].sort();
      assert.deepEqual(notices.map(row => row.member).sort(), recipients);
      assert.deepEqual(notices.map(row => row.id), saved.result.notices);
      for (const notice of notices) {
        assert.equal(notice.data.service, schedule.service);
        assert.equal(notice.data.key, schedule.id + ':1:' + notice.member);
        assert.equal(notice.data.obligation.state, 'recorded');
        assert.equal(notice.data.obligation.paging, 'off');
        assert.equal(notice.data.obligation.automatic, false);
        assert.equal(notice.data.obligation.label, 'no sender');
      }
      const nativeAudit = (once.application.audit ?? []).filter(row => row.kind === 'schedule-change' && row.text.includes(schedule.name));
      assert.equal(nativeAudit.length, 1);
      assert.equal(nativeAudit[0].actor, context.agentId);
      assert.equal(nativeAudit[0].metadata.agent.for.id, owner.id);
      assert.deepEqual(nativeAudit[0].metadata.agent.approvers, handle ? [{id: owner.id, name: owner.name}] : []);
      const commits = once.records.oc_admin_audit.filter(row => !before.records.oc_admin_audit.some(prior => prior.id === row.id));
      assert.equal(commits.length, 1);
      const [commit] = commits;
      assert.equal(commit.kind, 'agent-schedule-create');
      assert.equal(commit.outcome, 'accepted');
      for (const [family, table] of [['workspace', 'workspace_control'], ['paging', 'paging_control']]) {
        assert.equal(commit[family + '_before'], before.records[table][0].revision);
        assert.equal(commit[family + '_after'], commit[family + '_before'] + 1);
        assert.equal(once.records[table][0].revision, commit[family + '_after']);
      }
      assert.equal(commit.handoff_before, commit.handoff_after);
      for (const [table, records] of Object.entries(before.records)) {
        if (table.startsWith('paging_') && !['paging_control', 'paging_schedules'].includes(table)) {
          assert.deepEqual(once.records[table], records, table);
        }
      }
      assert.equal(once.records.agent_door_approvals.length, before.records.agent_door_approvals.length + Number(Boolean(handle)));
      assert.deepEqual(once.records.agent_door_reviews, before.records.agent_door_reviews);

      const committedAudit = await audits();
      const originalRow = committedAudit.find(row => row.id === call.decision_id);
      const original = JSON.parse(originalRow.row);
      assert.equal(original.tool, name);
      assert.equal(original.outcome, handle ? 'pending' : 'done');
      assert.equal(original.replay_of, null);
      assert.equal(original.idempotency_key, args.idempotency_key);
      if (handle) {
        const storedApproval = once.records.agent_door_approvals.find(row => row.id === handle.id);
        assert.equal(storedApproval.state, 'executed');
        assert.deepEqual(JSON.parse(storedApproval.result), saved);
        assert.deepEqual(JSON.parse(storedApproval.approvals).map(({person, ref}) => ({person, ref})), [{person: owner.id, ref: 'sponsor'}]);
        assert.equal(saved.receipt.approval_id, handle.id);
        assert.equal(saved.receipt.decision_id, call.decision_id);
        assert.deepEqual(saved.receipt.approved_by, [owner.id]);
        const execution = JSON.parse(committedAudit.find(row => row.id === saved.execution_id).row);
        assert.equal(execution.outcome, 'done');
        assert.deepEqual(execution.approval, {id: handle.id, by: [owner.id]});
      } else {
        assert.deepEqual(first.result.structuredContent, saved.result);
        assert.equal(saved.receipt, undefined);
      }

      const rpcIds = new Set([first.body.id]);
      const tokenIds = new Set([originalClaims.jti]);
      for (const elapsed of [day, day + 1000]) {
        await runtime.time(started + elapsed);
        const priorPolicy = await envelope();
        assert.equal((await runtime.renewPolicy()).status, 200);
        const renewed = await envelope();
        assert.deepEqual(policyAuthority(renewed), policyAuthority(signedPolicy));
        assert.ok(renewed.iat > priorPolicy.iat);
        assert.equal(renewed.exp - renewed.iat, 300);
        const fresh = await token();
        const claims = tokenClaims(fresh);
        assert.equal(claims.iat, (started + elapsed) / 1000);
        assert.ok(originalClaims.exp < claims.iat);
        assert.equal(claims.exp - claims.iat, 300);
        assert.deepEqual(tokenAuthority(claims), tokenAuthority(originalClaims));
        assert.ok(!tokenIds.has(claims.jti));
        tokenIds.add(claims.jti);

        const baseline = await snapshot();
        assert.deepEqual(baseline.application, once.application);
        for (const [table, records] of Object.entries(once.records)) {
          if (!['agent_door_state', 'agent_door_events'].includes(table)) {
            assert.deepEqual(baseline.records[table], records, 'Policy renewal preserves ' + table);
          }
        }
        const auditBefore = await audits(), relayBefore = await relay(), permanentBefore = await permanent();
        const retry = await tool(name, args, {}, fresh);
        assert.equal(retry.status, 200);
        assert.equal(retry.body.error, undefined);
        assert.equal(retry.result.isError, false);
        assert.ok(!rpcIds.has(retry.body.id));
        rpcIds.add(retry.body.id);
        assert.deepEqual(retry.result.structuredContent, saved.result);
        assert.deepEqual(JSON.parse(retry.result.content[0].text), saved.result);
        assert.deepEqual(retry.result._meta['com.runeditrun/receipt'], saved.receipt ? {...saved.receipt, decision: saved.decision} : undefined);
        assert.deepEqual(retry.result._meta['com.runeditrun/review'], saved.review);
        assert.deepEqual(retry.decision.classes, saved.decision.classes);

        const auditAfter = await audits();
        assert.deepEqual(auditAfter.slice(0, -1), auditBefore);
        const attempt = JSON.parse(auditAfter.at(-1).row);
        assert.equal(attempt.id, retry.decision.id);
        assert.equal(attempt.tool, name);
        assert.equal(attempt.outcome, 'replayed');
        assert.equal(attempt.replay_of, call.decision_id);
        assert.equal(attempt.operation_id, original.operation_id);
        assert.equal(attempt.idempotency_key, args.idempotency_key);
        assert.equal(attempt.agent.id, context.agentId);
        assert.equal(attempt.sponsor.id, owner.id);
        const relayAfter = await relay();
        assert.deepEqual(relayAfter.slice(0, relayBefore.length), relayBefore);
        assert.deepEqual(relayAfter.slice(relayBefore.length).map(row => row.decision_id), [attempt.id]);
        const permanentAfter = await permanent();
        assert.deepEqual(permanentAfter.slice(0, permanentBefore.length), permanentBefore);
        for (const row of permanentAfter.slice(permanentBefore.length)) {
          assert.equal(row.kind, 'agent-door.persistence');
          assert.ok(['accepted', 'refused'].includes(row.outcome));
          for (const family of ['workspace', 'paging', 'handoff']) assert.equal(row[family + '_before'], row[family + '_after']);
        }
        if (handle) assert.deepEqual((await read(approvalPath + handle.id)).approval, approved);
        if (elapsed === day + 1000) await observe({runtime, mode, schedule, people: saved.result.people});
        assert.deepEqual(await snapshot(), baseline, 'Retry and readback preserve the original call, expiry, schedule, notices, approvals and paging');
        assert.deepEqual(await runtime.outboundRequests(), []);
        console.log('PROBE BASE-AGENT-012 acceptance 1 ' + mode + ' schedule creation T+' + elapsed +
          'ms: original result and approval receipt when held; one revision-1 rota, native audit and unchanged notices; linked replay only; zero outbound requests');
      }
    } finally {
      await runtime.close();
    }
  }
}
