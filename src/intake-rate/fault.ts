import {Fault} from '../family/response-operations/domain';
export class BatchAllowanceFault extends Fault {
 readonly rateLimit;
 constructor(batchCount:number,allowance:number) {
  super(429,'Batch exceeds this key’s event allowance; split the request or ask an administrator to raise its allowance');
  this.rateLimit={code:'batch_exceeds_allowance',batchCount,allowance,instruction:'Split the request or raise the key event allowance'};
 }
}
export const rateFaultBody=(error:unknown)=>error instanceof BatchAllowanceFault?{rateLimit:error.rateLimit}:{};
