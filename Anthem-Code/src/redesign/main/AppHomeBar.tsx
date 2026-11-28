import type { MouseEvent, ReactNode } from "react";

export type HomeMode = "showcase" | "creators" | "event";

const MODES: readonly { key: HomeMode; label: string }[] = [
  { key: "showcase", label: "Showcase" },
  { key: "creators", label: "Creators" },
  { key: "event", label: "Event" },
];

/** The old app's mode icons (grid, people) and the tab bar's calendar for Event, in the new design's thin line. */
function ModeIcon({ mode }: { mode: HomeMode }) {
  const common = {
    "aria-hidden": true,
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.33,
    strokeLinejoin: "round" as const,
  };
  if (mode === "showcase") {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
        <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
        <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
        <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
      </svg>
    );
  }
  if (mode === "creators") {
    return (
      <svg {...common} strokeLinecap="round">
        <circle cx="9.5" cy="8.5" r="3.5" />
        <path d="M3.5 19.5a6 6 0 0 1 12 0" />
        <path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6M17.5 14.2a6 6 0 0 1 3 5.3" />
      </svg>
    );
  }
  // Event: the tab bar's calendar (owner 2026-11-28).
  return (
    <svg {...common} strokeLinecap="round">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

type SwitchProps = {
  value: HomeMode;
  onPick: (mode: HomeMode) => void;
  /** Icon + name and the Event mode (the search screen). The header shows icons only, without Event:
   *  the tab bar's calendar already opens it (owner 2026-11-28). */
  labels?: boolean;
};

/** Showcase / Creators (/ Event) as one capsule, like the old app's mode pill. */
export function AppModeSwitch({ value, onPick, labels = false }: SwitchProps) {
  return (
    <div role="group" aria-label="เลือกมุมมอง" className="ap-modes" data-labels={labels ? "" : undefined}>
      {MODES.filter(({ key }) => labels || key !== "event").map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className="ap-mode"
          aria-label={labels ? undefined : label}
          title={labels ? undefined : label}
          aria-pressed={value === key}
          onClick={() => onPick(key)}
        >
          <ModeIcon mode={key} />
          {labels ? <span>{label}</span> : null}
        </button>
      ))}
    </div>
  );
}

export type ActiveFilter = { key: string; label: ReactNode; name: string; onRemove: () => void };

/**
 * Store app home: the categories and views moved into the search screen, so the filters in use show here
 * as small tags; a tag opens the search screen, its × drops that filter.
 */
export function AppActiveFilters({ items, onOpen }: { items: ActiveFilter[]; onOpen: (e: MouseEvent<HTMLButtonElement>) => void }) {
  if (!items.length) return null;
  return (
    <div className="ap-active" role="group" aria-label="ตัวกรองที่ใช้อยู่">
      {items.map((it) => (
        <span key={it.key} className="ap-tag">
          <button type="button" className="ap-tag-t" aria-haspopup="dialog" onClick={onOpen}>
            {it.label}
          </button>
          <button type="button" className="ap-tag-x" aria-label={`เอา ${it.name} ออก`} onClick={it.onRemove}>
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </span>
      ))}
    </div>
  );
}

type BarProps = {
  mode: HomeMode;
  onPick: (mode: HomeMode) => void;
  onSearch: (e: MouseEvent<HTMLButtonElement>) => void;
  /** Before the search button, with a thin vertical rule (the Event page's When menu). */
  lead?: ReactNode;
  /** A second header row (the Event page's type chips), which hides and returns with the header. */
  below?: ReactNode;
};

/**
 * Store app home, right end of the header: search, then the mode switch (the bell sits before them).
 * On the Event page there is no mode switch — the tab bar's Event tab is the way in (owner 2026-11-28).
 */
export default function AppHomeBar({ mode, onPick, onSearch, lead, below }: BarProps) {
  return (
    <>
      {lead ? (
        <>
          <div className="ap-hd-lead">{lead}</div>
          <span aria-hidden="true" className="ap-hd-rule" />
        </>
      ) : null}
      <button type="button" aria-label="ค้นหา" title="ค้นหา" aria-haspopup="dialog" className="sc-ib" onClick={onSearch}>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.33" strokeLinecap="round">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4 4" />
        </svg>
      </button>
      {mode === "event" ? null : <AppModeSwitch value={mode} onPick={onPick} />}
      {below ? <div className="ap-hd-below">{below}</div> : null}
    </>
  );
}
