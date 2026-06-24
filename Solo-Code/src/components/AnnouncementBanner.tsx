import * as React from "react";
import { safeHref } from "@/lib/security";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Announcement {
  id: string;
  message: string;
  banner_url: string | null;
  link_url: string | null;
  is_active: boolean;
  created_at: string;
  start_at: string | null;
  end_at: string | null;
}

const DISMISS_KEY = "so1o.announcement.dismissed.v2"; // stores JSON array of dismissed ids
const AUTOPLAY_MS = 6000;

function loadDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function AnnouncementBanner() {
  const [items, setItems] = React.useState<Announcement[]>([]);
  const [dismissed, setDismissed] = React.useState<string[]>(() => loadDismissed());
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("announcements")
        .select("id,message,banner_url,link_url,is_active,created_at,start_at,end_at")
        .eq("is_active", true)
        .or(`start_at.is.null,start_at.lte.${nowIso}`)
        .or(`end_at.is.null,end_at.gte.${nowIso}`)
        .order("created_at", { ascending: false })
        .limit(10);
      if (!cancelled) setItems((data as Announcement[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = React.useMemo(
    () => items.filter((it) => !dismissed.includes(it.id)),
    [items, dismissed],
  );

  // keep index in range when items change
  React.useEffect(() => {
    if (index >= visible.length) setIndex(0);
  }, [visible.length, index]);

  // autoplay
  React.useEffect(() => {
    if (visible.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % visible.length), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [visible.length]);

  if (visible.length === 0) return null;
  const item = visible[Math.min(index, visible.length - 1)];

  const handleDismiss = () => {
    const next = [...dismissed, item.id];
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
    setDismissed(next);
  };

  const go = (delta: number) => {
    setIndex((i) => (i + delta + visible.length) % visible.length);
  };

  const Inner = (
    <div className="flex items-start gap-3 p-3 sm:p-4">
      <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
        <Megaphone className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        {item.banner_url && (
          <img
            src={item.banner_url}
            alt="Announcement banner"
            loading="lazy"
            decoding="async"
            className="w-full max-h-40 object-cover rounded-lg mb-2 ring-1 ring-border"
          />
        )}
        {item.message && (
          <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {item.message}
          </p>
        )}
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleDismiss();
        }}
        className="h-7 w-7 p-0 shrink-0"
        aria-label="ปิดประกาศ"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="mb-4 rounded-2xl border border-primary/30 bg-primary/5 shadow-soft animate-fade-in relative">
      {(() => {
        const safe = item.link_url ? safeHref(item.link_url) : null;
        return safe ? (
          <a
            href={safe}
            target="_blank"
            rel="noopener noreferrer"
            className="block hover:bg-primary/10 transition-colors rounded-2xl"
          >
            {Inner}
          </a>
        ) : (
          Inner
        );
      })()}
      {visible.length > 1 && (
        <div className="flex items-center justify-between px-3 pb-2 -mt-1">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              go(-1);
            }}
            className="h-6 w-6 rounded-full bg-background/80 hover:bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition"
            aria-label="ก่อนหน้า"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-center gap-1.5">
            {visible.map((it, i) => (
              <button
                key={it.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIndex(i);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-primary" : "w-1.5 bg-primary/30 hover:bg-primary/60"
                }`}
                aria-label={`ประกาศ ${i + 1}`}
              />
            ))}
            <span className="text-[10px] text-muted-foreground ml-1.5">
              {index + 1}/{visible.length}
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              go(1);
            }}
            className="h-6 w-6 rounded-full bg-background/80 hover:bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition"
            aria-label="ถัดไป"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
