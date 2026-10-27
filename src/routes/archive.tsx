import {createFileRoute, redirect} from "@tanstack/react-router";
export const Route = createFileRoute("/archive")({beforeLoad: () => {throw redirect({to: "/settings/archive", replace: true});}});
