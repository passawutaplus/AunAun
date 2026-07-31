import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  buildSettingsNavGroups,
  resolveSettingsPanel,
  settingsPanelHash,
  type SettingsNavGroup,
  type SettingsPanelId,
} from "@/lib/settingsNav";

type Props = {
  activePanel: SettingsPanelId;
  onSelect: (panel: SettingsPanelId) => void;
  isAdmin?: boolean;
  className?: string;
};

/** Grouped settings nav — click switches the active panel (no page scroll). */
export default function SettingsSideNav({
  activePanel,
  onSelect,
  isAdmin,
  className,
}: Props) {
  const groups = useMemo(() => buildSettingsNavGroups(isAdmin), [isAdmin]);
  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  return (
    <>
      <nav
        aria-label="เมนูตั้งค่า"
        className={cn("lg:hidden -mx-4 px-4 overflow-x-auto scrollbar-hide", className)}
      >
        <div className="flex gap-1.5 min-w-max pb-1">
          {flatItems.map((item) => {
            const active = activePanel === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors border",
                  active
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border/60 bg-secondary/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      <nav
        aria-label="เมนูตั้งค่า"
        className={cn(
          "hidden lg:block sticky top-20 self-start w-52 xl:w-56 shrink-0",
          className,
        )}
      >
        <div className="rounded-2xl glass-panel overflow-hidden py-1">
          {groups.map((group, index) => (
            <NavGroup
              key={group.id}
              group={group}
              activePanel={activePanel}
              onSelect={onSelect}
              showDivider={index > 0}
            />
          ))}
        </div>
      </nav>
    </>
  );
}

function NavGroup({
  group,
  activePanel,
  onSelect,
  showDivider,
}: {
  group: SettingsNavGroup;
  activePanel: SettingsPanelId;
  onSelect: (panel: SettingsPanelId) => void;
  showDivider?: boolean;
}) {
  return (
    <div className={cn(showDivider && "border-t border-border/70")}>
      <p className="px-3.5 pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-foreground/70">
        {group.label}
      </p>
      <ul className="flex flex-col pb-1.5">
        {group.items.map((item) => {
          const active = activePanel === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(
                  "relative w-full text-left px-3.5 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                )}
              >
                {active ? (
                  <span
                    className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary"
                    aria-hidden
                  />
                ) : null}
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Sync panel ↔ URL hash (for deep links / back button). */
export function useSettingsPanelState(isAdmin?: boolean): {
  panel: SettingsPanelId;
  setPanel: (panel: SettingsPanelId) => void;
} {
  const [panel, setPanelState] = useState<SettingsPanelId>(() =>
    typeof window === "undefined"
      ? "profile"
      : resolveSettingsPanel(window.location.hash, { isAdmin }),
  );

  useEffect(() => {
    setPanelState(resolveSettingsPanel(window.location.hash, { isAdmin }));
  }, [isAdmin]);

  useEffect(() => {
    const onHash = () => {
      setPanelState(resolveSettingsPanel(window.location.hash, { isAdmin }));
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [isAdmin]);

  const setPanel = (next: SettingsPanelId) => {
    setPanelState(next);
    try {
      const url = new URL(window.location.href);
      window.history.replaceState(
        null,
        "",
        `${url.pathname}${url.search}${settingsPanelHash(next)}`,
      );
    } catch {
      /* ignore */
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return { panel, setPanel };
}
