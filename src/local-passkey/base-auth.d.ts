declare module '*modules/operator-auth/config.mjs' {
 export function configure(config: { origin: string; SESSION_SECRET?: string }): {
  origin: string; SESSION_SECRET: string; sessionSeconds: number; cookieName: string; secure: boolean;
 }
}

declare module '*modules/operator-auth/crypto.mjs' {
 export function hashToken(secret: string, purpose: string, token: string): Promise<string>
 export function opaqueToken(): string
}

declare module '*modules/operator-auth/errors.mjs' {
 export class AuthError extends Error { status: number }
}

declare module '*modules/operator-auth/http.mjs' {
 export function localCookieName(name: string, origin: string): string
 export function requirePost(request: Request, config: { origin: string }): void
 export function securityHeaders(): Record<string, string>
 export function sessionCookie(token: string, config: { cookieName: string; secure: boolean; sessionSeconds?: number }, seconds?: number): string
 export function escapeHtml(text: string): string
}

declare module '*modules/operator-auth/dev/persona-entry.mjs' {
 export function personaSessions(key: string, origin: string): { cookie(id: string, seconds: number): Promise<string> }
}

declare module '*modules/operator-auth/page.mjs' {
 export function pageResponse(input: {
  branding: unknown; heading: string; method: string; referrer: string; content: string;
 }): Promise<Response>
}
