# Oncall demo

After the ordinary `rer setup`, run `rer demo` (`rer dev --demo`) and open its private `RER_OPEN` link. It lands signed in as the owner on a realistic setup:

- a team of five responders and one viewer;
- two services (Checkout API, Payments worker) with routing and escalation policies;
- a weekly rota for each, with hand-offs on Monday morning, a past swap and an upcoming cover;
- three incidents from the last ten days, one of them open and mitigating, with timeline, runbook progress and follow-ups.

Everything is relative to the moment the demo starts. The Demo bar on every page says nothing is sent. Nothing can page, call or text: Base's demo guard refuses every non-loopback request, and Oncall's own delivery already refuses SMS, voice and push (paging is OFF). The only mail this app writes is operator sign-in and invitation mail; the demo captures it in the development outbox and lists it in the Demo bar.

`rer demo --stop`, Ctrl-C, or its end (one hour) deletes `.rer/demo/<start>/`. The next `rer demo` starts afresh. The checkout's own `.wrangler/state` and private settings are never written.

`src/demo.ts` (`seedDemo`) builds the data through the same domain functions the routes use. `src/modules/demo` is Base's demo module; `csp.mjs` (Base's `modules/operator-auth/csp.mjs`, byte for byte) sits beside it because this edition's operator-auth copy predates it and must keep its one pinned revision; the module's import of it is the only adaptation. Both are covered by the `runeditrun/demo` component in `edition.json`. A hosted demo is not part of this edition.
