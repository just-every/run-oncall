// Cookies ignore ports, so every app on one loopback host shares them. The held
// workspace cookie carries this install's port, like Base's native
// operator_session_local_<port>, so a neighbour's cookie neither signs in nor out.
export function sessionCookieName(request: Request) {
 const url = new URL(request.url)
 return `oncall_session_${url.port || (url.protocol === 'https:' ? '443' : '80')}`
}

export function readSessionCookie(request: Request) {
 const name = `${sessionCookieName(request)}=`
 return (request.headers.get('cookie') ?? '').split(';').map(v => v.trim()).find(v => v.startsWith(name))?.slice(name.length)
}

export const sessionCookieLine = (request: Request, token: string, maxAge: number) =>
 `${sessionCookieName(request)}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`
