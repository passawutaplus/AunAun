import type { ReactNode } from "react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { FeedModeTransition } from "@/components/feed/FeedModeTransition";
import { cn } from "@/lib/utils";

export type ProfileSectionTab = {
  value: string;
  label: ReactNode;
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
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        "relative rounded-full text-sm px-2.5 sm:px-4 py-2 font-normal transition-colors",
        active ? "text-white font-medium" : "text-muted-foreground hover:text-foreground",
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
      <span className="relative z-10">{tab.label}</span>
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
  const row1 = tabs.slice(0, 2);
  const row2 = tabs.slice(2);

  return (
    <div className={className}>
      <div className="px-3 sm:px-4 flex justify-center">
        <LayoutGroup id="profile-section-tabs">
          <div
            role="tablist"
            aria-label="หมวดเนื้อหาโปรไฟล์"
            className="glass-chip rounded-2xl sm:rounded-full p-1.5 h-auto gap-1 flex flex-col w-full sm:inline-flex sm:flex-row sm:flex-nowrap sm:w-max"
          >
            <div className="grid grid-cols-2 gap-1 w-full sm:contents">
              {row1.map((tab) => (
                <TabTrigger
                  key={tab.value}
                  tab={tab}
                  active={value === tab.value}
                  reduced={!!reduced}
                  onSelect={() => onValueChange(tab.value)}
                />
              ))}
            </div>
            {row2.length > 0 && (
              <div className="grid grid-cols-3 gap-1 w-full sm:contents">
                {row2.map((tab) => (
                  <TabTrigger
                    key={tab.value}
                    tab={tab}
                    active={value === tab.value}
                    reduced={!!reduced}
                    onSelect={() => onValueChange(tab.value)}
                  />
                ))}
              </div>
            )}
          </div>
        </LayoutGroup>
      </div>

      <FeedModeTransition modeKey={value} className="mt-6">
        <div role="tabpanel">{children}</div>
      </FeedModeTransition>
    </div>
  );
}
