// Small line icons for the page chrome; 24px grid, currentColor strokes.
const paths = {
  people: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9c.6-3.4 3-5 6-5s5.4 1.6 6 5M16 4.6a3.4 3.4 0 0 1 0 6.3M18.2 15c1.6.7 2.6 2.3 2.8 5",
  plan: "M6.5 3.5h7l4 4v13h-11zM13.5 3.5v4h4M9 12h6M9 15.5h6",
  fee: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM14.8 8.6c-.6-.8-1.6-1.2-2.8-1.2-1.6 0-2.8.8-2.8 2.1 0 3 5.8 1.6 5.8 4.6 0 1.3-1.3 2.2-3 2.2-1.3 0-2.4-.5-3-1.4M12 5.6v1.8M12 16.3v2",
  people2: "M8 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2.5 19c.5-3 2.6-4.6 5.5-4.6s5 1.6 5.5 4.6M13.8 14.6c.7-.2 1.4-.2 2.2-.2 2.9 0 5 1.6 5.5 4.6",
  swap: "M4 8h14l-3.5-3.5M20 16H6l3.5 3.5",
  calendar: "M4.5 6.5h15v13h-15zM4.5 10.5h15M8.5 4v4M15.5 4v4",
  incident: "M12 3.5 19.5 6v6c0 4.3-3.2 7.4-7.5 8.5C7.7 19.4 4.5 16.3 4.5 12V6zM8.8 12.2l2.2 2.2 4.4-4.6",
  check: "M5 12.5l4.2 4.2L19 7",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg className="oc-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
