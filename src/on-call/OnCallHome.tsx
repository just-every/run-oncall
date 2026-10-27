import {useRotaTooltips} from './useRotaTooltips';
import {Link} from '@tanstack/react-router';
import type {Member, State} from '../family/response-operations/domain';
import {teamCoverage} from '../teams/model';
import type {OnCall} from './read';
import {OpenLine} from './OpenLine';
import {RotaRow} from './RotaRow';
import {WeekBands} from './WeekBands';
import './on-call.css';
export function OnCallHome({state, actor, value}: {state: State; actor: Member; value: OnCall | null}) {
  const tooltips = useRotaTooltips();
  const canCreate = state.services.some(service => teamCoverage(state, actor, service.id));
  return <div ref={tooltips} className="oc-oncall"><header className="oc-page-head"><h1>On call</h1>{canCreate && <Link className="oc-button oc-primary" to={'/on-call/new' as any}>New rota</Link>}</header>
    <OpenLine state={state}/>
    {value && !value.rotas.length && !value.unrostered.length && <section className="oc-card"><h2>Start with a service</h2>{actor.role==='admin'?<Link className="oc-button" to={'/settings/services' as any}>Add service</Link>:<p>A workspace administrator can add a service for your rota.</p>}</section>}
    {value && (value.rotas.length>0||value.unrostered.length>0) && <><section className="oc-rota-list" aria-label="Rotas">{value.rotas.map(rota => <RotaRow key={rota.id} rota={rota}/>)}{value.unrostered.map(service => <article className="oc-rota-row oc-no-rota" key={service.id}><div><h2>{service.name}</h2><p>No rota</p></div>{teamCoverage(state, actor, service.id) && <Link className="oc-button" to={'/on-call/new' as any} search={{service: service.id} as any}>New rota</Link>}</article>)}</section>
      <WeekBands rotas={value.rotas} from={Date.parse(value.at) - 86_400_000} to={Date.parse(value.at) + 6 * 86_400_000}/>
    </>}
  </div>;
}
