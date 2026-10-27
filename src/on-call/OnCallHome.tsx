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
    {value && <><section className="oc-rota-list" aria-label="Rotas">{value.rotas.map(rota => <RotaRow key={rota.id} rota={rota}/>)}{value.unrostered.map(service => <article className="oc-rota-row oc-no-rota" key={service.id}><div><h2>{service.name}</h2><p>No rota</p></div>{teamCoverage(state, actor, service.id) && <Link className="oc-button" to={'/on-call/new' as any} search={{service: service.id} as any}>New rota</Link>}</article>)}</section>
      <WeekBands rotas={value.rotas} from={Date.parse(value.at) - 86_400_000} to={Date.parse(value.at) + 6 * 86_400_000}/>
    </>}
  </div>;
}
