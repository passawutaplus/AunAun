import { Check, LayoutGrid, Grid2x2, Grid3x3, List, Square, Columns2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export type ProjectManageGridMode = "cols1" | "cols2" | "cols3" | "cols5" | "list";

const STORAGE_KEY = "aplus1.portfolio.manageGrid";
const STORAGE_KEY_MOBILE = "aplus1.portfolio.manageGrid.mobile";
const STORAGE_KEY_DESKTOP = "aplus1.portfolio.manageGrid.desktop";

type GridOption = {
  value: ProjectManageGridMode;
  label: string;
  icon: typeof LayoutGrid;
};

const MOBILE_OPTIONS: GridOption[] = [
  { value: "cols1", label: "1 คอลัมน์", icon: Square },
  { value: "cols2", label: "2 คอลัมน์", icon: Columns2 },
  { value: "list", label: "รายการ", icon: List },
];

const DESKTOP_OPTIONS: GridOption[] = [
  { value: "cols3", label: "3 คอลัมน์", icon: Grid2x2 },
  { value: "cols5", label: "5 คอลัมน์", icon: Grid3x3 },
  { value: "list", label: "รายการ", icon: List },
];

export const PROJECT_MANAGE_GRID_CLASS: Record<ProjectManageGridMode, string> = {
  cols1: "grid grid-cols-1 gap-4",
  cols2: "grid grid-cols-2 gap-3",
  cols3: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
  cols5: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3",
  list: "flex flex-col gap-2",
};

function isMobileMode(mode: ProjectManageGridMode): boolean {
  return mode === "cols1" || mode === "cols2" || mode === "list";
}

function isDesktopMode(mode: ProjectManageGridMode): boolean {
  return mode === "cols3" || mode === "cols5" || mode === "list";
}

function normalizeStored(raw: string | null): ProjectManageGridMode | null {
  if (
    raw === "cols1" ||
    raw === "cols2" ||
    raw === "cols3" ||
    raw === "cols5" ||
    raw === "list"
  ) {
    return raw;
  }
  if (raw === "standard" || raw === "comfortable") return "cols3";
  if (raw === "dense") return "cols5";
  return null;
}

function readKey(key: string, fallback: ProjectManageGridMode): ProjectManageGridMode {
  try {
    return normalizeStored(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeKey(key: string, value: ProjectManageGridMode) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

/** Prefer per-viewport storage; fall back to legacy single key. */
function readForViewport(isMobile: boolean): ProjectManageGridMode {
  const scoped = readKey(
    isMobile ? STORAGE_KEY_MOBILE : STORAGE_KEY_DESKTOP,
    isMobile ? "cols1" : "cols3",
  );
  if (isMobile && isMobileMode(scoped)) return scoped;
  if (!isMobile && isDesktopMode(scoped)) return scoped;

  const legacy = normalizeStored(
    typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null,
  );
  if (legacy) {
    if (isMobile) {
      if (legacy === "cols3") return "cols1";
      if (legacy === "cols5") return "cols2";
      if (legacy === "list") return "list";
      if (isMobileMode(legacy)) return legacy;
      return "cols1";
    }
    if (legacy === "cols1") return "cols3";
    if (legacy === "cols2") return "cols5";
    if (isDesktopMode(legacy)) return legacy;
    return "cols3";
  }

  return isMobile ? "cols1" : "cols3";
}

export function useProjectManageGridMode() {
  const isMobile = useIsMobile();
  const [mode, setModeState] = useState<ProjectManageGridMode>(() =>
    typeof window === "undefined" ? "cols3" : readForViewport(window.innerWidth < 768),
  );

  useEffect(() => {
    setModeState(readForViewport(!!isMobile));
  }, [isMobile]);

  const setMode = (next: ProjectManageGridMode) => {
    setModeState(next);
    writeKey(isMobile ? STORAGE_KEY_MOBILE : STORAGE_KEY_DESKTOP, next);
    writeKey(STORAGE_KEY, next);
  };

  return [mode, setMode] as const;
}

type Props = {
  value: ProjectManageGridMode;
  onChange: (value: ProjectManageGridMode) => void;
  className?: string;
};

export default function ProjectManageGridSelect({ value, onChange, className }: Props) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const options = isMobile ? MOBILE_OPTIONS : DESKTOP_OPTIONS;
  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`รูปแบบกริด: ${current.label}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground shrink-0 transition-colors",
            "border-0 bg-transparent hover:bg-secondary/60",
            className,
          )}
        >
          <LayoutGrid className="w-3.5 h-3.5" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1.5" sideOffset={8}>
        <p className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">รูปแบบกริด</p>
        <div className="flex flex-col gap-0.5" role="listbox" aria-label="เลือกรูปแบบกริด">
          {options.map(({ value: optionValue, label, icon: Icon }) => {
            const active = value === optionValue;
            return (
              <button
                key={optionValue}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(optionValue);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors",
                  active ? "bg-primary/10 text-foreground" : "hover:bg-secondary text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md border",
                    active
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  <Icon className="w-4 h-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium leading-tight">{label}</span>
                {active ? <Check className="w-4 h-4 shrink-0 text-primary" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
