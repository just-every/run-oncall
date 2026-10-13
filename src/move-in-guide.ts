/**
 * The move-in guide is the owner docs page /docs/move-in. Older links name /move-in-guide or
 * /move-in-guide.html; the Worker answers both with a permanent redirect there, in dev, preview
 * and hosted alike, so a saved link still lands on the guide.
 */
export function guideResponse(request: Request): Response | null {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null
  const { pathname } = new URL(request.url)
  if (pathname !== '/move-in-guide' && pathname !== '/move-in-guide.html') return null
  return new Response(null, { status: 308, headers: { location: '/docs/move-in', 'cache-control': 'no-cache' } })
}
