import * as React from "react";
import { Link } from "@tanstack/react-router";
import { FlaskConical, X } from "lucide-react";
import { isDemoMode } from "@/lib/demoMode";
import { DEMO_BANNER_SHORT } from "@/lib/copyConstants";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "so1o.demo-banner.dismissed";

export function DemoModeBanner() {
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!isDemoMode() || dismissed) return null;

  return (
    <div
      role="status"
      className={cn(
        "sticky top-0 z-[60] border-b border-amber-500/30 bg-amber-50/95 text-amber-950",
        "dark:bg-amber-950/90 dark:text-amber-50 dark:border-amber-400/20",
        "backdrop-blur supports-[backdrop-filter]:bg-amber-50/80",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-start gap-2 px-3 py-2 sm:items-center sm:px-5">
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300 sm:mt-0" />
        <p className="flex-1 text-xs leading-relaxed sm:text-sm">
          {DEMO_BANNER_SHORT}{" "}
          <Link
            to="/research"
            className="text-primary font-medium hover:underline whitespace-nowrap"
          >
            คู่มือ UX
          </Link>
        </p>
        <button
          type="button"
          aria-label="ปิดแบนเนอร์"
          className="shrink-0 rounded-md p-1 hover:bg-amber-200/60 dark:hover:bg-amber-800/60"
          onClick={() => {
            setDismissed(true);
            try {
              sessionStorage.setItem(DISMISS_KEY, "1");
            } catch {
              /* noop */
            }
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
