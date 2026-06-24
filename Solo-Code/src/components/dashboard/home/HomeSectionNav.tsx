import * as React from "react";
import { cn } from "@/lib/utils";

export const HOME_SECTIONS = [
  { id: "news", label: "Daily" },
  { id: "drill", label: "Drill" },
  { id: "inspire", label: "Inspire" },
  { id: "insights", label: "บทความ" },
] as const;

export type HomeSectionId = (typeof HOME_SECTIONS)[number]["id"];

type Props = {
  activeId?: HomeSectionId | null;
  onActiveChange?: (id: HomeSectionId) => void;
};

export function HomeSectionNav({ activeId: controlledActive, onActiveChange }: Props) {
  const [activeId, setActiveId] = React.useState<HomeSectionId | null>(null);
  const resolvedActive = controlledActive ?? activeId;

  React.useEffect(() => {
    const elements = HOME_SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target.id as HomeSectionId | undefined;
        if (top && HOME_SECTIONS.some((s) => s.id === top)) {
          setActiveId(top);
          onActiveChange?.(top);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [onActiveChange]);

  const scrollTo = (id: HomeSectionId) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    const url = new URL(window.location.href);
    url.hash = id;
    window.history.replaceState(null, "", url.toString());
    setActiveId(id);
    onActiveChange?.(id);
  };

  return (
    <nav
      aria-label="Home sections"
      className="sticky top-14 z-[15] -mx-3 sm:-mx-6 lg:-mx-8 px-3 sm:px-6 lg:px-8 py-2 bg-background/80 backdrop-blur-xl border-b border-border/40"
    >
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
        {HOME_SECTIONS.map((section) => {
          const isActive = resolvedActive === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollTo(section.id)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-soft"
                  : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground",
              )}
            >
              {section.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function scrollToHomeSection(id: HomeSectionId) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  const url = new URL(window.location.href);
  url.hash = id;
  window.history.replaceState(null, "", url.toString());
}
