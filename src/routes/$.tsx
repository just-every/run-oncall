import {createFileRoute, notFound} from "@tanstack/react-router";
import {isWorkspacePath} from '../app/paths';
export const Route = createFileRoute("/$")({
  beforeLoad: ({location}) => {if (!isWorkspacePath(location.pathname)) throw notFound();},
  component: () => null,
});
