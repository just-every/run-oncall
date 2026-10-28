import { bundleJSON, emptyBundle, type Provider, type Region } from './collect/bundle'

/** Only page memory holds the key. Each step uses the administrator's own same-origin session. */
export async function readAccount(request: (path: string, input?: unknown) => Promise<any>, source: Provider, region: Region, key?: string) {
 const bundle = emptyBundle(source)
 let cursor: string | undefined
 do {
  const result = await request('/api/move-in/read', { source, region, ...(key ? { key } : {}), ...(cursor ? { cursor } : {}) })
  for (const kind of Object.keys(bundle)) {
   if (!Array.isArray(result.part?.[kind])) throw Error('The account read could not be completed. Read again; nothing was imported.')
   bundle[kind].push(...result.part[kind])
  }
  cursor = result.next ?? undefined
 } while (cursor)
 return new TextEncoder().encode(bundleJSON(bundle))
}
