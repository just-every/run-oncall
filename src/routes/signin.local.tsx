import { createFileRoute } from "@tanstack/react-router";
import { LocalDoor } from "../landing/LocalDoor";

export const Route = createFileRoute("/signin/local")({
  head: () => ({ meta: [{ title: "Sign in · Oncall" }] }),
  component: LocalDoor,
});
