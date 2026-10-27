import {createFileRoute, redirect} from "@tanstack/react-router";
export const Route = createFileRoute("/move-in")({beforeLoad: () => {throw redirect({to: "/settings/move-in", replace: true});}});
