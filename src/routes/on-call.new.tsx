import {createFileRoute} from '@tanstack/react-router';
export const Route=createFileRoute('/on-call/new')({validateSearch:(search:Record<string,unknown>)=>(typeof search.service==='string'&&search.service?{service:search.service}:{}),component:()=>null});
