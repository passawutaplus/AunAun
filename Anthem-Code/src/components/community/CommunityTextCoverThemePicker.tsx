import { COMMUNITY_TEXT_COVER_THEMES } from "@/lib/communityTextCover";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (themeId: string) => void;
  className?: string;
};

/** Swatch row for text-only post background — hidden when media is attached. */
export function CommunityTextCoverThemePicker({ value, onChange, className }: Props) {
  return (
    <div className={cn("px-4 pb-2", className)}>
      <p className="mb-1.5 text-[10px] text-muted-foreground">สีพื้นหลังโพสต์ข้อความ</p>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
        {COMMUNITY_TEXT_COVER_THEMES.map((theme) => {
          const active = value === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              aria-label={`พื้นหลัง ${theme.id}`}
              aria-pressed={active}
              onClick={() => onChange(theme.id)}
              className={cn(
                "shrink-0 h-8 w-8 rounded-lg border-2 transition-all",
                active
                  ? "border-primary scale-105 shadow-sm ring-2 ring-primary/25"
                  : "border-border/40 opacity-90 hover:opacity-100 hover:border-border",
              )}
              style={{ background: theme.background }}
            />
          );
        })}
      </div>
    </div>
  );
}
