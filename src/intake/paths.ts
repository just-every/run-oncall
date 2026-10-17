export function compatiblePath(path:string) {
  return path==='/v2/enqueue'||path==='/generic/2010-04-15/create_event.json'||path==='/v2/alerts'||/^\/v2\/alerts\/[^/]+\/(?:close|acknowledge|notes)$/.test(path)||/^\/v2\/alerts\/requests\/[^/]+$/.test(path)||/^\/integrations\/generic\/20131114\/alert\/[^/]+\/[^/]+$/.test(path);
}
