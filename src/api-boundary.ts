import { Hono } from 'hono';
import type { Bindings } from './auth.server';
import type { Member } from './family/response-operations/domain';
import { Fault } from './family/response-operations/domain';
import { admitted } from './base/setup-state';
import { runtimeBindings } from './auth.server';
import { CommandKeyError } from './base/command-receipts';
import { rateFaultBody } from './intake-rate/fault';
import { compatiblePath, monitoringPath } from './intake/paths';
import { Refusal } from './move-in/refusals';
import { isLoopbackHost } from './modules/operator-auth/index.mjs';

export function createApi() {
  const api = new Hono<{ Bindings: Bindings; Variables: { actor: Member; sessionDigest: string } }>();
  api.onError(async (error, c) => {
    if(error instanceof CommandKeyError)return c.json({error:error.message},error.status);
    await discardDeniedBody(c);
    if(c.req.path.startsWith("/api/v1/")) { const status=error instanceof Fault?error.status:503;return c.json({error:{code:({400:"invalid_request",401:"invalid_token",403:"insufficient_scope",404:"not_found",409:"conflict",413:"request_too_large",429:"rate_or_capacity_limit"} as Record<number,string>)[status]??"storage_unavailable",message:error instanceof Fault?error.message:"Storage unavailable; no success confirmed"}},status as any); }
    if (error instanceof Refusal)
      return c.json({ error: error.message, code: error.code }, error.status as any);
    if (error instanceof Fault)
      return c.json({ error: error.message, ...('code' in error && error.code === 'subject_erasure_fence' ? {code:error.code} : {}), ...rateFaultBody(error) }, error.status as any);
    // Read fences return the kit code directly; mutation fences abort D1's
    // transaction with this named CHECK constraint. Both are expected refusals.
    // D1 appends extended SQLite constraint details to this primary failure.
    // Match the exact named CHECK, with a SQLite constraint-code boundary; leave
    // unrelated SQL and storage failures on the 503 path below.
    const importCode = /^(?:D1_ERROR: )?CHECK constraint failed: IMPORT_ATOMIC_GUARD(?:$|: SQLITE_CONSTRAINT(?:_CHECK)?\b)/.test(error.message)
      ? 'IMPORT_ATOMIC_GUARD' : error.message;
    if(c.req.path.startsWith('/api/move-in/') && /^[A-Z][A-Z0-9_]+$/.test(importCode)) {
      const conflict=/CONFLICT|GUARD|SUPERSEDED|BUSY/.test(importCode);
      return c.json({error:`The import journal refused this ${conflict?'change because imported data or current authority changed meanwhile':'request'}; check the job's state before trying again.`,code:importCode},conflict?409:400);
    }
    console.error("oncall request failure", error.name);
    return c.json(
      { error: "Storage or server failure; no success confirmed" },
      503,
    );
  });
  api.use("*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    c.header("X-Content-Type-Options", "nosniff");
    const url = new URL(c.req.url);
    // Hosted and local coordination share the same current-member authority.
    // Keep requests on the configured application origin, as the sign-in doors do.
    if (c.req.path !== "/health" && !admitted(c.req.raw, runtimeBindings(c.env).AUTH_ORIGIN)) {
      await discardDeniedBody(c);
      return c.json({ error: "Not found" }, 404);
    }
    // The old first-admin password bootstrap belongs to local installations.
    // A hosted first owner is claimed by rer and signs in through real mail.
    if (c.req.path === "/api/setup" && !isLoopbackHost(url.hostname)) {
      await discardDeniedBody(c);
      return c.json({ error: "Not found" }, 404);
    }
    if (c.req.method !== "GET" && !c.req.path.startsWith("/api/v1/") && !compatiblePath(c.req.path) && !monitoringPath(c.req.path) && !c.req.path.startsWith("/api/ingress/") && !c.req.path.startsWith("/api/changes/ingress/") && c.req.path !== "/v2/change/enqueue") {
      if (c.req.header("origin") !== url.origin) {
        await discardDeniedBody(c);
        return c.json({ error: "Same-origin request required" }, 403);
      }
    }
    await next();
    if (c.res.status >= 400) await discardDeniedBody(c);
  });
  return api;
}

// Finish bounded, unread denied bodies before responding. Otherwise the local
// workerd proxy may close its upstream stream while the sender is still writing.
// This consumes no application input and never changes the denial decision.
export async function discardDeniedBody(c: any) {
  const stream = c.req.raw.body;
  if (!stream || stream.locked || c.req.raw.bodyUsed) return;
  const reader = stream.getReader();
  let bytes = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > 65536) { await reader.cancel(); break; }
    }
  } catch { /* A disconnected rejected sender does not change authorization. */ }
  finally { reader.releaseLock(); }
}
