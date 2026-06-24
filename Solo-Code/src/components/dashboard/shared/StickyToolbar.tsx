import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToolbarAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
  title?: string;
}

interface StickyToolbarProps {
  leading?: React.ReactNode;
  title?: React.ReactNode;
  badge?: React.ReactNode;
  /** Always visible (max ~2 items recommended) */
  primaryActions?: ToolbarAction[];
  /** Visible on lg+, collapsed into a ⋯ menu on smaller viewports */
  secondaryActions?: ToolbarAction[];
  /** Vertical offset from top in px (account for site header). Defaults to 60. */
  offsetTop?: number;
  className?: string;
}

/**
 * Reusable sticky page toolbar.
 * - Wraps gracefully on narrow screens (info row + actions row)
 * - Secondary actions collapse into a dropdown below `lg`
 */
export function StickyToolbar({
  leading,
  title,
  badge,
  primaryActions = [],
  secondaryActions = [],
  offsetTop = 60,
  className,
}: StickyToolbarProps) {
  return (
    <div
      className={cn(
        "no-print sticky z-30 rounded-2xl glass border border-border shadow-soft",
        "p-2 sm:p-2.5",
        "flex items-center justify-between gap-2 flex-wrap",
        className,
      )}
      style={{ top: offsetTop }}
    >
      {/* Left: leading + title + badge */}
      <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial">
        {leading}
        {title && (
          <div className="text-xs text-muted-foreground truncate min-w-0 hidden sm:block">
            {title}
          </div>
        )}
        {badge}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
        {/* Secondary — desktop flat */}
        <div className="hidden lg:flex items-center gap-2">
          {secondaryActions.map((a) => (
            <Button
              key={a.label}
              onClick={a.onClick}
              variant={a.variant ?? "outline"}
              className={cn("gap-1.5 h-9", a.className)}
              title={a.title}
            >
              {a.icon}
              <span className="hidden xl:inline">{a.label}</span>
              <span className="xl:hidden">
                {a.label.length > 8 ? a.label.slice(0, 8) + "…" : a.label}
              </span>
            </Button>
          ))}
        </div>

        {/* Secondary — mobile/tablet overflow menu */}
        {secondaryActions.length > 0 && (
          <div className="lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9" title="ตัวเลือกเพิ่มเติม">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {secondaryActions.map((a) => (
                  <DropdownMenuItem
                    key={a.label}
                    onSelect={(e) => {
                      e.preventDefault();
                      a.onClick();
                    }}
                    className="gap-2"
                  >
                    {a.icon}
                    <span>{a.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Primary — always visible */}
        {primaryActions.map((a) => (
          <Button
            key={a.label}
            onClick={a.onClick}
            variant={a.variant ?? "default"}
            className={cn(
              "gap-1.5 h-9",
              !a.variant && "bg-primary hover:bg-primary/90 text-primary-foreground",
              a.className,
            )}
            title={a.title}
          >
            {a.icon}
            <span className="hidden sm:inline">{a.label}</span>
            <span className="sm:hidden">
              {a.label.length > 10 ? a.label.slice(0, 10) + "…" : a.label}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
