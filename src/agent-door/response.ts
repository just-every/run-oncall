import type { Bindings } from '../auth.server';
import { businessSettings } from './business';
import { oncallAgentDoor } from './index.server';
import { oncallPeople } from './people';

const escape = (value: string) => value.replace(/[&<>"']/g, char =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]!));

export async function agentResponse(request: Request, bindings: Bindings, path: string) {
  const response = await oncallAgentDoor(bindings).handle(request);
  if (path !== '/agents' || !response?.headers.get('content-type')?.startsWith('text/html') ||
      !await oncallPeople(bindings).session(request)) return response;

  const brand = await businessSettings(bindings).publicBrand();
  const business = brand.displayName ? `<p><a href="/app" data-business-name>${escape(brand.displayName)}</a></p>` : '';
  return new HTMLRewriter().on('main', {
    element(main) {
      main.prepend(`${business}<p><a href="/agents/people">Link existing Business people</a> · <a href="/docs/agents">Oncall agent guide</a></p>`, { html: true });
    }
  }).transform(response);
}
