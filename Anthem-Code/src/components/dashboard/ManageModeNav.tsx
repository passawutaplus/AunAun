import { BriefcaseBusiness, LayoutDashboard, WalletCards } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const MODES = [
  {
    to: "/portfolio/manage",
    label: "ผลงาน",
    icon: LayoutDashboard,
  },
  {
    to: "/dashboard",
    label: "จ้างงาน & คอลแลป",
    icon: BriefcaseBusiness,
  },
  {
    to: "/earnings",
    label: "กระเป๋า",
    icon: WalletCards,
  },
] as const;

export default function ManageModeNav({ className }: { className?: string }) {
  return (
    <nav
      aria-label="สลับโหมดแดชบอร์ด"
      className={cn("overflow-x-auto pb-1 scrollbar-hide", className)}
    >
      <div className="flex w-full min-w-max gap-1 rounded-2xl border border-border/70 bg-card/80 p-1 shadow-sm sm:min-w-0">
        {MODES.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              cn(
                "flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
