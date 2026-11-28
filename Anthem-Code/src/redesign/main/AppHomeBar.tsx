import type { MouseEvent } from "react";

export type HomeMode = "showcase" | "creators" | "event";

const MODES: readonly { key: HomeMode; label: string }[] = [
  { key: "showcase", label: "Showcase" },
  { key: "creators", label: "Creators" },
  { key: "event", label: "Event" },
];

/** The old app's mode icons (grid, people, three hung frames) drawn in the new design's thin line. */
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
  return (
    <svg {...common}>
      <rect x="3.5" y="8" width="4.5" height="9" rx="1" />
      <rect x="9.75" y="5" width="4.5" height="15" rx="1" />
      <rect x="16" y="8" width="4.5" height="9" rx="1" />
    </svg>
  );
}

type SwitchProps = {
  value: HomeMode;
  onPick: (mode: HomeMode) => void;
  /** Icon + name (the search screen); the header shows icons only. */
  labels?: boolean;
};

/** Showcase / Creators / Event as one capsule, like the old app's mode pill. */
export function AppModeSwitch({ value, onPick, labels = false }: SwitchProps) {
  return (
    <div role="group" aria-label="เลือกมุมมอง" className="ap-modes" data-labels={labels ? "" : undefined}>
      {MODES.map(({ key, label }) => (
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

type BarProps = {
  mode: HomeMode;
  onPick: (mode: HomeMode) => void;
  onSearch: (e: MouseEvent<HTMLButtonElement>) => void;
};

/** Store app home, right end of the header: search, then the mode switch (the bell sits before them). */
export default function AppHomeBar({ mode, onPick, onSearch }: BarProps) {
  return (
    <>
      <button type="button" aria-label="ค้นหา" title="ค้นหา" aria-haspopup="dialog" className="sc-ib" onClick={onSearch}>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.33" strokeLinecap="round">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4 4" />
        </svg>
      </button>
      <AppModeSwitch value={mode} onPick={onPick} />
    </>
  );
}
