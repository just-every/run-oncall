import { fail, type State } from '../family/response-operations/domain';
import type { IntakeReceipt, IntakeSource } from '../intake/model';
import { exact } from './definition';
import { nativeIncompleteDetails } from '../native-incomplete-model';

export function validateNativeRoutingReceipt(state:State,source:IntakeSource,receipt:IntakeReceipt) {
  if(source.provider!=='native') {
    if(receipt.native!==undefined)fail('Unexpected native routing identity');
    return;
  }
  if(receipt.incomplete) {
    if(receipt.native!==undefined||!source.routing||!nativeIncompleteDetails(receipt))fail('Invalid native incomplete custody');
    return;
  }
  exact(receipt.native,['eventId','sourceGeneration','fingerprint']);
  const native=receipt.native!;
  if(!source.routing||receipt.observedAt===null||receipt.sender!=='intake:'+source.id||receipt.provider!=='native'||receipt.monitoring||receipt.incomplete||!['trigger','recover'].includes(receipt.action)||typeof native.eventId!=='string'||!native.eventId.trim()||native.eventId.length>200||typeof native.sourceGeneration!=='string'||!native.sourceGeneration.trim()||native.sourceGeneration.length>100||typeof native.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(native.fingerprint)||receipt.generation!==null&&receipt.generation!==native.sourceGeneration)fail('Invalid native routing identity');
  if(!receipt.routing?.readmission&&state.intakeReceipts?.some(r=>r!==receipt&&r.source===source.id&&!r.routing?.readmission&&r.native?.eventId===native.eventId))fail('Duplicate native routing event identity');
}
