import {createFileRoute, redirect} from "@tanstack/react-router";
export const Route = createFileRoute("/routing")({beforeLoad: () => {throw redirect({to: "/settings/routing", replace: true});}});
