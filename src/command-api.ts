import type { createApi } from './api-boundary';
import { authorizedState, body, sessionGuard } from './api-member';
import { markCommandNoop } from './audit-request';
import { setAuditSubject } from './audit-store';
import { commandKey, runOnce } from './base/command-receipts';
import { changeHash } from './changes/credentials';
import { authority, command, fail, type Incident } from './family/response-operations/domain';
import { isResponseChange } from './family/response-operations/incident-controls';
import { responseContext } from './manual-pages/context';
import { pagingSnapshot } from './paging-store';
import { loadWorkspace } from './workspace-store';
import { saveWorkspace } from './workspace-write';

export function installCommand(api: ReturnType<typeof createApi>) {
  api.post("/api/command", async (c) => {
    const input = await body(c);
    const needsPolicy=['manual-page','user-assignment','request-responders','respond-request','snooze'].includes(input.type)||input.type==='transition'&&input.state==='acknowledged';
    const snapshot=needsPolicy?await pagingSnapshot(c.env.DB):null;
    const state=snapshot?.workspace??await loadWorkspace(c.env.DB), revision=state.revision, actor=c.get('actor');
    const execute=async()=>{
      if (['service', 'member'].includes(input.type) && input.baseValues !== undefined) {
        authority(state, actor, true);
        const record = input.type === 'service' ? state.services.find(row => row.id === input.id) : state.members.find(row => row.id === input.id);
        const fields = input.type === 'service' ? ['name', 'environment', 'owner', 'runbook', 'pager'] : ['role', 'active'];
        if (!record || fields.some(field => JSON.stringify((record as any)[field]) !== JSON.stringify(input.baseValues?.[field])))
          fail('This record changed. Review the saved value before applying your edit.', 409);
      }
      const result=command(state,actor,input,new Date(Date.now()).toISOString(),snapshot?responseContext(snapshot,Date.now()):undefined);
      if(['declare','manual-page'].includes(input.type)&&result&&typeof result==='object'&&'id' in result)setAuditSubject(c.env.DB,'entity',String(result.id));
      const guard=sessionGuard(c);
      if(result && ('changed' in result && result.changed === false || isResponseChange(input.type) && 'timeline' in result && result.revision === input.revision)){
        // A read fence preserves current authority and the compared snapshot without a write.
        const current=await c.env.DB.prepare(`SELECT revision,${guard.sql} AS activeSession,(SELECT json_extract(data,'$.role') FROM oc_members WHERE id=? AND json_extract(data,'$.active')=1) AS role FROM workspace_control WHERE id=1`)
          .bind(...guard.values,actor.id).first<{revision:number;activeSession:number;role:string|null}>();
        if(!current?.activeSession||!current.role)fail('Access revoked',401);
        if(!['admin','responder'].includes(current.role))fail('Insufficient role',403);
        if(current.revision!==revision)fail('Workspace changed. Reload before applying your edit.',409);
        // Keep the existing security ledger exception limited to response-value
        // comparisons. Other doors retain their accepted-attempt audit facts.
        if (isResponseChange(input.type)) markCommandNoop(c.env.DB);
        return {changed:false,message:'Nothing to change'};
      }
      if(snapshot){guard.sql+=' AND EXISTS(SELECT 1 FROM paging_control WHERE id=1 AND revision=?)';guard.values.push(snapshot.revision);}
      await saveWorkspace(c.env.DB,state,revision,guard);return result;
    };
    if(input.type==='manual-page'){
      const current=state.members.find(m=>m.id===actor.id&&m.active);if(!current||!['admin','responder'].includes(current.role))fail('Only responders and admins may create manual pages',403);
      const key=commandKey({commandKey:input.operationId});
      const fingerprint=await changeHash(JSON.stringify(input));
      const done=await runOnce(c.env.DB,{actor:actor.id,command:'manual-page:'+fingerprint,key},async()=>{const made=await execute() as Incident;return {result:made.id};});
      const currentState=await authorizedState(c),currentActor=currentState.members.find(m=>m.id===actor.id&&m.active);if(!currentActor||!['admin','responder'].includes(currentActor.role))fail('Manual-page access revoked',403);
      const incident=currentState.incidents.find(i=>i.id===done.result);if(!incident)fail('Incident no longer retained',404);return c.json(incident);
    }
    return c.json(await execute());
  });
}
