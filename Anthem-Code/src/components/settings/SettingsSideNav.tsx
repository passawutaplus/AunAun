import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type SettingsNavItem = {
  id: string;
  label: string;
};

type Props = {
  items: SettingsNavItem[];
  className?: string;
};

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  try {
    const url = new URL(window.location.href);
    url.hash = id;
    window.history.replaceState(null, "", `${url.pathname}${url.search}#${id}`);
  } catch {
    /* ignore */
  }
}

/** Sticky section nav — click scrolls to matching settings section. */
export default function SettingsSideNav({ items, className }: Props) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const ids = useMemo(() => items.map((i) => i.id), [items]);

  useEffect(() => {
    if (!ids.length) return;

    const hash = window.location.hash.replace(/^#/, "");
    if (hash && ids.includes(hash)) {
      setActiveId(hash);
      window.requestAnimationFrame(() => scrollToSection(hash));
    }

    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((n): n is HTMLElement => !!n);

    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target;
        if (top?.id) setActiveId(top.id);
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.1, 0.25, 0.5],
      },
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [ids]);

  return (
    <>
      {/* Mobile: horizontal chips */}
      <nav
        aria-label="เมนูหัวข้อตั้งค่า"
        className={cn(
          "lg:hidden -mx-4 px-4 overflow-x-auto scrollbar-hide",
          className,
        )}
      >
        <div className="flex gap-1.5 min-w-max pb-1">
          {items.map((item) => {
            const active = activeId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveId(item.id);
                  scrollToSection(item.id);
                }}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors border",
                  active
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border/60 bg-secondary/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop: sticky sidebar */}
      <nav
        aria-label="เมนูหัวข้อตั้งค่า"
        className={cn(
          "hidden lg:block sticky top-20 self-start w-48 xl:w-52 shrink-0",
          className,
        )}
      >
        <div className="rounded-2xl glass-panel overflow-hidden py-1.5">
          <p className="px-3.5 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            หัวข้อ
          </p>
          <ul className="flex flex-col">
            {items.map((item) => {
              const active = activeId === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(item.id);
                      scrollToSection(item.id);
                    }}
                    className={cn(
                      "relative w-full text-left px-3.5 py-2.5 text-sm transition-colors",
                      active
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                    )}
                  >
                    {active ? (
                      <span
                        className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary"
                        aria-hidden
                      />
                    ) : null}
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </>
  );
}
