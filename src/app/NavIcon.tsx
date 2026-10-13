import type { ReactNode } from "react";

// Line icons for the workspace navigation, drawn on a 24px grid like the homepage's icons.
const paths: Record<string, ReactNode> = {
  incidents: <path d="M12 3.5 20.5 12 12 20.5 3.5 12Z M12 8.5 15.5 12 12 15.5 8.5 12Z" />,
  alerts: <><path d="M12 4 21 19.5H3Z" /><path d="M12 10v4.5M12 17.2v.3" /></>,
  services: <path d="M12 4.5 19.5 12 12 19.5 4.5 12Z" />,
  routing: <path d="M6 18 18 6M9.5 6H18v8.5" />,
  schedules: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  "move-in": <path d="M4.5 8.5h14m-3.5-3.5 3.5 3.5-3.5 3.5M19.5 15.5h-14m3.5-3.5-3.5 3.5 3.5 3.5" />,
  reviews: <><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" /></>,
  team: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c.6-3.9 3.3-6 7-6s6.4 2.1 7 6" /></>,
  archive: <><rect x="4" y="5" width="16" height="4.5" rx="1.2" /><path d="M5.5 9.5V18a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V9.5M10 13.5h4" /></>,
};

export function NavIcon({ name }: { name: string }) {
  return (
    <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
