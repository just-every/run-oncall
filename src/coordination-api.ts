import { createApi } from './api-boundary';
import { installHeldKeys } from './api-keys';
import { authorizedState, body, installMemberGuard, sessionGuard } from './api-member';
import { installCommand } from './command-api';
import { installNativeSources } from './native-sources';
import { installReadiness } from './readiness/api';
import { installTriageReads } from './triage-read-api';
import { loadWorkspace } from './workspace-store';

export const coordinationApi = createApi();
installReadiness(coordinationApi);
installHeldKeys(coordinationApi);
installMemberGuard(coordinationApi);
installCommand(coordinationApi);
installNativeSources(coordinationApi, {body, load: loadWorkspace, guard: sessionGuard});
installTriageReads(coordinationApi, authorizedState);
