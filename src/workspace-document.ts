/** The authenticated request's snapshot travels with its uncached document.
 * Hydration consumes it once; subsequent refreshes check current authority and revisions.
 */
export function appendWorkspace(rewriter: HTMLRewriter, workspace: unknown): HTMLRewriter {
  const json = JSON.stringify(workspace).replace(/[<>&\u2028\u2029]/g, value =>
    `\\u${value.charCodeAt(0).toString(16).padStart(4, '0')}`);
  return rewriter.on('head', {
    element(head) {
      head.append(`<script id="oncall-workspace" type="application/json">${json}</script>`, { html: true });
    },
  });
}
