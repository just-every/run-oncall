import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {autonomousPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';
import {agentEffectSnapshot} from './agent-door-runtime.mjs';

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
export function staleOverrideRevision(runtime, {optionalExpectedRevision = false} = {}) {
  return staleScheduleRevision(runtime, 'override', optionalExpectedRevision);
}

/** A signed-in rota edit makes either the original review or only the optional revision stale. */
export function staleReviewedScheduleRevision(runtime, {optionalExpectedRevision = false} = {}) {
  return staleScheduleRevision(runtime, 'update', optionalExpectedRevision);
}

async function staleScheduleRevision(runtime, operation, optionalExpectedRevision) {
  const reviewed = operation === 'update';
  const {db, http, tool, adopt, context} = runtime;
  const read = async (path, input, status = 200, request = http) => {
    const response = await request(path, input);
    assert.equal(response.status, status, path);
    return response.json();
  };
  const name = 'oncall.schedules.' + operation;
  const fixture = (reviewed ? ' reviewed' : '') + (optionalExpectedRevision ? ' optional' : '');
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
    assert.equal(result._meta['com.runeditrun/receipt'], undefined);
    assert.equal(result.content.length, 1);
    assert.equal(result.content[0].type, 'text');
    const details = result._meta['com.runeditrun/error'];
    assert.deepEqual(JSON.parse(result.content[0].text), details);
    return details;
  };

  const editor = reviewed
    ? await runtime.memberSession(optionalExpectedRevision ? 'Optional revision rota editor' : 'Independent rota editor', 'admin')
    : null;
  const reviewWithAgent = async (rota, schedule, from, to) => {
    const answer = await tool('oncall.schedules.review', {id: rota.id, revision: rota.revision, schedule, from, to}, {}, credential);
    assert.equal(answer.status, 200);
    assert.equal(answer.result.isError, false);
    assert.equal(answer.result._meta['com.runeditrun/approval'], undefined);
    const review = answer.result.structuredContent;
    assert.equal(review.revision, rota.revision);
    assert.deepEqual(review.schedule, {...schedule, revision: rota.revision + 1});
    assert.ok(review.intervals.length > 0 && review.intervals.every(row => row.before === row.after));
    assert.ok(review.members.length > 0);
    for (const member of review.members) assert.deepEqual(Object.keys(member).sort(), ['id', 'name']);
    assert.match(review.digest, /^[0-9a-f]{64}$/);
    return review;
  };

  const adoptPolicy = async policy => {
    const response = await adopt(policy);
    assert.equal(response.status, 200);
    await response.body?.cancel();
  };

  const retained = [];
  for (const mode of ['autonomous', 'held']) {
    const policy = autonomousPolicy();
    if (mode === 'held') {
      policy.rules.unshift({id: 'rota-participant-approval', class: 'sensitive', do: 'approval', approver: ['sponsor'], wait: 'PT1H'});
    }
    // Obtain the digest before the held policy requires approval for participant details.
    await adoptPolicy(reviewed && mode === 'held' ? autonomousPolicy() : policy);

    const rota = await read('/api/paging/schedules', {
      ...source, id: randomUUID(), name: 'Payments coordination rota ' + mode + fixture, revision: 0,
    });
    const from = Math.floor(context.now() / 60000) * 60000 + 86400000;
    const to = from + 3600000;
    const holder = reviewed ? null : await read('/api/members', {
      name: 'Rota relief ' + mode + fixture, role: 'responder', password: 'synthetic-oncall-' + randomUUID(),
    }, 201);
    const override = holder && {
      id: randomUUID(), role: 'primary', member: holder.id,
      start: new Date(from).toISOString(), end: new Date(to).toISOString(),
    };
    const path = '/api/schedules/' + rota.id;
    const proposedName = 'Payments re-reviewed rota ' + mode;
    const staleProposal = reviewed && !optionalExpectedRevision ? {...rota, name: proposedName} : null;
    const originalReview = staleProposal ? await reviewWithAgent(rota, staleProposal, from, to) : null;
    if (originalReview && mode === 'held') await adoptPolicy(policy);
    const edit = {schedule: {...rota, name: 'Payments retained rota ' + mode + fixture}, from, to};
    const native = (url, input) => read(url, input, 200, editor?.http ?? http);
    const review = await native(path + '/review', edit);
    const edited = (await native(path + '/apply', {...edit, digest: review.digest, confirmed: true})).schedule;
    assert.equal(edited.name, edit.schedule.name);
    assert.equal(edited.revision, rota.revision + 1);
    const proposal = staleProposal ?? (reviewed ? {...edited, name: proposedName} : null);
    const proposalReview = originalReview ?? (proposal ? await reviewWithAgent(edited, proposal, from, to) : null);
    if (proposalReview && optionalExpectedRevision && mode === 'held') await adoptPolicy(policy);
    const input = {
      id: rota.id, revision: optionalExpectedRevision ? edited.revision : rota.revision,
      idempotency_key: randomUUID(),
      ...(proposalReview ? {schedule: proposal, from, to, digest: proposalReview.digest} : {override}),
      ...(optionalExpectedRevision ? {expected_revision: rota.revision} : {}),
    };
    assert.deepEqual(edited.overrides, []);
    const pagingBefore = await paging();
    assert.deepEqual(pagingBefore.schedules.find(row => row.id === rota.id), edited);
    assert.deepEqual(pagingBefore.schedules.find(row => row.id === foreign.id), foreign);
    const before = await snapshot();
    assert.ok(before.records.agent_door_calls.some(row => row.outcome), 'Compare populated original call and outcome custody');
    assert.ok(before.records.agent_door_approvals.length, 'Compare populated approval custody');
    if (reviewed && optionalExpectedRevision) {
      assert.ok(before.records.agent_door_reviews.length, 'Compare populated review custody');
    }
    assert.ok(before.records.oc_schedule_records.some(row => JSON.parse(row.data).kind === 'notice'), 'Compare retained schedule notices');
    const beforeAudit = await audit();

    const stale = refusalDetails(await call(input));
    assert.deepEqual(stale, {code: 'revision_conflict', current_revision: edited.revision},
      'MCP names the authorized native rota revision');
    const hiddenInput = optionalExpectedRevision
      ? {...input, revision: foreign.revision, expected_revision: foreign.revision - 1}
      : {...input, revision: 0};
    if (reviewed) {
      hiddenInput.schedule = optionalExpectedRevision
        ? {...foreign, name: proposedName}
        : {...proposal, id: foreign.id, service: foreign.service, revision: 0};
    }
    const scopedOut = await call({...hiddenInput, id: foreign.id, idempotency_key: randomUUID()});
    const absentId = randomUUID();
    const absent = await call({...hiddenInput, id: absentId, idempotency_key: randomUUID(),
      ...(reviewed ? {schedule: {...hiddenInput.schedule, id: absentId}} : {})});
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
    if (originalReview) {
      const schedule = {...edited, revision: stale.current_revision, name: proposedName};
      const freshReview = await native(path + '/review', {schedule, from, to});
      assert.equal(freshReview.revision, stale.current_revision);
      assert.notEqual(freshReview.digest, input.digest);
      Object.assign(fresh, {schedule, digest: freshReview.digest});
      assert.deepEqual(await snapshot(), before, 'A fresh digest does not save or approve the edit');
    }
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
      if (reviewed) {
        assert.deepEqual(saved.summary.target, {id: rota.id, name: edited.name});
        assert.ok(saved.summary.items.includes('Native revision ' + edited.revision + ' → ' + (edited.revision + 1)));
        const range = new Date(from).toISOString() + ' to ' + new Date(to).toISOString();
        assert.ok(saved.summary.items.includes('Review SHA-256 ' + fresh.digest + '; range ' + range));
        assert.equal(first.result.structuredContent, undefined);
      }
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
    const saved = {...edited, revision: edited.revision + 1,
      ...(reviewed ? {name: proposedName} : {overrides: [override]})};
    assert.deepEqual(await paging(), {
      ...pagingBefore, revision: pagingBefore.revision + 1, workspaceRevision: pagingBefore.workspaceRevision + 1,
      schedules: pagingBefore.schedules.map(row => row.id === rota.id ? saved : row),
    }, 'One schedule edit changes just its rota and the two control revisions');
    const priorCommits = before.records.oc_admin_audit;
    const commits = once.records.oc_admin_audit;
    for (const record of priorCommits) assert.deepEqual(commits.find(row => row.id === record.id), record);
    const oldCommitIds = new Set(priorCommits.map(row => row.id));
    const addedCommits = commits.filter(row => !oldCommitIds.has(row.id));
    assert.equal(addedCommits.length, 1);
    const [commit] = addedCommits;
    assert.equal(commit.kind, 'agent-schedule-' + operation);
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
    if (reviewed) {
      assert.equal(stored.result.digest, fresh.digest);
      if (approvalId) {
        assert.deepEqual(stored.receipt.approved_by, [sponsor.id]);
        assert.deepEqual(completed.result._meta['com.runeditrun/receipt'], {...stored.receipt, decision: stored.decision});
      }
      const priorReceipts = before.records.oc_agent_schedule_receipts;
      const receipts = once.records.oc_agent_schedule_receipts;
      assert.equal(receipts.length, priorReceipts.length + 1);
      for (const prior of priorReceipts) assert.deepEqual(receipts.find(row => row.agent === prior.agent && row.key === prior.key), prior);
      const receipt = receipts.find(row => row.agent === agent && row.key === fresh.idempotency_key);
      assert.equal(receipt.tool, name);
      assert.equal(receipt.person, sponsor.id);
      assert.equal(receipt.client, client.id);
      assert.equal(receipt.schedule_revision, saved.revision);
      assert.deepEqual(JSON.parse(receipt.before_schedule), edited);
      assert.deepEqual(JSON.parse(receipt.after_schedule), saved);
      assert.ok(once.application.audit.some(row => row.kind === 'schedule-change' && row.text.includes(fresh.digest)));
    }
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
    console.log('PROBE BASE-AGENT-012 4 ' + mode + ': ' + operation + ' native revision ' + input.revision +
      (reviewed && optionalExpectedRevision ? ', current proposal revision ' + input.schedule.revision : '') +
      (optionalExpectedRevision ? ', stale expected_revision ' + input.expected_revision : ', no expected_revision') +
      ' -> revision_conflict, current_revision ' + stale.current_revision + ' in metadata and text; scoped-out and absent indistinguishable; fresh revision -> one native ' + operation + ' and audit, ' +
      (mode === 'held' ? 'one exact sponsor approval' : 'autonomous') + '; replay unchanged; zero outbound requests');
    retained.push({mode, schedule: saved, holder: holder?.name});
  }
  assert.equal((await adopt()).status, 200);
  return retained;
}
