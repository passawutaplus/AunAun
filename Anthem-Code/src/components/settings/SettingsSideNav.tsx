import { useEffect, useMemo, useState } from "react";
import { SignOutNavItem } from "@/components/SignOutNavItem";
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
  /** Close a mobile sheet after picking a panel. */
  onNavigate?: () => void;
  variant?: "panel" | "plain";
};

/** Grouped settings nav — click switches the active panel (no page scroll). */
export default function SettingsSideNav({
  activePanel,
  onSelect,
  isAdmin,
  className,
  onNavigate,
  variant = "panel",
}: Props) {
  const groups = useMemo(() => buildSettingsNavGroups(isAdmin), [isAdmin]);

  const pick = (id: SettingsPanelId) => {
    onSelect(id);
    onNavigate?.();
  };

  return (
    <nav
      aria-label="เมนูตั้งค่า"
      className={cn(
        variant === "panel" && "hidden lg:block sticky top-20 self-start w-52 xl:w-56 shrink-0",
        className,
      )}
    >
      <div
        className={cn(
          "py-1",
          variant === "panel" && "overflow-hidden rounded-2xl glass-panel",
        )}
      >
        {groups.map((group, index) => (
          <NavGroup
            key={group.id}
            group={group}
            activePanel={activePanel}
            onSelect={pick}
            showDivider={index > 0}
          />
        ))}
        <div className="border-t border-border/70">
          <SignOutNavItem onSignedOut={onNavigate} />
        </div>
      </div>
    </nav>
  );
}

const itemBase =
  "relative block w-full text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset";

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
  const Icon = group.icon;
  return (
    <div className={cn(showDivider && "border-t border-border/70")}>
      <div className="flex items-center gap-2 px-3.5 pb-1 pt-3">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium text-foreground">{group.label}</p>
      </div>
      <ul className="flex flex-col pb-1.5">
        {group.items.map((item) => {
          const active = activePanel === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(
                  itemBase,
                  "py-2.5 pl-9 pr-3.5",
                  active
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
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
