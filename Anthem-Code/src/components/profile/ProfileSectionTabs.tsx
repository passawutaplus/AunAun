import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import ProfileTabHeading from "@/components/profile/ProfileTabHeading";
import { FeedModeTransition } from "@/components/feed/FeedModeTransition";
import { profileTabIcon } from "@/lib/profileTabIcons";
import { cn } from "@/lib/utils";

export type ProfileSectionTab = {
  value: string;
  label: ReactNode;
  /** Shown as a small number after the label; hidden at 0. */
  count?: number;
  /** The panel renders its own big heading (e.g. About Me has actions beside it). */
  ownHeading?: boolean;
};

type ProfileSectionTabsProps = {
  tabs: ProfileSectionTab[];
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
};

const indicatorTransition = {
  type: "spring",
  stiffness: 380,
  damping: 32,
} as const;

const tabId = (value: string) => `profile-tab-${value}`;
const panelId = (value: string) => `profile-panel-${value}`;

function TabTrigger({
  tab,
  active,
  reduced,
  onSelect,
}: {
  tab: ProfileSectionTab;
  active: boolean;
  reduced: boolean;
  onSelect: () => void;
}) {
  const Icon = profileTabIcon(tab.label);
  return (
    <button
      type="button"
      role="tab"
      id={tabId(tab.value)}
      aria-selected={active}
      aria-controls={panelId(tab.value)}
      tabIndex={active ? 0 : -1}
      onClick={onSelect}
      className={cn(
        "relative shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] uppercase tracking-wide transition-colors sm:px-4",
        active ? "font-medium text-primary-foreground" : "font-normal text-muted-foreground hover:text-foreground",
      )}
    >
      {active &&
        (reduced ? (
          <span className="absolute inset-0 rounded-full bg-gradient-brand" aria-hidden />
        ) : (
          <motion.span
            layoutId="profile-section-tab-indicator"
            className="absolute inset-0 rounded-full bg-gradient-brand"
            transition={indicatorTransition}
            aria-hidden
          />
        ))}
      <span className="relative z-10 inline-flex items-center gap-1.5">
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
        <span>
        {tab.label}
        {typeof tab.count === "number" && tab.count > 0 ? (
          <span className="ml-1.5 text-[11px] font-normal tabular-nums tracking-normal opacity-70">
            {tab.count}
          </span>
        ) : null}
        </span>
      </span>
    </button>
  );
}

/** Profile content tabs — sliding pill indicator + cross-fade content swap. */
export function ProfileSectionTabs({
  tabs,
  value,
  onValueChange,
  children,
  className,
}: ProfileSectionTabsProps) {
  const reduced = useReducedMotion();
  const listRef = useRef<HTMLDivElement>(null);
  const active = tabs.find((t) => t.value === value);

  // On phones the row scrolls sideways: keep the selected tab in view.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>("[aria-selected='true']")
      ?.scrollIntoView({ block: "nearest", inline: "center", behavior: reduced ? "auto" : "smooth" });
  }, [value, reduced]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const index = Math.max(
      0,
      tabs.findIndex((t) => t.value === value),
    );
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? tabs.length - 1
          : (index + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    onValueChange(tabs[next].value);
    listRef.current?.querySelector<HTMLElement>(`#${tabId(tabs[next].value)}`)?.focus();
  };

  return (
    <div className={className}>
      <div className="flex justify-center px-3 sm:px-4">
        <LayoutGroup id="profile-section-tabs">
          <div
            ref={listRef}
            role="tablist"
            aria-label="หมวดเนื้อหาโปรไฟล์"
            onKeyDown={onKeyDown}
            className="glass-chip flex w-full gap-1 overflow-x-auto rounded-full p-1.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:w-max sm:max-w-full [&::-webkit-scrollbar]:hidden"
          >
            {tabs.map((tab) => (
              <TabTrigger
                key={tab.value}
                tab={tab}
                active={value === tab.value}
                reduced={!!reduced}
                onSelect={() => onValueChange(tab.value)}
              />
            ))}
          </div>
        </LayoutGroup>
      </div>

      <FeedModeTransition modeKey={value} className="mt-8">
        <div role="tabpanel" id={panelId(value)} aria-labelledby={tabId(value)}>
          {active && !active.ownHeading && typeof active.label === "string" ? (
            <ProfileTabHeading title={active.label} count={active.count} className="mb-4" />
          ) : null}
          {children}
        </div>
      </FeedModeTransition>
    </div>
  );
}
