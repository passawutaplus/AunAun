import { LayoutGrid, Users, Building2, Orbit, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { isAplus1LaunchMinimal, isLaunchDesignDrillEnabled } from "@/lib/aplus1Launch";

export type FeedMode = "projects" | "designers" | "studios" | "community";

type ToggleItem = {
  id: FeedMode | "drill";
  label: string;
  icon: typeof LayoutGrid;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
};

interface Props {
  value: FeedMode;
  drillActive?: boolean;
  onChange: (v: FeedMode) => void;
  onDrillSelect?: () => void;
}

const items: ToggleItem[] = [
  { id: "projects", label: "Projects", icon: LayoutGrid, desktopOnly: true },
  { id: "community", label: "Area", icon: Orbit, desktopOnly: true },
  { id: "drill", label: "Design Drill", icon: Target, mobileOnly: true },
  { id: "designers", label: "Designers", icon: Users },
  { id: "studios", label: "Studios", icon: Building2 },
];

const launchItems = items.filter(
  (item) => item.id === "projects" || item.id === "designers",
);

const FeedModeToggle = ({ value, drillActive = false, onChange, onDrillSelect }: Props) => {
  const visible = (isAplus1LaunchMinimal() ? launchItems : items).filter(
    (item) => item.id !== "drill" || isLaunchDesignDrillEnabled(),
  );

  return (
    <div className="shrink-0 flex items-center rounded-full glass-panel p-0.5">
      {visible.map(({ id, label, icon: Icon, mobileOnly, desktopOnly }) => {
        const active = id === "drill" ? drillActive : value === id;
        const visibility = mobileOnly
          ? "flex lg:hidden"
          : desktopOnly
            ? "hidden lg:flex"
            : "flex";

        return (
          <button
            key={id}
            type="button"
            aria-label={`${label} view`}
            aria-current={active ? "page" : undefined}
            onClick={() => (id === "drill" ? onDrillSelect?.() : onChange(id))}
            className={cn(
              "items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition",
              visibility,
              active
                ? "bg-gradient-brand text-white"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default FeedModeToggle;
