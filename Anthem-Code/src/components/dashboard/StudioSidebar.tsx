import { NavLink } from "react-router-dom";
import { Settings } from "lucide-react";
import { SignOutNavItem } from "@/components/SignOutNavItem";
import { STUDIO_NAV_GROUPS } from "@/lib/studioNav";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  onNavigate?: () => void;
  variant?: "panel" | "plain";
};

const linkBase =
  "relative block text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset";

function activeClass(isActive: boolean, nested: boolean) {
  return cn(
    linkBase,
    nested ? "py-2.5 pl-9 pr-3.5" : "flex items-center gap-2 px-3.5 py-2.5",
    isActive
      ? "bg-primary/10 font-medium text-primary"
      : nested
        ? "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
        : "font-medium text-foreground hover:bg-secondary/50",
  );
}

/** Grouped My Studio nav — top-level pages + finance children. */
export default function StudioSidebar({ className, onNavigate, variant = "panel" }: Props) {
  return (
    <nav
      aria-label="เมนู My Studio"
      className={cn(
        "py-1",
        variant === "panel" && "overflow-hidden rounded-2xl glass-panel",
        className,
      )}
    >
      {STUDIO_NAV_GROUPS.map((group, index) => {
        const Icon = group.icon;
        return (
          <div key={group.id} className={cn(index > 0 && "border-t border-border/70")}>
            {group.to ? (
              <NavLink
                to={group.to}
                end={group.end ?? true}
                onClick={onNavigate}
                className={({ isActive }) => activeClass(isActive, false)}
              >
                {({ isActive }) => (
                  <>
                    {isActive ? (
                      <span
                        className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary"
                        aria-hidden
                      />
                    ) : null}
                    <Icon
                      className={cn("h-4 w-4 shrink-0", !isActive && "text-muted-foreground")}
                      aria-hidden
                    />
                    <span>{group.label}</span>
                  </>
                )}
              </NavLink>
            ) : (
              <div className="flex items-center gap-2 px-3.5 pb-1 pt-3">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <p className="text-sm font-medium text-foreground">{group.label}</p>
              </div>
            )}
            {group.items.length > 0 ? (
              <ul className="flex flex-col pb-1.5">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      className={({ isActive }) => activeClass(isActive, true)}
                    >
                      {({ isActive }) => (
                        <>
                          {isActive ? (
                            <span
                              className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary"
                              aria-hidden
                            />
                          ) : null}
                          {item.label}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
      <div className="border-t border-border/70">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) => activeClass(isActive, false)}
        >
          {({ isActive }) => (
            <>
              {isActive ? (
                <span
                  className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary"
                  aria-hidden
                />
              ) : null}
              <Settings
                className={cn("h-4 w-4 shrink-0", !isActive && "text-muted-foreground")}
                aria-hidden
              />
              <span>ตั้งค่า</span>
            </>
          )}
        </NavLink>
      </div>
      <div className="border-t border-border/70">
        <SignOutNavItem onSignedOut={onNavigate} />
      </div>
    </nav>
  );
}
