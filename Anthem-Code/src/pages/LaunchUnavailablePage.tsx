import { Link, useLocation } from "react-router-dom";
import { Home, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LAUNCH_COMING_SOON_TH } from "@/lib/aplus1Launch";

/** Shown when a route exists but is outside the launch-minimal allowlist. */
export default function LaunchUnavailablePage() {
  const { pathname } = useLocation();

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md text-center space-y-5">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">ยังไม่เปิดในเวอร์ชันนี้</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{LAUNCH_COMING_SOON_TH}</p>
          {import.meta.env.DEV && (
            <p className="text-[11px] text-muted-foreground/80 font-mono break-all">{pathname}</p>
          )}
        </div>
        <Button asChild className="rounded-full gap-2">
          <Link to="/">
            <Home className="w-4 h-4" />
            กลับหน้าแรก
          </Link>
        </Button>
      </div>
    </main>
  );
}
