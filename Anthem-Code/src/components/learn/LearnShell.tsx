import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Footer from "@/components/Footer";
import { LEARN_NAV } from "@/data/learnContent";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";
import { cn } from "@/lib/utils";

export function LearnShell() {
  const { hash, pathname } = useLocation();
  const [activeId, setActiveId] = useState(() => hash.replace(/^#/, "") || "");

  useEffect(() => {
    if (hash) setActiveId(hash.replace(/^#/, ""));
  }, [hash]);

  useEffect(() => {
    if (pathname !== "/learn") return;

    const nodes = LEARN_NAV.map((item) => document.getElementById(item.id)).filter(
      (el): el is HTMLElement => !!el,
    );
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-18% 0px -55% 0px", threshold: [0.12, 0.35, 0.55] },
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <main className={cn("min-h-screen bg-app-ambient", MOBILE_PAGE_BOTTOM_CLASS)}>
      <div className="sticky top-0 z-30 lg:top-14">
        <nav
          className="mx-auto flex max-w-5xl items-center justify-center gap-0.5 overflow-x-auto px-4 py-2.5 sm:gap-1 sm:px-6 scrollbar-none"
          aria-label="Learn"
        >
          {LEARN_NAV.map((item) => {
            const active = activeId === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={active ? "true" : undefined}
                onClick={() => setActiveId(item.id)}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      </div>
      <Outlet />
      <Footer />
    </main>
  );
}
