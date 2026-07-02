import {
  COMMUNITY_MEDIA_ASPECT_ORDER,
  COMMUNITY_MEDIA_ASPECTS,
  type CommunityMediaAspect,
} from "@/lib/communityMediaAspect";
import { cn } from "@/lib/utils";

type Props = {
  value: CommunityMediaAspect;
  onChange: (aspect: CommunityMediaAspect) => void;
  disabled?: boolean;
  className?: string;
};

export function CommunityMediaAspectPicker({ value, onChange, disabled, className }: Props) {
  return (
    <div className={cn("grid grid-cols-3 sm:grid-cols-5 gap-1.5", className)}>
      {COMMUNITY_MEDIA_ASPECT_ORDER.map((key) => {
        const meta = COMMUNITY_MEDIA_ASPECTS[key];
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(key)}
            className={cn(
              "flex-1 min-w-0 rounded-xl border px-2 py-2 text-center transition-colors",
              active
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border/70 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            <span className="block text-[11px] font-medium truncate">{meta.label}</span>
            <span className="block text-[10px] opacity-70">{meta.ratioLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
