#!/usr/bin/env node
// Authenticated local handoff inspection and review. No transport/provider action.
import { constants } from "node:fs";
import { open, lstat } from "node:fs/promises";

const TEXT_LIMIT = 16 * 1024 * 1024;
const HELP = `Local reviewed handoffs — always UNSENT; no provider actions.
Usage: node scripts/handoffs.mjs --origin URL --session-file FILE COMMAND

  list                          Inspect saved records and current diagnostics
  inspect ID                    Inspect exact copy, source snapshots and history
  context INCIDENT_ID           Read current source snapshots and expected hashes
  prepare FILE                  Prepare immutable authored copy from strict JSON
  review ID FILE                Review exact hashes with a stable action identity
  withdraw ID FILE              Terminal withdrawal with an explicit reason
  export ID NEW_FILE            Export currently eligible reviewed copy, unsent
  archive NEW_FILE              Export complete handoff history (admin)
  restore FILE --replace        Replace handoff archive; approvals gain holds (admin)
  --help                        Show this help without authentication or network

Both options are required. Origin must be HTTP loopback without credentials,
paths, queries or fragments; redirects are rejected. Session files must be
regular, owned by you, mode 0600, and contain only oncall_session=token or token.
For a held installation, save its password-login cookie privately.
For a new installation, use the browser reviewed-handoff API with its Base session.
This CLI accepts no passwords, login command or environment-session fallback.
Never put cookies or passwords in arguments or shell history.
Input files are strict JSON objects, at most 16 MiB of text. Server record and
storage limits remain unchanged. Exports are compact raw JSON in new mode-0600
files; an existing destination is never overwritten. --replace is restore-only.
Results go to stdout; unsent notices/errors go to stderr. Errors exit nonzero.
Review does not attest recovery, send customer copy or publish a Lamp incident.
`;
function fail(message) { throw Error(message); }
function options(argv) {
  const opt = { origin: null, sessionFile: null, replace: false, args: [] };
  for (let i = 0; i < argv.length; i++) {
    const value = argv[i];
    if (value === "--help" || value === "-h") return { help: true };
    if (value === "--origin" || value === "--session-file") {
      if (!argv[i + 1] || argv[i + 1].startsWith("--")) fail(`${value} needs a value`);
      opt[value === "--origin" ? "origin" : "sessionFile"] = argv[++i];
    } else if (value === "--replace") opt.replace = true;
    else if (value.startsWith("--")) fail("Unknown option; use --help");
    else opt.args.push(value);
  }
  return opt;
}
function localOrigin(value) {
  if (!value) fail("Explicit --origin is required");
  let url;
  try { url = new URL(value); } catch { fail("Invalid loopback origin"); }
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
      url.username || url.password || url.pathname !== "/" || url.search || url.hash)
    fail("Origin must be HTTP loopback without credentials, path, query or fragment");
  return url.origin;
}
function identity(value) {
  if (!value || value !== value.trim() || value.length > 200 || /[\x00-\x1f\x7f]/.test(value) || [".", ".."].includes(value))
    fail("Invalid record or incident identity");
  return encodeURIComponent(value);
}
function sessionCookie(value) {
  const token = value.trim().replace(/^oncall_session=/, "");
  if (!/^[A-Za-z0-9_-]{16,200}$/.test(token)) fail("Invalid local session cookie format");
  return `oncall_session=${token}`;
}
async function readSession(path) {
  if (!path) fail("Explicit --session-file is required; use paging.mjs login first");
  const info = await lstat(path);
  if (!info.isFile() || (info.mode & 0o777) !== 0o600 || (process.getuid && info.uid !== process.getuid()))
    fail("Session file must be regular, owned by you and chmod 600");
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || (opened.mode & 0o777) !== 0o600 || opened.size > 512 ||
        (process.getuid && opened.uid !== process.getuid())) fail("Unsafe session file");
    return sessionCookie(await handle.readFile("utf8"));
  } finally { await handle.close(); }
}
async function readJson(path) {
  const handle = await open(path, "r");
  let raw;
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > TEXT_LIMIT) fail(`JSON input must be a regular file of at most ${TEXT_LIMIT} bytes`);
    const chunks = []; let bytes = 0;
    while (true) {
      const chunk = Buffer.alloc(Math.min(65536, TEXT_LIMIT + 1 - bytes));
      const { bytesRead } = await handle.read(chunk, 0, chunk.length, null);
      if (!bytesRead) break;
      bytes += bytesRead;
      if (bytes > TEXT_LIMIT) fail(`JSON input exceeds ${TEXT_LIMIT} bytes`);
      chunks.push(chunk.subarray(0, bytesRead));
    }
    raw = Buffer.concat(chunks).toString("utf8");
  } finally { await handle.close(); }
  let data;
  try { data = JSON.parse(raw); } catch { fail("Invalid JSON input; comments and trailing commas are not accepted"); }
  if (!data || typeof data !== "object" || Array.isArray(data)) fail("JSON input must be an object");
  return data;
}
async function writeJson(path, data) {
  const handle = await open(path, "wx", 0o600);
  try { await handle.writeFile(JSON.stringify(data) + "\n", "utf8"); }
  finally { await handle.close(); }
}

async function main() {
  const opt = options(process.argv.slice(2));
  if (opt.help || !opt.args.length) { process.stdout.write(HELP); return; }
  const [command, ...args] = opt.args;
  const counts = { list: 0, inspect: 1, context: 1, prepare: 1, review: 2, withdraw: 2, export: 2, archive: 1, restore: 1 };
  if (!Object.hasOwn(counts, command) || counts[command] !== args.length) fail("Unknown command or wrong argument count; use --help");
  if (opt.replace !== (command === "restore")) fail("Restore requires --replace; --replace is only valid for restore");
  const origin = localOrigin(opt.origin), cookie = await readSession(opt.sessionFile);
  process.stderr.write(`UNSENT LOCAL ONLY — ${origin}; no provider actions.\n`);

  async function request(path, body) {
    let response;
    try {
      response = await fetch(origin + path, { method: body === undefined ? "GET" : "POST", redirect: "error",
        headers: { origin, "sec-fetch-site": "same-origin", accept: "application/json", cookie,
          ...(body === undefined ? {} : { "content-type": "application/json" }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
    } catch { fail("Local request failed or timed out; no success confirmed. Inspect records before retrying a mutation. Nothing was sent by this CLI."); }
    if (!response.ok) {
      let detail = "";
      try { const data = await response.json(); if (typeof data.error === "string") detail = `: ${data.error.slice(0, 500)}`; } catch {}
      fail(`HTTP ${response.status}${detail}; handoff remains unsent`);
    }
    try { return await response.json(); }
    catch { fail("Local server returned invalid JSON; no success confirmed. Inspect records before retrying. Handoff remains unsent."); }
  }
  const session = await request("/api/session");
  if (!session.member) fail(session.setup ? "Initialize the local workspace first" : "Session is expired or revoked; use paging.mjs login again");
  const base = "/api/handoffs";
  let result;
  if (command === "list") result = await request(base);
  else if (command === "inspect") result = await request(`${base}/${identity(args[0])}`);
  else if (command === "context") result = await request(`${base}/context/${identity(args[0])}`);
  else if (command === "prepare") result = await request(base + "/prepare", await readJson(args[0]));
  else if (command === "review" || command === "withdraw") result = await request(`${base}/${identity(args[0])}/${command}`, await readJson(args[1]));
  else if (command === "restore") result = await request(base + "/restore", { mode: "replace", archive: await readJson(args[0]) });
  else if (command === "export" || command === "archive") {
    const exported = await request(command === "export" ? `${base}/${identity(args[0])}/export` : base + "/archive");
    const path = command === "export" ? args[1] : args[0];
    await writeJson(path, exported);
    result = { exported: true, path, kind: command === "export" ? "reviewed-unsent-handoff" : "handoff-archive", authenticationIncluded: false };
  }
  process.stdout.write(JSON.stringify({ mode: "local-only", delivery: "unsent", providerActions: [], result }, null, 2) + "\n");
}
main().catch(error => {
  const message = error.code ? `Local file operation failed (${error.code})` : error.message;
  process.stderr.write(`handoffs: ${message}\n`);
  process.exitCode = 1;
});
