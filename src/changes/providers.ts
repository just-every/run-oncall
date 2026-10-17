import { fail, link, text } from '../family/response-operations/domain.ts';
import type { ChangeSource, IncomingChange } from './model.ts';
import { changeHash } from './credentials.ts';

function timestamp(value: any): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string') value = value.replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/, '$1T$2$3:$4');
  if (typeof value !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) || !Number.isFinite(Date.parse(value))) fail('Change timestamp must include a timezone');
  return new Date(value).toISOString();
}
export async function providerChange(source: ChangeSource, payload: any, headers: Headers, verificationKey: string): Promise<IncomingChange | null> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail('Change must be a JSON object');
  let eventId: string, summary: any, author: any, occurredAt: any, kind: string, details: any, links: any;
  if (source.provider === 'native') {
    if (payload.service !== undefined && payload.service !== source.service) fail('Change service is outside this source scope',403);
    eventId = text(payload.eventId,'Change event ID',200); summary = payload.summary; author = payload.author ?? 'Not reported'; occurredAt = payload.timestamp; kind = 'change'; details = payload.custom_details ?? {}; links = payload.links ?? [];
  } else if (source.provider === 'pagerduty') {
    const data = payload.payload; if (!data || typeof data !== 'object') fail('payload.summary is required');
    summary = data.summary; author = data.custom_details?.author ?? data.source ?? 'Not reported'; occurredAt = data.timestamp; kind = 'change'; details = {...data.custom_details, source: data.source ?? ''}; links = payload.links ?? [];
    eventId = ''; // The compatible schema has no caller-supplied change identity.
  } else if (source.provider === 'github') {
    if (![String(payload.repository?.id), String(payload.repository?.full_name).toLowerCase()].includes(source.repository.toLowerCase())) fail('Repository is outside this source binding',403);
    eventId = text(headers.get('x-github-delivery'),'GitHub delivery ID',200);
    const event = headers.get('x-github-event');
    if (event === 'deployment') {
      const data = payload.deployment; if (!data) fail('Missing deployment');
      kind = 'deployment-request'; summary = data.description || `Deployment ${text(String(data.ref ?? data.sha ?? data.id ?? ''),'Deployment identity',200)}`; author = data.creator?.login ?? payload.sender?.login; occurredAt = data.created_at; links = [data.url]; details = {deploymentId:data.id, environment:data.environment, sha:data.sha, ref:data.ref, state:'Deployment requested; success is not established'};
    } else if (event === 'release') {
      if (payload.action !== 'published') return null;
      const data = payload.release; if (!data) fail('Missing release');
      kind = 'release-published'; summary = data.name || data.tag_name; author = data.author?.login; occurredAt = data.published_at; links = [data.html_url]; details = {releaseId:data.id, tag:data.tag_name, prerelease:data.prerelease, draft:data.draft};
    } else if (event === 'pull_request') {
      if (payload.action !== 'closed' || payload.pull_request?.merged !== true) return null;
      const data = payload.pull_request; kind = 'pull-request-merged'; summary = data.title; author = data.merged_by?.login ?? 'Not reported'; occurredAt = data.merged_at; links = [data.html_url]; details = {pullRequestId:data.id, number:data.number, author:data.user?.login, mergedBy:data.merged_by?.login, mergeCommit:data.merge_commit_sha};
    } else return null;
  } else {
    if (headers.get('x-gitlab-event') !== 'Deployment Hook' || payload.object_kind !== 'deployment') return null;
    if (![String(payload.project?.id), String(payload.project?.path_with_namespace).toLowerCase()].includes(source.repository.toLowerCase())) fail('Project is outside this source binding',403);
    eventId = text(headers.get('webhook-id'),'GitLab webhook ID',200); kind = 'deployment-' + text(payload.status,'Deployment status',50);
    summary = payload.commit_title || `Deployment ${text(String(payload.deployment_id ?? ''),'Deployment identity',200)}`; author = payload.user?.username; occurredAt = payload.status_changed_at; links = [payload.commit_url, payload.deployable_url].filter(Boolean); details = {deploymentId:payload.deployment_id, environment:payload.environment, status:payload.status, sha:payload.short_sha};
  }
  if(typeof summary!=='string'||author!==undefined&&typeof author!=='string')fail('Change summary and reported author must be text');
  let truncated = false;
  const scrub = (value: string) => value.replaceAll(verificationKey, '[redacted]');
  const bound = (value: unknown, maximum: number) => {
    const content = scrub(typeof value === 'string' ? value : JSON.stringify(value) ?? '');
    if (content.length <= maximum) return content;
    truncated = true; return content.slice(0, maximum - 80) + ` … [truncated; original ${new TextEncoder().encode(content).length} bytes]`;
  };
  const sanitize = (value: any, depth = 0): any => {
    if (depth >= 4) {truncated = true; return '[depth limit]';}
    if (typeof value === 'string') return bound(value,1000);
    if (Array.isArray(value)) {if(value.length>20)truncated=true;return value.slice(0,20).map(v=>sanitize(v,depth+1));}
    if (value && typeof value === 'object') {const entries=Object.entries(value);if(entries.length>20)truncated=true;return Object.fromEntries(entries.slice(0,20).map(([k,v])=>[bound(k,100),/secret|token|password|authorization|cookie|(?:api|routing|service).?key/i.test(k)?'[redacted]':sanitize(v,depth+1)]));}
    return value;
  };
  const safeDetails: Record<string,string> = {};
  if (!details || typeof details !== 'object' || Array.isArray(details)) fail('custom_details must be an object');
  const entries = Object.entries(details); if (entries.length > 50) truncated = true;
  for (const [key, value] of entries.slice(0,50)) {
    const name = bound(key,100); if (!name.trim()) continue;
    safeDetails[name] = /secret|token|password|authorization|cookie|(?:api|routing|service).?key/i.test(key) ? '[redacted]' : bound(sanitize(value),1000);
  }
  if (!Array.isArray(links)) fail('Change links must be an array');
  if (links.length > 10) truncated = true;
  const safeLinks = links.slice(0,10).map((value: any) => {
    const candidate=typeof value==='string'?value:value?.href, url=link(candidate);if(!url)return '';
    const parsed=new URL(url);let decoded:string;try{decoded=decodeURIComponent(url)}catch{truncated=true;return '';}
    if(decoded.includes(verificationKey)||parsed.username||parsed.password||[...parsed.searchParams.keys()].some(k=>/secret|token|password|authorization|cookie|(?:api|routing|service).?key/i.test(k))){truncated=true;return '';}
    return url;
  }).filter(Boolean);
  const normalized = {eventId, summary: text(bound(summary,1024),'Change summary',1100), author: text(bound(author ?? 'Not reported',300),'Reported author',300), occurredAt: timestamp(occurredAt), kind, details:safeDetails, links:safeLinks, truncated};
  if (source.provider === 'pagerduty') normalized.eventId = 'content:' + await changeHash(JSON.stringify({...normalized, eventId:undefined}));
  return normalized;
}
