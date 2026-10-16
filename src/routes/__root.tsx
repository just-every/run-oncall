import { introGuardScript, introCss } from "../base/hydration/intro-guard";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { fontLinks } from "../brand/font-head";
import "../brand/tokens.css";

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
        <Outlet />
        <Scripts />
      </body>
    </html>
  ),
});
