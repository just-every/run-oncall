/** The authenticated request's snapshot travels with its uncached document.
 * Hydration consumes it once; subsequent refreshes always read current storage.
 */
export function workspaceDocument(response: Response, workspace: unknown): Response {
  const json = JSON.stringify(workspace).replace(/[<>&\u2028\u2029]/g, value =>
    `\\u${value.charCodeAt(0).toString(16).padStart(4, '0')}`);
  return new HTMLRewriter().on('head', {
    element(head) {
      head.append(`<script id="oncall-workspace" type="application/json">${json}</script>`, { html: true });
    },
  }).transform(response);
}
