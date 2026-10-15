export type Role = "admin" | "responder" | "viewer";
export type Member = { id: string; name: string; role: Role; active: boolean };
export type Service = {
  id: string;
  name: string;
  environment: string;
  owner: string;
  runbook: string[];
  pager: string;
};
export type Policy = {
  id: string;
  version: number;
  service: string;
  severity: string;
  action: "route" | "suppress";
  owner: string;
  reason: string;
};
export type Signal = {
  source: string;
  eventId: string;
  service: string;
  environment: string;
  key: string;
  generation: string;
  intent: "trigger" | "recover";
  severity: "critical" | "warning" | "info";
  title: string;
  observedAt: string;
  evidence: string;
};
export type Decision = {
  policy: string | null;
  version: number | null;
  action: "route" | "suppress" | "unmatched";
  owner: string | null;
  reason: string;
};
export type Event = Signal & {
  id: string;
  acceptedAt: string;
  decision: Decision;
  routingSnapshot: {
    policies: Policy[];
    members: Member[];
    evaluatedAt: string;
  };
};
export type Alert = {
  id: string;
  source: string;
  service: string;
  environment: string;
  key: string;
  generation: string;
  state: "active" | "recovered";
  events: string[];
  owner: string | null;
  suppressed: boolean;
};
export type Entry = {
  id: string;
  at: string;
  actor: string;
  kind: string;
  text: string;
};
export type Action = {
  id: string;
  title: string;
  owner: string;
  due: string;
  done: boolean;
  evidence: string;
};
export type Incident = {
  id: string;
  title: string;
  service: string;
  severity: string;
  state: "declared" | "acknowledged" | "mitigating" | "recovered" | "resolved";
  commander: string | null;
  revision: number;
  createdAt: string;
  alerts: string[];
  timeline: Entry[];
  runbook: { text: string; done: boolean }[];
  actions: Action[];
  recovery: string;
  review: string;
};
export type State = {
  schemaVersion: 1;
  revision: number;
  members: Member[];
  services: Service[];
  policies: Policy[];
  events: Event[];
  alerts: Alert[];
  incidents: Incident[];
  audit: Entry[];
};
export const empty = (): State => ({
  schemaVersion: 1,
  revision: 0,
  members: [],
  services: [],
  policies: [],
  events: [],
  alerts: [],
  incidents: [],
  audit: [],
});
export class Fault extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export function fail(message: string, status = 400): never {
  throw new Fault(status, message);
}
export function text(value: unknown, name: string, max = 1000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    return fail(`${name} is required (maximum ${max} characters)`);
  return value.trim();
}
export function link(value: unknown): string {
  if (value === "" || value == null) return "";
  const v = text(value, "evidence", 2000);
  try {
    const u = new URL(v);
    if (!["http:", "https:"].includes(u.protocol))
      fail("Only HTTP(S) evidence links are supported");
  } catch {
    fail("Evidence must be an HTTP(S) URL");
  }
  return v;
}
const stamp = (
  actor: string,
  kind: string,
  value: string,
  at: string,
): Entry => ({ id: crypto.randomUUID(), at, actor, kind, text: value });
export function authority(state: State, actor: Member, admin = false) {
  const member = state.members.find((m) => m.id === actor.id && m.active);
  if (!member) fail("Access revoked", 401);
  if (member.role === "viewer" || (admin && member.role !== "admin"))
    fail("Insufficient role", 403);
}
export function route(state: State, signal: Signal): Decision {
  const policy = state.policies.find(
    (p) =>
      p.service === signal.service &&
      (p.severity === "*" || p.severity === signal.severity),
  );
  if (!policy)
    return {
      policy: null,
      version: null,
      action: "unmatched",
      owner: null,
      reason: "No matching policy; visible unowned alert",
    };
  const owner = state.members.find(
    (m) => m.id === policy.owner && m.active && m.role !== "viewer",
  );
  if (policy.action === "route" && !owner)
    return {
      policy: policy.id,
      version: policy.version,
      action: "unmatched",
      owner: null,
      reason: "Configured responder is inactive or unavailable",
    };
  return {
    policy: policy.id,
    version: policy.version,
    action: policy.action,
    owner: policy.action === "route" ? policy.owner : null,
    reason: policy.reason,
  };
}
export function signalInput(input: any): Signal {
  if (!input || typeof input !== "object" || Array.isArray(input))
    fail("Signal must be an object");
  if (!["trigger", "recover"].includes(input.intent))
    fail('"intent" must be "trigger" or "recover"');
  if (!["critical", "warning", "info"].includes(input.severity))
    fail('"severity" must be "critical", "warning" or "info"');
  if (typeof input.observedAt !== "string" || !Number.isFinite(Date.parse(input.observedAt)))
    fail('"observedAt" must be an ISO-8601 timestamp with a timezone');
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(input.observedAt))
    fail('"observedAt" must include a timezone (Z or an offset)');
  let evidence: string;
  try { evidence = link(input.evidence); }
  catch { fail('"evidence" must be an HTTP or HTTPS URL, or empty'); }
  return {
    source: text(input.source, '"source"', 100),
    eventId: text(input.eventId, '"eventId"', 200),
    service: text(input.service, '"service"', 100),
    environment: text(input.environment, '"environment"', 100),
    key: text(input.key, '"key"', 200),
    generation: text(input.generation, '"generation"', 100),
    intent: input.intent,
    severity: input.severity,
    title: text(input.title, '"title"', 300),
    observedAt: new Date(input.observedAt).toISOString(),
    evidence,
  };
}
export function admit(state: State, input: any, at = new Date().toISOString()) {
  const signal = signalInput(input);
  const old = state.events.find(
    (e) => e.source === signal.source && e.eventId === signal.eventId,
  );
  if (old) {
    const { id, acceptedAt, decision, routingSnapshot, ...original } = old;
    if (JSON.stringify(original) !== JSON.stringify(signal))
      fail("Event identity already accepted with different content", 409);
    return {
      event: old,
      alert: state.alerts.find((a) => a.events.includes(old.id))?.id ?? null,
      duplicate: true,
    };
  }
  if (
    !state.services.some(
      (s) => s.id === signal.service && s.environment === signal.environment,
    )
  )
    fail('Unknown "service" / "environment" combination');
  if (state.events.length >= 10000)
    fail("Local event capacity reached; export before extending capacity", 429);
  const event: Event = {
    ...signal,
    id: crypto.randomUUID(),
    acceptedAt: at,
    decision: route(state, signal),
    routingSnapshot: {
      policies: structuredClone(state.policies),
      members: structuredClone(state.members),
      evaluatedAt: at,
    },
  };
  let alert = state.alerts.find(
    (a) =>
      a.source === signal.source &&
      a.service === signal.service &&
      a.environment === signal.environment &&
      a.key === signal.key &&
      a.generation === signal.generation,
  );
  if (!alert) {
    alert = {
      id: crypto.randomUUID(),
      source: signal.source,
      service: signal.service,
      environment: signal.environment,
      key: signal.key,
      generation: signal.generation,
      state: signal.intent === "recover" ? "recovered" : "active",
      events: [],
      owner: event.decision.owner,
      suppressed: event.decision.action === "suppress",
    };
    state.alerts.push(alert);
  }
  if (alert) {
    alert.events.push(event.id);
    if (signal.intent === "recover") alert.state = "recovered";
  }
  state.events.push(event);
  state.audit.push(
    stamp(
      `source:${signal.source}`,
      "event",
      `${signal.intent} ${signal.eventId}: ${event.decision.reason}`,
      at,
    ),
  );
  return { event, alert: alert?.id ?? null, duplicate: false };
}
export function command(
  state: State,
  actor: Member,
  input: any,
  at = new Date().toISOString(),
) {
  authority(state, actor, ["service", "policy", "member"].includes(input.type));
  if (input.type === "service") {
    const id = input.id
      ? text(input.id, "service ID", 100)
      : crypto.randomUUID();
    const service: Service = {
      id,
      name: text(input.name, "name", 200),
      environment: text(input.environment, "environment", 100),
      owner: text(input.owner, "owner", 100),
      runbook: (input.runbook ?? []).map((x: unknown) =>
        text(x, "runbook step", 500),
      ),
      pager: link(input.pager),
    };
    if (service.runbook.length > 30) fail("Maximum 30 runbook steps");
    if (
      !state.members.some(
        (m) => m.id === service.owner && m.active && m.role !== "viewer",
      )
    )
      fail("Owner must be an active responder");
    const idx = state.services.findIndex((s) => s.id === id);
    if (idx >= 0 && state.services[idx].environment !== service.environment)
      fail("Service environment is immutable; create another service");
    if (idx < 0) state.services.push(service);
    else state.services[idx] = service;
    state.audit.push(stamp(actor.id, "service", `Saved ${service.name}`, at));
    return service;
  }
  if (input.type === "policy") {
    if (!state.services.some((s) => s.id === input.service))
      fail("Unknown service");
    if (
      !["route", "suppress"].includes(input.action) ||
      !["*", "critical", "warning", "info"].includes(input.severity)
    )
      fail("Invalid routing rule");
    if (
      input.action === "route" &&
      !state.members.some(
        (m) => m.id === input.owner && m.active && m.role !== "viewer",
      )
    )
      fail("Route requires active responder");
    const old = state.policies.find(
      (p) => p.service === input.service && p.severity === input.severity,
    );
    const rule: Policy = {
      id: old?.id ?? crypto.randomUUID(),
      version: (old?.version ?? 0) + 1,
      service: input.service,
      severity: input.severity,
      action: input.action,
      owner: input.owner ?? "",
      reason: text(input.reason, "reason", 500),
    };
    if (old) state.policies[state.policies.indexOf(old)] = rule;
    else state.policies.push(rule);
    state.policies.sort(
      (a, b) => Number(a.severity === "*") - Number(b.severity === "*"),
    );
    state.audit.push(
      stamp(
        actor.id,
        "policy",
        `${rule.id} version ${rule.version}: ${rule.reason}`,
        at,
      ),
    );
    return rule;
  }
  if (input.type === "member") {
    const member = state.members.find((m) => m.id === input.id);
    if (!member) fail("Unknown member");
    if (!["admin", "responder", "viewer"].includes(input.role))
      fail("Invalid role");
    if (
      member.role === "admin" &&
      (input.role !== "admin" || !input.active) &&
      state.members.filter((m) => m.role === "admin" && m.active).length === 1
    )
      fail("Cannot remove last admin");
    member.role = input.role;
    member.active = Boolean(input.active);
    state.audit.push(
      stamp(actor.id, "member", `Changed ${member.name} role/access`, at),
    );
    return member;
  }
  if (input.type === "declare") {
    const service = state.services.find((s) => s.id === input.service);
    if (!service) fail("Unknown service");
    if (!["critical", "warning", "info"].includes(input.severity))
      fail("Invalid severity");
    const ids = input.alerts ?? [];
    if (
      !Array.isArray(ids) ||
      ids.some(
        (id: string) =>
          !state.alerts.some((a) => a.id === id && a.service === service.id),
      )
    )
      fail("Invalid linked alerts");
    const incident: Incident = {
      id: crypto.randomUUID(),
      title: text(input.title, "title", 300),
      service: service.id,
      severity: input.severity,
      state: "declared",
      commander: null,
      revision: 1,
      createdAt: at,
      alerts: ids,
      timeline: [
        stamp(
          actor.id,
          "declared",
          text(input.summary, "impact summary", 3000),
          at,
        ),
      ],
      runbook: service.runbook.map((text) => ({ text, done: false })),
      actions: [],
      recovery: "",
      review: "",
    };
    state.incidents.unshift(incident);
    return incident;
  }
  const incident = state.incidents.find((i) => i.id === input.incident);
  if (!incident) fail("Unknown incident", 404);
  if (input.revision !== incident.revision)
    fail("Incident changed. Reload before applying your edit.", 409);
  let description = "";
  if (input.type === "note") {
    description = text(input.text, "note", 3000);
  } else if (input.type === "transition") {
    const next: Record<string, string[]> = {
      declared: ["acknowledged"],
      acknowledged: ["mitigating", "recovered"],
      mitigating: ["recovered"],
      recovered: ["mitigating", "resolved"],
      resolved: [],
    };
    if (!next[incident.state].includes(input.state))
      fail("Invalid lifecycle transition");
    description = `${incident.state} → ${input.state}: ${text(input.summary, "transition summary", 3000)}`;
    if (input.state === "acknowledged") incident.commander = actor.id;
    if (input.state === "recovered") {
      incident.recovery = link(input.evidence);
      if (!incident.recovery) fail("Recovery evidence URL is required");
    }
    if (input.state === "resolved" && !incident.recovery)
      fail("Recovery must be evidenced before resolution");
    incident.state = input.state;
  } else if (input.type === "runbook") {
    if (!Number.isInteger(input.index) || !incident.runbook[input.index])
      fail("Unknown runbook step");
    incident.runbook[input.index].done = Boolean(input.done);
    description = `Runbook ${input.index + 1}: ${input.done ? "completed" : "reopened"} — ${incident.runbook[input.index].text}`;
  } else if (input.type === "action") {
    if (
      !state.members.some(
        (m) => m.id === input.owner && m.active && m.role !== "viewer",
      )
    )
      fail("Follow-up requires active responder");
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(input.due) ||
      !Number.isFinite(Date.parse(input.due))
    )
      fail("Valid due date required");
    const action: Action = {
      id: crypto.randomUUID(),
      title: text(input.title, "action", 500),
      owner: input.owner,
      due: input.due,
      done: false,
      evidence: "",
    };
    incident.actions.push(action);
    description = `Follow-up: ${action.title} due ${action.due}`;
  } else if (input.type === "complete") {
    const action = incident.actions.find((a) => a.id === input.action);
    if (!action) fail("Unknown follow-up");
    action.evidence = link(input.evidence);
    if (!action.evidence) fail("Completion evidence URL required");
    action.done = true;
    description = `Completed: ${action.title} — ${action.evidence}`;
  } else if (input.type === "review") {
    if (incident.state !== "resolved")
      fail("Review requires resolved incident");
    incident.review = text(input.text, "review", 10000);
    description = "Postincident review updated";
  } else return fail("Unknown command");
  incident.revision++;
  incident.timeline.push(stamp(actor.id, input.type, description, at));
  return incident;
}
export function validateArchive(value: any): State {
  if (!value || value.schemaVersion !== 1) fail("Unsupported archive");
  const object = (v: any, keys: string[]) => {
    if (
      !v ||
      typeof v !== "object" ||
      Array.isArray(v) ||
      Object.keys(v).some((k) => !keys.includes(k)) ||
      keys.some((k) => !(k in v))
    )
      fail("Invalid archive object fields");
  };
  const array = (v: any) => {
    if (!Array.isArray(v) || v.length > 10000) fail("Invalid archive array");
  };
  const integer = (v: any) => {
    if (!Number.isInteger(v) || v < 0) fail("Invalid archive integer");
  };
  const bool = (v: any) => {
    if (typeof v !== "boolean") fail("Invalid archive boolean");
  };
  const date = (v: any) => {
    if (typeof v !== "string" || !Number.isFinite(Date.parse(v)))
      fail("Invalid archive timestamp");
  };
  const entry = (e: any) => {
    object(e, ["id", "at", "actor", "kind", "text"]);
    text(e.id, "entry ID", 100);
    date(e.at);
    text(e.actor, "actor", 200);
    text(e.kind, "kind", 100);
    text(e.text, "entry text", 10000);
  };
  const member = (m: any) => {
    object(m, ["id", "name", "role", "active"]);
    text(m.id, "member ID", 100);
    text(m.name, "member name", 100);
    if (!["admin", "responder", "viewer"].includes(m.role))
      fail("Invalid archive role");
    bool(m.active);
  };
  const policy = (p: any) => {
    object(p, [
      "id",
      "version",
      "service",
      "severity",
      "action",
      "owner",
      "reason",
    ]);
    integer(p.version);
    text(p.id, "policy ID", 100);
    text(p.reason, "reason", 500);
    if (
      !["route", "suppress"].includes(p.action) ||
      !["*", "critical", "warning", "info"].includes(p.severity)
    )
      fail("Invalid archive policy");
  };
  const decision = (d: any) => {
    object(d, ["policy", "version", "action", "owner", "reason"]);
    if (!["route", "suppress", "unmatched"].includes(d.action))
      fail("Invalid routing decision");
    text(d.reason, "reason", 500);
    if (d.version !== null) integer(d.version);
    if (d.policy !== null) text(d.policy, "policy", 100);
    if (d.owner !== null) text(d.owner, "owner", 100);
  };
  object(value, [
    "schemaVersion",
    "revision",
    "members",
    "services",
    "policies",
    "events",
    "alerts",
    "incidents",
    "audit",
  ]);
  if (value.schemaVersion !== 1) fail("Unsupported archive");
  integer(value.revision);
  for (const key of [
    "members",
    "services",
    "policies",
    "events",
    "alerts",
    "incidents",
    "audit",
  ]) {
    array(value[key]);
    if (
      value[key].some((v: any) => !v || typeof v.id !== "string") ||
      new Set(value[key].map((v: any) => v.id)).size !== value[key].length
    )
      fail("Invalid archive identities");
  }
  value.members.forEach(member);
  if (!value.members.some((m: any) => m.active && m.role === "admin"))
    fail("Archive needs an active administrator");
  const hasMember = (id: any) => value.members.some((m: any) => m.id === id);
  const hasService = (id: any) => value.services.some((s: any) => s.id === id);
  if (
    new Set(value.members.map((m: any) => m.name)).size !== value.members.length
  )
    fail("Duplicate member names");
  for (const s of value.services) {
    object(s, ["id", "name", "environment", "owner", "runbook", "pager"]);
    text(s.name, "service", 200);
    text(s.environment, "environment", 100);
    if (!hasMember(s.owner)) fail("Invalid service references");
    array(s.runbook);
    if (s.runbook.length > 30) fail("Invalid runbook length");
    s.runbook.forEach((v: any) => text(v, "runbook", 500));
    link(s.pager);
  }
  for (const p of value.policies) {
    policy(p);
    if (!hasService(p.service) || (p.action === "route" && !hasMember(p.owner)))
      fail("Invalid policy references");
  }
  if (
    new Set(value.policies.map((p: any) => p.service + ":" + p.severity))
      .size !== value.policies.length
  )
    fail("Duplicate policy selectors");
  const eventKeys = new Set();
  for (const e of value.events) {
    object(e, [
      "source",
      "eventId",
      "service",
      "environment",
      "key",
      "generation",
      "intent",
      "severity",
      "title",
      "observedAt",
      "evidence",
      "id",
      "acceptedAt",
      "decision",
      "routingSnapshot",
    ]);
    signalInput(e);
    date(e.acceptedAt);
    if (
      !value.services.some(
        (s: any) => s.id === e.service && s.environment === e.environment,
      )
    )
      fail("Invalid event references");
    decision(e.decision);
    object(e.routingSnapshot, ["policies", "members", "evaluatedAt"]);
    array(e.routingSnapshot.policies);
    array(e.routingSnapshot.members);
    e.routingSnapshot.policies.forEach(policy);
    e.routingSnapshot.members.forEach(member);
    date(e.routingSnapshot.evaluatedAt);
    const k = JSON.stringify([e.source, e.eventId]);
    if (eventKeys.has(k)) fail("Duplicate source event identities");
    eventKeys.add(k);
  }
  const alertKeys = new Set();
  for (const a of value.alerts) {
    object(a, [
      "id",
      "source",
      "service",
      "environment",
      "key",
      "generation",
      "state",
      "events",
      "owner",
      "suppressed",
    ]);
    if (
      !value.services.some(
        (s: any) => s.id === a.service && s.environment === a.environment,
      ) ||
      !["active", "recovered"].includes(a.state) ||
      (a.owner !== null && !hasMember(a.owner))
    )
      fail("Invalid alert references");
    text(a.generation, "generation", 100);
    bool(a.suppressed);
    array(a.events);
    if (
      a.events.some(
        (id: any) =>
          !value.events.some(
            (e: any) =>
              e.id === id &&
              e.source === a.source &&
              e.service === a.service &&
              e.environment === a.environment &&
              e.key === a.key &&
              e.generation === a.generation,
          ),
      )
    )
      fail("Invalid alert event references");
    const k = JSON.stringify([
      a.source,
      a.service,
      a.environment,
      a.key,
      a.generation,
    ]);
    if (alertKeys.has(k)) fail("Duplicate alert generations");
    alertKeys.add(k);
  }
  for (const i of value.incidents) {
    object(i, [
      "id",
      "title",
      "service",
      "severity",
      "state",
      "commander",
      "revision",
      "createdAt",
      "alerts",
      "timeline",
      "runbook",
      "actions",
      "recovery",
      "review",
    ]);
    text(i.title, "incident", 300);
    if (
      !hasService(i.service) ||
      ![
        "declared",
        "acknowledged",
        "mitigating",
        "recovered",
        "resolved",
      ].includes(i.state) ||
      !["critical", "warning", "info"].includes(i.severity) ||
      (i.commander !== null && !hasMember(i.commander))
    )
      fail("Invalid incident");
    integer(i.revision);
    date(i.createdAt);
    array(i.alerts);
    if (
      i.alerts.some(
        (id: any) =>
          !value.alerts.some(
            (a: any) => a.id === id && a.service === i.service,
          ),
      )
    )
      fail("Invalid incident alert references");
    array(i.timeline);
    i.timeline.forEach(entry);
    if (i.timeline.some((e: any) => !hasMember(e.actor)))
      fail("Invalid incident attribution");
    array(i.runbook);
    for (const r of i.runbook) {
      object(r, ["text", "done"]);
      text(r.text, "runbook", 500);
      bool(r.done);
    }
    array(i.actions);
    for (const a of i.actions) {
      object(a, ["id", "title", "owner", "due", "done", "evidence"]);
      text(a.id, "action ID", 100);
      text(a.title, "action", 500);
      date(a.due);
      bool(a.done);
      link(a.evidence);
      if (!hasMember(a.owner) || (a.done && !a.evidence))
        fail("Invalid follow-up references/evidence");
    }
    link(i.recovery);
    if (["recovered", "resolved"].includes(i.state) && !i.recovery)
      fail("Missing recovery evidence");
    if (typeof i.review !== "string" || i.review.length > 10000)
      fail("Invalid review");
  }
  value.audit.forEach(entry);
  return structuredClone(value);
}
