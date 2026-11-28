// One namespace per installation. No request header, credential or URL selects
// the object that can use this installation's D1 database and provider bindings.
import type { Bindings } from './auth.server';
import { workspaceShellBuildPath } from './app/shell/document';
export { OncallWorkspace } from './workspace-object';

let primaryRegion: DurableObjectLocationHint | null | undefined;
let discovery: Promise<void> | undefined;

async function discoverPrimaryRegion(db: D1Database) {
  // The ordinary binding always queries the primary, even with replicas enabled.
  const {meta} = await db.prepare('SELECT 1').run();
  // Local D1 has no placement metadata. Hosted D1 reports the primary's region.
  const region = meta.served_by_region?.toLowerCase();
  if (!region && meta.served_by_primary === undefined) return null;
  if (meta.served_by_primary !== true || !region?.match(/^(wnam|enam|weur|eeur|apac|oc)$/)) {
    throw new Error('D1 did not report a supported primary region');
  }
  return region as DurableObjectLocationHint;
}

async function workspace(env: Bindings, ctx: ExecutionContext) {
  if (primaryRegion === undefined) {
    if (!discovery) {
      discovery = discoverPrimaryRegion(env.DB).then(region => { primaryRegion = region; });
      ctx.waitUntil(discovery);
    }
    // A concurrent request waits in its own I/O context. The shared promise
    // signals completion and the only cached placement data is the region.
    const pending = discovery;
    await new Promise<void>((resolve, reject) => { void pending.then(resolve, reject); });
  }
  // A hint only applies to a new ID. The old object stored only an in-memory cache.
  const name = `workspace-d1:${primaryRegion ?? 'local'}`;
  return env.WORKSPACE.get(env.WORKSPACE.idFromName(name), {locationHint: primaryRegion ?? undefined});
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (env.TSS_PRERENDERING === 'true' && (path === workspaceShellBuildPath || path === workspaceShellBuildPath + '/')) {
      return (await import('@tanstack/react-start/server-entry')).default.fetch(request);
    }
    // The build emits content-hashed public bundles under /assets/. All
    // installation-branded documents and audited denials use the application.
    if (request.method === 'GET' && env.ASSETS && /^\/assets\/[\w-][\w.-]*-[\w-]{8,}\.(?:js|css|woff2?)$/.test(path)) {
      const asset = await env.ASSETS.fetch(request);
      if (asset.ok || asset.status === 304) return asset;
      await asset.body?.cancel();
    }
    return (await workspace(env, ctx)).fetch(request);
  },
  async scheduled(_event, env, ctx) {
    await (await workspace(env, ctx)).runScheduled();
  },
  async email(message, env, ctx) {
    const { from, to, raw, rawSize, headers } = message;
    const reason = await (await workspace(env, ctx)).receiveMail({ from, to, raw, rawSize, headers });
    if (reason !== null) message.setReject(reason);
  },
} satisfies ExportedHandler<Bindings & { TSS_PRERENDERING?: string }>;
