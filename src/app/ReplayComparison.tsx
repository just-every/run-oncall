import {DecisionExplanation} from '../routing/DecisionExplanation';
import {shortTime} from '../integrations/catalog';
import type { UrgencyDecision } from "../urgency/types";
import type { Decision, Member, Event } from "../family/response-operations/domain";

type Result = { workspaceRevision: number; decisions: { proposedWorkflow?:{workflowVersion:number;steps:string[]}|null;eventId: string; historical: Decision | null; historicalEvaluation: { members: Member[] } | null; proposed: Decision; proposedEvaluation: string; historicalUrgency?: UrgencyDecision | null; proposedUrgency?: UrgencyDecision | null }[] };

export function ReplayComparison({ result, members, events = [] }: { result: Result; members: Member[]; events?: Event[] }) {
  function decision(value: Decision | null, people: Member[]) {
    if (!value) return <p>No accepted event with this identity.</p>;
    const owner = value.owner ? people.find(member => member.id === value.owner)?.name ?? `Unavailable member` : "Unassigned";
    return <><p><strong>{value.action}</strong> · {owner}</p><p>{value.reason}</p><DecisionExplanation decision={value} events={events}/><span>{value.policy ? `Service rule · version ${value.version}` : "No matching policy"}</span></>;
  }
  return <section aria-label="Replay comparison">
    <p>{result.decisions.length} events compared. No records changed.</p>
    {result.decisions.map((row, index) => <article className="service-card" key={index}>
      <h3>{events.find(event=>event.eventId===row.eventId)?.title??'Retained event'}</h3>
      <h4>Historical decision</h4>{decision(row.historical, row.historicalEvaluation?.members ?? members)}
      {row.historicalUrgency&&<p>Historical urgency: <strong>{row.historicalUrgency.urgency}</strong> · rule v{row.historicalUrgency.version} · {row.historicalUrgency.reason}</p>}
      <h4>Proposed decision</h4>{decision(row.proposed, members)}
      {row.proposedUrgency&&<p>Proposed urgency: <strong>{row.proposedUrgency.urgency}</strong> · rule v{row.proposedUrgency.version} · {row.proposedUrgency.reason}</p>}
      {row.proposedWorkflow&&<p>Proposed workflow v{row.proposedWorkflow.workflowVersion}: {row.proposedWorkflow.steps.join(' → ')}. Recorded obligation only; no effects.</p>}
      <p>Evaluated {shortTime(row.proposedEvaluation)}</p>
    </article>)}
    {!result.decisions.length && <p>No events supplied. Choose accepted events or paste events using the documented JSON fields.</p>}
  </section>;
}
