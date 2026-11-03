import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Clock, Search, X } from "lucide-react";
import FeedModeToggle from "@/components/feed/FeedModeToggle";
import { useSearchHistory } from "@/hooks/useSearchHistory";

export type SearchScope = "showcase" | "creators" | "exhibition";

const RECENT_LIMIT = 8;

const SCOPE: Record<
  SearchScope,
  { label: string; placeholder: string; hint: string }
> = {
  showcase: {
    label: "Showcase",
    placeholder: "ค้นหาผลงาน",
    hint: "พิมพ์ชื่อผลงาน สไตล์ หรือเครื่องมือที่ใช้",
  },
  creators: {
    label: "Creators",
    placeholder: "ค้นหาครีเอเตอร์",
    hint: "พิมพ์ชื่อครีเอเตอร์ ทักษะ หรือเครื่องมือ",
  },
  exhibition: {
    label: "Exhibition",
    placeholder: "ค้นหางาน สถานที่ ผู้จัด",
    hint: "พิมพ์ชื่องาน สถานที่ หรือผู้จัด",
  },
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Mode the screen opens on; the pill above the box switches it. */
  initialScope: SearchScope;
  initialValue?: string;
  userId?: string | null;
  /** Runs the search in the chosen mode (the screen closes itself). */
  onSubmit: (scope: SearchScope, query: string) => void;
};

/**
 * Phone search: a full screen with only a text box, the mode pill and that mode's recent
 * searches — no filters (those live behind the filter button in the bar).
 */
export default function MobileSearchScreen({
  open,
  onClose,
  initialScope,
  initialValue = "",
  userId,
  onSubmit,
}: Props) {
  const [scope, setScope] = useState<SearchScope>(initialScope);
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const { queries, record, remove } = useSearchHistory(
    userId,
    scope === "showcase" ? undefined : scope,
  );
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    setScope(initialScope);
    setValue(initialValue);
    // Focus once the sheet has slid in, so the keyboard does not fight the animation.
    const t = window.setTimeout(
      () => inputRef.current?.focus(),
      reduceMotion ? 0 : 320,
    );
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // initialScope / initialValue are read once per open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const meta = SCOPE[scope];
  const recent = queries.slice(0, RECENT_LIMIT);
  const submit = (q: string) => {
    const query = q.trim();
    if (query) record(query);
    onSubmit(scope, query);
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="phone-search"
          role="dialog"
          aria-modal="true"
          aria-label={`ค้นหาใน ${meta.label}`}
          // Slides up from the bottom (where the search button is) and back down on close.
          initial={reduceMotion ? { opacity: 0 } : { y: "100%" }}
          animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { y: "100%" }}
          transition={{
            duration: reduceMotion ? 0.15 : 0.34,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="fixed inset-0 z-[70] flex flex-col bg-background px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] lg:hidden"
        >
          <div className="mt-auto">
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground">
              ค้นหาใน {meta.label}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {recent.length ? "ค้นหาล่าสุดของคุณ" : meta.hint}
            </p>

            {recent.length ? (
              <ul className="mt-4 flex flex-col items-start gap-2">
                {recent.map((q) => (
                  <li
                    key={q}
                    className="flex max-w-full items-center rounded-2xl border border-border bg-card"
                  >
                    <button
                      type="button"
                      onClick={() => submit(q)}
                      className="flex min-w-0 items-center gap-3 rounded-l-2xl py-3 pl-4 pr-2 text-left text-base text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Clock
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <span className="truncate">{q}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(q)}
                      aria-label={`ลบ "${q}" ออกจากประวัติ`}
                      className="mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {/* Same sliding pill as the header; here it only switches what the search looks through. */}
            <div className="mt-6">
              <FeedModeToggle
                showLabels
                value={scope === "exhibition" ? "showcase" : scope}
                exhibitionActive={scope === "exhibition"}
                onChange={(m) =>
                  setScope(m === "creators" ? "creators" : "showcase")
                }
                onExhibitionSelect={() => setScope("exhibition")}
              />
            </div>

            <form
              className="mt-3 flex items-center gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                submit(value);
              }}
            >
              <label className="flex h-14 min-w-0 flex-1 items-center gap-3 rounded-full border border-border bg-card px-5">
                <Search
                  className="h-5 w-5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <input
                  ref={inputRef}
                  type="search"
                  enterKeyHint="search"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={meta.placeholder}
                  aria-label={meta.placeholder}
                  className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
                />
              </label>
              <button
                type="button"
                onClick={onClose}
                aria-label="ปิดการค้นหา"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </form>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
