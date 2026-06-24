import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  user: boolean;
};

export function LandingStickyCta({ user }: Props) {
  const [visible, setVisible] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero || dismissed) return;

    const io = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), {
      threshold: 0,
      rootMargin: "0px",
    });
    io.observe(hero);
    return () => io.disconnect();
  }, [dismissed]);

  if (dismissed || !visible) return null;

  return (
    <div className={cn("fixed bottom-0 inset-x-0 z-40 p-3 sm:hidden", "animate-fade-in")}>
      <div className="glass border border-border rounded-2xl shadow-elevated px-3 py-2.5 flex items-center gap-2">
        <Link
          to={user ? "/dashboard" : "/apply"}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-primary text-primary-foreground px-4 py-2.5 text-xs font-semibold"
        >
          {user ? "เข้า Dashboard" : "สมัครฟรี"}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <button
          type="button"
          aria-label="ปิด"
          onClick={() => setDismissed(true)}
          className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
