import "../app/shell.css";
import "../app/incidents.css";
import "../brand/tokens.css";
import { introGuardScript, introCss } from "../base/hydration/intro-guard";
import {
  HeadContent,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { WorkspaceOutlet } from "../app/WorkspaceOutlet";
import { fontLinks } from "../brand/font-head";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Oncall" },
    ],
    links: [...fontLinks, { rel: "icon", href: "/brand/mark.svg", type: "image/svg+xml" }],
  }),
  notFoundComponent: () => <h1>Not found</h1>,
  component: () => (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: introGuardScript }} />
        <style>{introCss}</style>
        <link rel="stylesheet" href="/rer-theme.css" />
        <HeadContent />
      </head>
      <body>
        <WorkspaceOutlet />
        <Scripts />
      </body>
    </html>
  ),
});
