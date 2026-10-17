import type { Decision } from '../family/response-operations/domain.ts';

export type RoutingCondition = {field:string;op:'equals'|'contains'|'exists'|'matches'|'not-matches';value?:string};
export type RoutingRule = {id:string;match:'all'|'any';conditions:RoutingCondition[];target:{service:string}|{field:string;pattern?:string;group?:number}};
export type RoutingVersion = {version:number;rules:RoutingRule[];catchAll:string|null;publishedBy:string;publishedAt:string};
export type RoutingDefinition = {scope:string[];owner:string;versions:RoutingVersion[]};
export type RoutingEvaluation = {rule:string;conditions:boolean[];matched:boolean};
export type RoutingExplanation = {
  key:string;version:number;rule:string|null;kind:'rule'|'dynamic'|'catch-all'|'readmission';service:string|null;
  evaluated:RoutingEvaluation[];dynamic?:{field:string;value:string;serviceName?:string};diagnostics:string[];
  serviceDecision:(Decision & {event:string})|null;
  readmission?:{receipt:string;operationId:string;by:string};
};
export type RoutingPreview = {baseVersion:number;decisions:{receipt:string;historical:RoutingExplanation;proposed:RoutingExplanation;changed:boolean;warning?:string}[];warnings:string[]};
