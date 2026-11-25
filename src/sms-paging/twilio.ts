/** The one provider adapter: Twilio's Messages REST API over fetch, no SDK. Nothing here logs or returns a credential or a number. */
export type PagingEnv = {
  TWILIO_ACCOUNT_SID?: string; TWILIO_AUTH_TOKEN?: string;
  TWILIO_API_KEY_SID?: string; TWILIO_API_KEY_SECRET?: string;
  TWILIO_FROM_NUMBER?: string; TWILIO_TO_NUMBER?: string;
};
export const e164 = /^\+[1-9][0-9]{6,14}$/;
const present = (value: string | undefined) => typeof value === 'string' && value.trim() !== '';
const credentials = (env: PagingEnv) => present(env.TWILIO_API_KEY_SID) && present(env.TWILIO_API_KEY_SECRET)
  ? {user: env.TWILIO_API_KEY_SID!.trim(), secret: env.TWILIO_API_KEY_SECRET!.trim()}
  : present(env.TWILIO_AUTH_TOKEN) ? {user: env.TWILIO_ACCOUNT_SID!.trim(), secret: env.TWILIO_AUTH_TOKEN!.trim()} : null;
export const senderInputs = 'TWILIO_ACCOUNT_SID, TWILIO_FROM_NUMBER and either TWILIO_AUTH_TOKEN or TWILIO_API_KEY_SID with TWILIO_API_KEY_SECRET';
/** Paging can send only when the account, a credential and a from-number are all declared. */
export function senderConfigured(env: PagingEnv) {
  return present(env.TWILIO_ACCOUNT_SID) && credentials(env) !== null && e164.test(env.TWILIO_FROM_NUMBER?.trim() ?? '');
}
export type SendResult = {ok: true; ref: string} | {ok: false; retry: boolean; detail: string};
/** Sends one text. A failure carries Twilio's numeric error code and HTTP status only, never its message (which can echo the number). */
export async function sendText(env: PagingEnv, to: string, body: string): Promise<SendResult> {
  const login = credentials(env);
  if (!login || !senderConfigured(env)) return {ok: false, retry: false, detail: 'sender not configured'};
  let response: Response;
  try {
    response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(env.TWILIO_ACCOUNT_SID!.trim())}/Messages.json`, {
      method: 'POST',
      headers: {authorization: 'Basic ' + btoa(`${login.user}:${login.secret}`), 'content-type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({To: to, From: env.TWILIO_FROM_NUMBER!.trim(), Body: body}),
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return {ok: false, retry: true, detail: 'network error or timeout'};
  }
  let json: any = null;
  try {json = await response.json();} catch {/* a non-JSON body carries no usable code */}
  if (response.status === 200 || response.status === 201) {
    const sid = typeof json?.sid === 'string' && /^[A-Za-z0-9]{2,64}$/.test(json.sid) ? json.sid : null;
    return sid ? {ok: true, ref: sid} : {ok: false, retry: false, detail: `twilio ${response.status} without a message id`};
  }
  const code = Number.isSafeInteger(json?.code) ? ` code ${json.code}` : '';
  return {ok: false, retry: response.status === 429 || response.status >= 500, detail: `twilio ${response.status}${code}`};
}
