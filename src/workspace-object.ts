import { DurableObject } from 'cloudflare:workers';
import type { Bindings } from './auth.server';
import type { InboundEmail } from './email/parse.mjs';

// D1 remains the durable source for the workspace, sessions, and audit. The
// installation object owns execution and the revision-checked read cache.
// Its private scheduled and mail RPCs are unreachable through HTTP routing.
export class OncallWorkspace extends DurableObject<Bindings> {
  async fetch(request: Request) {
    const { default: app } = await import('./application');
    return app.fetch(request, this.env);
  }

  async runScheduled() {
    const { default: app } = await import('./application');
    await app.scheduled(undefined, this.env);
  }

  async receiveMail(message: InboundEmail): Promise<string | null> {
    const { receiveEmail } = await import('./email/receive');
    const { runtimeBindings } = await import('./auth.server');
    let rejection: string | null = null;
    await receiveEmail({ ...message, setReject(reason) { rejection = reason; } }, runtimeBindings(this.env));
    return rejection;
  }
}
