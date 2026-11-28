// Mirrors the shared agent door's HTTP mount. Oncall adds no custom MCP paths.
export function isAgentPath(path: string) {
  return path === '/mcp' ||
    path === '/.well-known/oauth-protected-resource' ||
    path === '/.well-known/oauth-protected-resource/mcp' ||
    path === '/api/rer/agent-decisions' ||
    path === '/api/rer/agent-policy' ||
    path === '/agents' ||
    path.startsWith('/agents/api/') ||
    /^\/agents\/approvals\/[^/]+$/.test(path);
}
