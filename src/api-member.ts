import { discardDeniedBody, type createApi } from './api-boundary';
import { auditInput } from './audit-request';
import { fail, type Member, type State } from './family/response-operations/domain';
import { readCurrentMember } from './workspace-read';
import { loadWorkspace } from './workspace-store';
import type { WriteGuard } from './workspace-write';

export function sessionGuard(c: any): WriteGuard {
  return { sql: "EXISTS(SELECT 1 FROM oc_current_sessions WHERE token=? AND member=? AND expires>?)",
    values: [c.get("sessionDigest"), c.get("actor").id, Date.now()] };
}
export async function body(c: any, max = 65536, tooLarge = "Request too large") {
  const raw = await c.req.text();
  if (new TextEncoder().encode(raw).length > max)
    fail(tooLarge, 413);
  try {
    const input = JSON.parse(raw);
    auditInput(c.env.DB, input, c.req.path);
    return input;
  } catch {
    return fail("Invalid JSON");
  }
}

export async function session(c: any): Promise<Member | null> {
  const current = await readCurrentMember(c.env, c.req.raw);
  if (!current) return null;
  c.set('sessionDigest', current.digest);
  return current.member;
}
export async function authorizedState(c: any, admin = false, statusOnly = false): Promise<State> {
  const state = await loadWorkspace(c.env.DB);
  const member = state.members.find(
    (m) => m.id === c.get("actor").id && m.active,
  );
  if (!member) fail("Access revoked", 401);
  if (member.role === "stakeholder" && !statusOnly) fail("Stakeholders may only access internal status and approved updates", 403);
  if (admin && member.role !== "admin") fail("Current admin required", 403);
  return state;
}

export function installMemberGuard(api: ReturnType<typeof createApi>) {
  api.use("/api/*", async (c, next) => {
    // PagerDuty returns cross-site: only this callback authenticates its sealed transaction.
    if (c.req.method === "GET" && c.req.path === "/api/move-in/pagerduty/callback") return next();
    const actor = await session(c);
    if (!actor) {
      await discardDeniedBody(c);
      return c.json({ error: "Sign in required" }, 401);
    }
    c.set("actor", actor);
    if (actor.role === "stakeholder" && c.req.path !== "/api/status") {
      await discardDeniedBody(c);
      return c.json({error:"Stakeholders may only access internal status and approved updates"},403);
    }
    await next();
  });
}
