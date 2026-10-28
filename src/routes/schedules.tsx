import {createFileRoute, redirect} from "@tanstack/react-router";
export const Route = createFileRoute("/schedules")({beforeLoad: () => {throw redirect({to: "/on-call", replace: true});}});
