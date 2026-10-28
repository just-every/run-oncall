# Doors and limits behind the contract

CONTRACT.md states each clause as an outcome. This page keeps the mechanism those clauses used to name: the HTTP doors, the deployment settings and the constants. The owner-facing guides in `docs/` describe the same doors in more detail.

## Doors

- Native signed and bearer intake (OC-001): `POST /api/ingress/:source`. Request keys, field limits and a curl example are in [Incidents and alerts](../incidents.md#send-an-alert-event).
- Routing replay (OC-002): `POST /api/replay`.
- Native archive export and restore (OC-007): `GET /api/archive` and `POST /api/restore`.
- Paired recovery checkpoint (OC-016): `GET /api/recovery/checkpoint` and `POST /api/recovery/restore`, plus the private CLI in `scripts/checkpoint.mjs` ([Checkpoints](../checkpoints.md)).
- Member password sign-in (OC-018): `/signin/local`; the anonymous first-admin bootstrap is `POST /api/setup`, served only on loopback.
- Incident commands (OC-041, OC-050): `POST /api/command`; the permanent audit export is `GET /api/audit/export` ([Permanent operational audit](../audit.md)).
- Inbound email (OC-033, OC-070): Cloudflare Email Routing delivers to the Worker `email()` handler; integration addresses use the `INBOUND_EMAIL_DOMAIN` setting, which defaults to none, so email is off until it is set ([Compatible alert intake](../compatible-intake.md)).

## Limits

- Response API outbox (OC-053): at most 1,000 unfinished deliveries (`queued`, `sending`, `failed`) occupy delivery slots, and an installation keeps at most 1,000 API mutation receipts for its lifetime. Outbox history is excluded from the 1 MB authored-workspace profile and is bounded by unique endpoint and timeline-entry provenance plus strict field, reference and history limits. Native restore and checkpoint request limits are unchanged; larger histories use the streaming portable export and import doors. The signed event body and its HMAC-SHA256 signature are described in [Response API and outbound events](../response-api.md).
- Per-key intake allowances (OC-084): by default 600 authenticated requests and 120 newly admitted events per key per rolling minute, each adjustable per key within a documented ceiling; email intake keeps its separate 60 new receipts per minute per address; the receipt store holds 10,000 receipts as a local limit ([Routed intake keys](../routed-intake.md)).

## Recorded move-in shapes

Shapes recorded under OC-021 (13 Oct 2026, no requirement reworded): each documented Opsgenie `data` response and each documented PagerDuty list or single-detail response, saved unchanged, one per bundle key or an array of them; PagerDuty layers that ended before the one open-ended layer began, kept as named history; a PagerDuty whole-day layer in a zone with offset changes when the supplied `final_schedule` is equivalent across an offset change. MOVE-IN.md lists the fields and pages read.
