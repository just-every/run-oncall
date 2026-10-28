import {createFileRoute} from '@tanstack/react-router';
export const Route=createFileRoute('/on-call/new')({validateSearch:(search:Record<string,unknown>)=>({service:typeof search.service==='string'?search.service:''}),component:()=>null});
