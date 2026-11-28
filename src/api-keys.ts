import type { createApi } from './api-boundary';
import { runtimeBindings } from './auth.server';
import { sealHeldSourceKeys } from './native-sources';

export function installHeldKeys(api: ReturnType<typeof createApi>) {
  // Upgraded installations seal any held plaintext signing key before a request can read it.
  api.use("/api/*", async (c, next) => {
    await sealHeldSourceKeys(c.env.DB, runtimeBindings(c.env).SESSION_SECRET);
    await next();
  });
}
