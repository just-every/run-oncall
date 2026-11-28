import { staticAssetResponse } from '../../base/static-assets';
import type { Bindings } from '../../auth.server';

export const workspaceShellPath = '/_workspace-shell.html';
export const workspaceShellBuildPath = '/__workspace-shell';

export async function workspaceShell(request: Request, env: Bindings) {
  const asset = await staticAssetResponse(new Request(new URL(workspaceShellPath, request.url)), env);
  if (!asset?.ok) throw new Error('Built workspace shell is unavailable');
  return asset;
}
