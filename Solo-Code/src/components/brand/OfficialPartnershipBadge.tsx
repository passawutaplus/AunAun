import logoUrl from "@/assets/solo-freelancer-logo.webp";
import { LineGlyph } from "@/components/LineContactButton";
import { SITE_NAME } from "@/lib/siteUrl";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  compact?: boolean;
  locale?: "th" | "en";
};

const COPY = {
  th: (name: string) => `ลิงก์อย่างเป็นทางการจาก ${name} · แจ้งเตือนผ่านไลน์`,
  en: (name: string) => `Official link from ${name} · LINE notifications`,
} as const;

/** So1o logo × LINE — trust badge for LINE connect & settings. */
export function OfficialPartnershipBadge({ className, compact, locale = "th" }: Props) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="flex items-center justify-center gap-2.5">
        <img
          src={logoUrl}
          alt={SITE_NAME}
          width={compact ? 24 : 32}
          height={compact ? 24 : 32}
          className={cn(
            "rounded-lg object-cover ring-1 ring-border",
            compact ? "h-6 w-6" : "h-8 w-8",
          )}
        />
        <span className="text-muted-foreground text-sm font-medium" aria-hidden>
          ×
        </span>
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-lg bg-[#06C755] text-white shadow-sm",
            compact ? "h-6 w-6" : "h-8 w-8",
          )}
        >
          <LineGlyph className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </span>
      </div>
      {!compact && (
        <p className="text-[11px] text-muted-foreground text-center leading-relaxed max-w-[240px]">
          {COPY[locale](SITE_NAME)}
        </p>
      )}
    </div>
  );
}
