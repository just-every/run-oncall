import { createFileRoute } from "@tanstack/react-router";
import { installationTitle } from "../identity";
import { LocalDoor } from "../landing/LocalDoor";

export const Route = createFileRoute("/signin/local")({
  head: () => ({ meta: [{ title: installationTitle() }] }),
  component: LocalDoor,
});
