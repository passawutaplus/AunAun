import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { BRAND_LINE_CONTACT_URL, BRAND_LINE_ID, BRAND_NAME, BRAND_SUPPORT_EMAIL } from "@/lib/brandConfig";
import { getNativeAppVersion } from "@/lib/appShell";
import { cn } from "@/lib/utils";

type LegalLink = { label: string; to: string } | { label: string; href: string };

/** Moved here from the site footer, which the Android app does not show. */
const SETTINGS_LEGAL_LINKS: LegalLink[] = [
  { label: "ข้อกำหนดการใช้งาน", to: "/legal/terms" },
  { label: "นโยบายความเป็นส่วนตัว", to: "/legal/privacy" },
  { label: "ศูนย์ช่วยเหลือ", to: "/help" },
  { label: "แจ้งละเมิดลิขสิทธิ์", to: "/legal/copyright-report" },
  { label: "เกี่ยวกับ SAMECOR", to: "/learn" },
  { label: `ติดต่อ ${BRAND_SUPPORT_EMAIL}`, href: `mailto:${BRAND_SUPPORT_EMAIL}` },
];

const rowClass =
  "flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm text-foreground active:bg-accent";

/** Legal + help links as a card list (phone settings list), plus the LINE@ button. */
export function SettingsLegalList({ className }: { className?: string }) {
  return (
    <div className={className}>
      <p className="px-1 pb-1.5 text-xs font-medium text-muted-foreground">กฎหมายและความช่วยเหลือ</p>
      <ul className="divide-y divide-border/50 overflow-hidden rounded-2xl glass-panel">
        {SETTINGS_LEGAL_LINKS.map((item) => (
          <li key={item.label}>
            {"to" in item ? (
              <Link to={item.to} className={rowClass}>
                {item.label}
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
              </Link>
            ) : (
              <a href={item.href} className={rowClass}>
                {item.label}
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
              </a>
            )}
          </li>
        ))}
      </ul>
      <LineButton className="mt-3" />
    </div>
  );
}

/** Same links as a compact block under the desktop side nav. */
export function SettingsLegalNav({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl glass-panel px-3.5 py-2.5", className)}>
      <p className="pb-1 text-xs font-medium text-muted-foreground">กฎหมายและความช่วยเหลือ</p>
      <ul>
        {SETTINGS_LEGAL_LINKS.map((item) => (
          <li key={item.label}>
            {"to" in item ? (
              <Link to={item.to} className="block py-1.5 text-sm text-foreground/80 hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <a href={item.href} className="block py-1.5 text-sm text-foreground/80 hover:text-foreground">
                {item.label}
              </a>
            )}
          </li>
        ))}
      </ul>
      <LineButton className="mt-2" compact />
    </div>
  );
}

function LineGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 3C6.5 3 2 6.6 2 11c0 3.9 3.5 7.2 8.2 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.2 1c0 .3-.2 1 .9.5 1.1-.5 6-3.5 8.2-6 1.5-1.7 2.2-3.4 2.2-4.9C22 6.6 17.5 3 12 3z" />
    </svg>
  );
}

/** Opens the LINE Official Account (@samecor). LINE's own green, as in the notification settings. */
function LineButton({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <a
      href={BRAND_LINE_CONTACT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center justify-center gap-2 rounded-2xl bg-[#06C755] font-medium text-white transition-opacity hover:opacity-90 active:opacity-80",
        compact ? "px-3 py-2 text-xs" : "px-4 py-3.5 text-sm",
        className,
      )}
    >
      <LineGlyph className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      คุยกับเราทาง LINE {BRAND_LINE_ID}
    </a>
  );
}

/** "เวอร์ชันแอป 1.0.2 (3)" — only inside the Android app, and only once the app has the version bridge. */
export function AppVersionRow({ className }: { className?: string }) {
  const version = getNativeAppVersion();
  if (!version) return null;
  return (
    <p className={cn("text-center text-xs text-muted-foreground", className)}>
      เวอร์ชันแอป {version}
    </p>
  );
}

export function CopyrightLine({ className }: { className?: string }) {
  return (
    <p className={cn("text-center text-xs text-muted-foreground", className)}>
      © {new Date().getFullYear()} {BRAND_NAME} · All rights reserved
    </p>
  );
}
