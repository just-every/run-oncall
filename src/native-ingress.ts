import { installHeldKeys } from './api-keys';
import { createApi } from './api-boundary';
import { attributedNativeBearer } from './audit-principal';
import { admit, fail } from './family/response-operations/domain';
import { nativeName } from './integrations/native-name';
import { beginRate, saveRate } from './intake-rate/admission';
import { nativeIncompleteSource, parseNativeRequest, retainNativeIncomplete } from './native-incomplete';
import { readNativeRequest } from './native-request';
import { refuseKeyEcho, type NativeSource } from './native-sources';
import { finishResponseAdmission } from './response-policy/model';
import { nativeRoutedIngress } from './routing/native';
import { loadWorkspace } from './workspace-store';
import { saveWorkspace } from './workspace-write';
import type { IntakeDependencies } from './monitoring/credentials';

export function installNativeIngress(api: ReturnType<typeof createApi>, deps: Pick<IntakeDependencies, 'load' | 'save'>) {
  api.post("/api/ingress/:source", async (c) => {
    const sourceId = c.req.param("source");
    const attributed = attributedNativeBearer(c.req.raw, sourceId);
    const source = attributed ?? await c.env.DB.prepare(
      "SELECT digest,signing_secret,signing_custody,scopes FROM sources WHERE id=?",
    )
      .bind(sourceId)
      .first<NativeSource>();
    if (!source) return nativeRoutedIngress(c,deps);
    // The debit and final write still require this exact credential and scope.
    // Audit has already authenticated the same Request when it supplies a bearer.
    const nativeBody=await readNativeRequest(c,source,!!attributed),key=nativeBody.key;
    const authority = {
      sql: "EXISTS(SELECT 1 FROM sources WHERE id=? AND digest=? AND signing_custody IS ? AND scopes=?)",
      values: [sourceId, source.digest, source.signing_custody, source.scopes],
    };
    const state = await deps.load(c.env.DB);
    const rate=await beginRate(c,deps,state,{id:'source:'+sourceId,name:sourceId,owner:state.members.find(m=>m.active&&m.role==='admin')!.id},authority);
    const scopes: string[] = JSON.parse(source.scopes);
    const parsed = parseNativeRequest(nativeBody, scopes.length === 1 ? scopes[0] : undefined);
    if (!parsed) {
      const custody = await nativeIncompleteSource(state, sourceId, source);
      const result = await retainNativeIncomplete(state, custody, nativeBody, key);
      if (!result.duplicate) await saveRate(c,deps,state,state.revision,rate,1);
      return c.json({duplicate:result.duplicate,id:result.receipt.id,service:result.receipt.service,acceptedAt:result.receipt.acceptedAt,truncation:true,incomplete:{receipt:result.receipt.id}},202);
    }
    const {signal} = parsed;
    if (signal.source !== sourceId && signal.source !== nativeName(sourceId))
      fail('"source" must match the source ID or displayed name for the URL',403);
    refuseKeyEcho(Object.values(signal), key);
    // Names are input aliases only. Retain the established source identity so old
    // senders, retry receipts and alert generations keep sharing the same custody.
    signal.source = sourceId;
    if (!scopes.includes(signal.service))
      fail('"service" must be an internal service ID authorized for this source', 403);
    const revision = state.revision;
    const alertCount = state.alerts.length;
    const result = admit(state, signal);
    if(!result.duplicate&&result.alert)finishResponseAdmission(state,state.alerts.find(a=>a.id===result.alert)!,result.event,result.event.id);
    if (!result.duplicate) {
      const newEvents = signal.intent !== "trigger" || state.alerts.length > alertCount ? 1 : 0;
      await saveRate(c,deps,state,revision,rate,newEvents);
    }
    // Source credentials admit signals; they never grant workspace read access.
    // Project explicitly so new internal event fields cannot widen this receipt.
    return c.json({
      duplicate: result.duplicate,
      id: result.event.id,
      eventId: result.event.eventId,
      service: result.event.service,
      observedAt: result.event.observedAt,
      acceptedAt: result.event.acceptedAt,
    }, result.duplicate ? 200 : 201);
  });
}

const ingress = createApi();
installHeldKeys(ingress);
installNativeIngress(ingress, { load: loadWorkspace, save: saveWorkspace });

export const nativeIngress = ingress;
