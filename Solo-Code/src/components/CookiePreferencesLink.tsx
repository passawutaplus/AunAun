import { openCookiePreferences } from "@/lib/cookieConsent";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  children?: React.ReactNode;
};

/** Opens the cookie preferences panel from footer / legal pages. */
export function CookiePreferencesLink({ className, children }: Props) {
  return (
    <button
      type="button"
      onClick={() => openCookiePreferences()}
      className={cn("hover:underline text-left", className)}
    >
      {children ?? "จัดการคุกกี้"}
    </button>
  );
}
