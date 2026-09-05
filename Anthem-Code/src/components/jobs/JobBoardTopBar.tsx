import { ArrowLeft, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HeaderAccountActions } from "@/components/HeaderAccountActions";
import { FEED_PAGE_GUTTER_X } from "@/components/feed/FeedHero";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { requireAuth } from "@/lib/requireAuth";
import { cn } from "@/lib/utils";

/** Full-width hiring board header — same chrome as chat (`h-14`). */
export function JobBoardTopBar() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const goHome = () => {
    localStorage.setItem("feed-mode", "projects");
    navigate("/", { state: { feedHomeReset: Date.now() } });
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background">
      <div className={cn("mx-auto flex h-14 max-w-[1920px] items-center gap-2", FEED_PAGE_GUTTER_X)}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          aria-label="กลับหน้าแรก"
          title="กลับหน้าแรก"
          onClick={goHome}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold tracking-tight text-foreground">
          <Briefcase className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">
            They are <span className="font-bold">HIRING</span>
          </span>
        </h1>
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-8 shrink-0 gap-1 rounded-full border-primary/40 px-2.5 text-xs text-primary hover:bg-primary/5 hover:text-primary"
            onClick={() => requireAuth(user, () => navigate("/hiring/new"))}
            aria-label="ลงประกาศรับสมัคร"
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span className="whitespace-nowrap">ลงประกาศรับสมัคร</span>
          </Button>
          <HeaderAccountActions />
        </div>
      </div>
    </header>
  );
}
