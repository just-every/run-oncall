import type {Member, State} from './family/response-operations/domain';
import type {OnCall} from './on-call/read';

export const workspaceRefreshHeader = 'x-oncall-workspace-refresh';
export const workspaceStateHeader = 'x-oncall-workspace-version';
export const workspaceCoverageHeader = 'x-oncall-coverage-version';

type WorkspaceCoverage = {onCall?: OnCall; coverageVersion?: string; pagingRevision?: number};

export type WorkspaceSnapshot = WorkspaceCoverage & {
  member: Member | null;
  setup: boolean;
  state: State | null;
  stateVersion?: string;
  demo?: boolean;
  localSignInSettings?: boolean;
  moveIn?: {pagerdutyConnect: boolean};
};

export type WorkspaceRefresh = WorkspaceSnapshot | (WorkspaceCoverage & {unchanged: true});
