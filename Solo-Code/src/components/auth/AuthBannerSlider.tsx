import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logoUrl from "@/assets/solo-freelancer-logo.webp";
import { cn } from "@/lib/utils";

export interface BannerSlide {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

const FALLBACK: BannerSlide[] = [
  {
    id: "fallback-1",
    title: "หลังบ้านฟรีแลนซ์ที่คิดมาเพื่อคุณ",
    subtitle: "ยินดีต้อนรับ",
    image_url: "",
    sort_order: 0,
    is_active: true,
  },
];

export function AuthBannerSlider({ className }: { className?: string }) {
  const { data } = useQuery({
    queryKey: ["auth_banner_slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auth_banner_slides")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BannerSlide[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const slides = data && data.length > 0 ? data : FALLBACK;
  const [idx, setIdx] = React.useState(0);

  React.useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  React.useEffect(() => {
    if (idx >= slides.length) setIdx(0);
  }, [slides.length, idx]);

  const current = slides[idx] ?? slides[0];

  return (
    <div
      className={cn(
        "relative w-full h-full overflow-hidden rounded-3xl",
        "bg-gradient-to-br from-primary/30 via-primary/15 to-accent/20",
        className,
      )}
    >
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            i === idx ? "opacity-100" : "opacity-0",
          )}
        >
          {s.image_url ? (
            <img
              src={s.image_url}
              alt={s.title ?? "banner"}
              className="w-full h-full object-cover"
              loading={i === 0 ? "eager" : "lazy"}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary via-primary/70 to-accent flex items-center justify-center">
              <img
                src={logoUrl}
                alt="So1o"
                className="h-24 w-24 rounded-3xl shadow-elevated opacity-90"
              />
            </div>
          )}
          {/* dark overlay for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
        </div>
      ))}

      {/* Logo top-left */}
      <div className="absolute top-6 left-6 flex items-center gap-2 z-10">
        <img
          src={logoUrl}
          alt="So1o"
          className="h-9 w-9 rounded-xl ring-1 ring-white/30 shadow-soft"
        />
        <span className="text-white font-semibold tracking-tight text-sm drop-shadow">
          So<span className="text-primary-foreground/90">1</span>o Freelancer
        </span>
      </div>

      {/* Caption bottom-left */}
      <div className="absolute bottom-8 left-8 right-8 z-10 text-white">
        {current?.subtitle && (
          <p className="text-sm opacity-90 mb-2 drop-shadow">{current.subtitle}</p>
        )}
        {current?.title && (
          <h2 className="text-2xl md:text-3xl font-bold leading-snug max-w-md drop-shadow">
            {current.title}
          </h2>
        )}
      </div>

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 right-6 flex gap-1.5 z-10">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Slide ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === idx ? "bg-white w-6" : "bg-white/50 w-1.5 hover:bg-white/80",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
