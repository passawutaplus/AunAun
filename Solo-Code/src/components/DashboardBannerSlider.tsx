import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { safeHref } from "@/lib/security";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";

export interface DashboardBannerSlide {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
}

const AUTOPLAY_MS = 6000;

export function DashboardBannerSlider({ className }: { className?: string }) {
  const { data } = useQuery({
    queryKey: ["dashboard_banner_slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboard_banner_slides")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DashboardBannerSlide[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const slides = data ?? [];
  const [idx, setIdx] = React.useState(0);

  React.useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [slides.length]);

  React.useEffect(() => {
    if (idx >= slides.length) setIdx(0);
  }, [slides.length, idx]);

  if (slides.length === 0) return null;
  const current = slides[Math.min(idx, slides.length - 1)];
  const safe = current.link_url ? safeHref(current.link_url) : null;

  const Inner = (
    <div className="relative w-full h-full">
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            i === idx ? "opacity-100" : "opacity-0",
          )}
        >
          <img
            src={s.image_url}
            alt={s.title ?? "banner"}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
            className="w-full h-full object-cover"
          />
          {(s.title || s.subtitle) && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
          )}
        </div>
      ))}

      {(current.title || current.subtitle) && (
        <div className="absolute bottom-3 left-4 right-4 sm:bottom-5 sm:left-6 sm:right-6 z-10 text-white pointer-events-none">
          {current.subtitle && (
            <p className="text-xs sm:text-sm opacity-90 mb-1 drop-shadow">{current.subtitle}</p>
          )}
          {current.title && (
            <h3 className="text-base sm:text-xl font-bold leading-snug max-w-2xl drop-shadow">
              {current.title}
            </h3>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "mb-4 relative w-full overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 shadow-soft animate-fade-in",
        "aspect-[16/5] sm:aspect-[16/4]",
        className,
      )}
    >
      {safe ? (
        <a href={safe} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
          {Inner}
        </a>
      ) : (
        Inner
      )}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIdx((i) => (i - 1 + slides.length) % slides.length);
            }}
            className="absolute top-1/2 -translate-y-1/2 left-2 z-20 h-7 w-7 rounded-full bg-background/80 hover:bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition"
            aria-label="ก่อนหน้า"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIdx((i) => (i + 1) % slides.length);
            }}
            className="absolute top-1/2 -translate-y-1/2 right-2 z-20 h-7 w-7 rounded-full bg-background/80 hover:bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition"
            aria-label="ถัดไป"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIdx(i);
                }}
                aria-label={`สไลด์ ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === idx ? "w-6 bg-white" : "w-1.5 bg-white/60 hover:bg-white/90",
                )}
              />
            ))}
          </div>
        </>
      )}

      {/* Sentinel for empty state when image fails to load */}
      <noscript>
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <ImageIcon className="h-6 w-6" />
        </div>
      </noscript>
    </div>
  );
}
