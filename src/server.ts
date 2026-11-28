// One namespace per installation. No request header, credential or URL selects
// the object that can use this installation's D1 database and provider bindings.
import type { Bindings } from './auth.server';
import { workspaceShellBuildPath } from './app/shell/document';
export { OncallWorkspace } from './workspace-object';

type WorkspacePlacement = {
  name: string;
  options?: DurableObjectNamespaceGetDurableObjectOptions;
};
let placement: WorkspacePlacement | undefined;
let discovery: Promise<WorkspacePlacement> | undefined;

async function discoverPlacement(db: D1Database): Promise<WorkspacePlacement> {
  // The ordinary binding always queries the primary, even with replicas enabled.
  const { meta } = await db.prepare('SELECT 1').run();
  const region = meta.served_by_region?.trim().toLowerCase();
  // Local D1 and the hosted demo's SQLite adapter omit the region.
  // A reported region always names a distinct object. Only supported hints go to get().
  const options = region && /^(wnam|enam|sam|weur|eeur|apac(?:-ne|-se)?|oc|afr|me)$/.test(region)
    ? { locationHint: region as DurableObjectLocationHint }
    : undefined;
  return { name: `workspace-d1:${region || 'local'}`, options };
}

function resolvePlacement(db: D1Database, ctx: ExecutionContext) {
  if (!discovery) {
    discovery = discoverPlacement(db).then(result => { placement = result; return result; });
    ctx.waitUntil(discovery);
  }
  // A concurrent request waits in its own I/O context.
  const pending = discovery;
  return new Promise<WorkspacePlacement>((resolve, reject) => { void pending.then(resolve, reject); });
}

async function workspace(env: Bindings, ctx: ExecutionContext) {
  const { name, options } = placement ?? await resolvePlacement(env.DB, ctx);
  // A hint only applies to a new ID. The old object stored only an in-memory cache.
  return env.WORKSPACE.get(env.WORKSPACE.idFromName(name), options);
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
