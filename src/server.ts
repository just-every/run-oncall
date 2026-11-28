// One namespace per installation. No request header, credential or URL selects
// the object that can use this installation's D1 database and provider bindings.
import type { Bindings } from './auth.server';
export { OncallWorkspace } from './workspace-object';

const workspace = (env: Bindings) => env.WORKSPACE.getByName('workspace');

export default {
  async fetch(request, env, _execution) {
    const path = new URL(request.url).pathname;
    if (env.TSS_PRERENDERING === 'true' && /^\/__workspace-shell\/?$/.test(path)) {
      return (await import('@tanstack/react-start/server-entry')).default.fetch(request);
    }
    // The build emits content-hashed public bundles under /assets/. All
    // installation-branded documents and audited denials use the application.
    if (request.method === 'GET' && env.ASSETS && /^\/assets\/[\w.-]+-[\w-]{8,}\.(?:js|css|woff2?)$/.test(path)) {
      const asset = await env.ASSETS.fetch(request);
      if (asset.ok || asset.status === 304) return asset;
      await asset.body?.cancel();
    }
    return workspace(env).fetch(request);
  },
  async scheduled(_event, env) {
    await workspace(env).runScheduled();
  },
  async email(message, env) {
    const { from, to, raw, rawSize, headers } = message;
    const reason = await workspace(env).receiveMail({ from, to, raw, rawSize, headers });
    if (reason !== null) message.setReject(reason);
  },
} satisfies ExportedHandler<Bindings & { TSS_PRERENDERING?: string }>;
