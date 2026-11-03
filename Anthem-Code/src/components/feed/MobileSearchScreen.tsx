import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clock, Search, X } from "lucide-react";

const RECENT_LIMIT = 8;

type Props = {
  open: boolean;
  onClose: () => void;
  /** Mode the search runs in, e.g. "Showcase" — shown in the heading. */
  scopeLabel: string;
  placeholder: string;
  initialValue?: string;
  recentSearches: string[];
  onSubmit: (query: string) => void;
};

/**
 * Phone search: a full screen with only a text box and recent searches — no filters
 * (those live behind the filter button in the bar). Box sits at the bottom, within thumb reach.
 */
export default function MobileSearchScreen({
  open,
  onClose,
  scopeLabel,
  placeholder,
  initialValue = "",
  recentSearches,
  onSubmit,
}: Props) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setValue(initialValue);
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
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
    // initialValue is read once per open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const submit = (q: string) => {
    onSubmit(q.trim());
    onClose();
  };
  const recent = recentSearches.slice(0, RECENT_LIMIT);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`ค้นหาใน ${scopeLabel}`}
      className="fixed inset-0 z-[70] flex flex-col bg-background px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] lg:hidden"
    >
      <div className="flex h-12 items-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted" aria-hidden>
          <Clock className="h-5 w-5 text-foreground" />
        </span>
      </div>

      <div className="mt-auto">
        <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground">
          ค้นหาใน {scopeLabel}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {recent.length ? "ค้นหาล่าสุดของคุณ" : "พิมพ์ชื่อผลงาน ครีเอเตอร์ สไตล์ หรือเครื่องมือที่ใช้"}
        </p>

        {recent.length ? (
          <ul className="mt-4 flex flex-col items-start gap-2">
            {recent.map((q) => (
              <li key={q} className="max-w-full">
                <button
                  type="button"
                  onClick={() => submit(q)}
                  className="flex max-w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left text-base text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate">{q}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <form
          className="mt-6 flex items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit(value);
          }}
        >
          <label className="flex h-14 min-w-0 flex-1 items-center gap-3 rounded-full border border-border bg-card px-5">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <input
              ref={inputRef}
              type="search"
              enterKeyHint="search"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              aria-label={placeholder}
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
    </div>,
    document.body,
  );
}
