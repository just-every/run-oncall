// The module src/docs/build/plugin.ts generates from docs/site.json and the Markdown it names.
declare module 'virtual:oncall-docs' {
  export const sections: import('./types').DocsSection[];
  export const bodies: Record<string, import('./types').DocsBody>;
}
