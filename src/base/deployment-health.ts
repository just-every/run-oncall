declare const __ONCALL_RELEASE__: { version: string };
declare const __ONCALL_SOURCE_SHA__: string | null;

// rer deploy compares this body with what it just deployed
// (modules/deploy-kit/health-request.mjs). The deploy kit sets the bindings.
type DeploymentBindings = { RER_DEPLOY_SOURCE?: string, RER_DEPLOY_FINGERPRINT?: string, RER_VERSION?: { id: string } }

/** Compiled identity is the local fallback; deployed bindings remain authoritative. */
export function deploymentHealth(env: DeploymentBindings) {
  return {
    ok: true as const,
    buildVersion: __ONCALL_RELEASE__.version,
    deployment: {
      sourceSha: env.RER_DEPLOY_SOURCE || __ONCALL_SOURCE_SHA__,
      fingerprint: env.RER_DEPLOY_FINGERPRINT ?? null,
      versionId: env.RER_VERSION?.id ?? null,
    },
  }
}
