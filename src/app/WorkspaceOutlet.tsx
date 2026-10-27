import {Outlet, useLocation} from '@tanstack/react-router';
import {Workspace} from '../routes/index';
import {isWorkspacePath} from './paths';

export function WorkspaceOutlet() {
  const {pathname} = useLocation();
  return isWorkspacePath(pathname) ? <Workspace /> : <Outlet />;
}
