import type { ReactNode } from "react";

// Line icons for the workspace navigation, drawn on a 24px grid like the homepage's icons.
const paths: Record<string, ReactNode> = {
  "on-call": <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m10 3-.7 2.5-2.3 1L4.6 6 3 8.8l1.8 1.8v2.8L3 15.2 4.6 18l2.4-.5 2.3 1L10 21h4l.7-2.5 2.3-1 2.4.5 1.6-2.8-1.8-1.8v-2.8L21 8.8 19.4 6l-2.4.5-2.3-1L14 3Z" /></>,
  incidents: <path d="M12 3.5 20.5 12 12 20.5 3.5 12Z M12 8.5 15.5 12 12 15.5 8.5 12Z" />,
  alerts: <><path d="M12 4 21 19.5H3Z" /><path d="M12 10v4.5M12 17.2v.3" /></>,
  status: <><circle cx="12" cy="12" r="8.5" /><path d="m7 12 3 3 7-7" /></>,
  reviews: <><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" /></>,
};

export function NavIcon({ name }: { name: string }) {
  return (
    <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
