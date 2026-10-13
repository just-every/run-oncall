import { fontDocumentResponse } from '../base/font-response'

/** Keep the edition's native-frame styling after Base appends its shared font head. */
export async function brandDocumentResponse(response: Response | null): Promise<Response | null> {
  const document = await fontDocumentResponse(response)
  if (!document?.headers.get('content-type')?.startsWith('text/html')) return document
  const headers = new Headers(document.headers)
  headers.delete('content-length')
  return new Response((await document.text()).replace('</head>', '<link rel="stylesheet" href="/brand/frames.css"></head>'), {
    status: document.status, statusText: document.statusText, headers,
  })
}
