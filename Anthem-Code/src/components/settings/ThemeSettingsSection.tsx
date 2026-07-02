import { useEffect, useState } from "react";
import { Moon, Palette, Sun } from "lucide-react";
import { useThemeFade } from "@/hooks/useThemeFade";
import { cn } from "@/lib/utils";

export function ThemeSettingsSection({ embedded = false }: { embedded?: boolean }) {
  const { isDark, toggleTheme } = useThemeFade();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const content = (
    <>
      <div className="flex items-center gap-2">
        <Palette className="w-5 h-5 text-primary" />
        <h3 className={embedded ? "text-sm font-medium text-foreground" : "font-semibold text-foreground"}>
          การแสดงผล
        </h3>
      </div>

      <div className="flex items-center justify-between gap-4 py-1">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
              mounted && isDark
                ? "bg-indigo-500/15 text-indigo-400"
                : "bg-amber-500/15 text-amber-500",
            )}
          >
            {mounted && isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">โหมดมืด</p>
            <p className="text-xs text-muted-foreground">
              {mounted
                ? isDark
                  ? "เปิดอยู่ — ลดแสงจอและประหยัดพลังงาน"
                  : "ปิดอยู่ — ใช้ธีมสว่างตามปกติ"
                : "กำลังโหลด…"}
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={mounted ? isDark : false}
          aria-label="สลับโหมดมืด"
          disabled={!mounted}
          onClick={toggleTheme}
          className={cn(
            "relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50",
            mounted && isDark ? "bg-primary" : "bg-muted dark:bg-input",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow-sm ring-1 ring-border/60 transition-transform",
              mounted && isDark ? "translate-x-5" : "",
            )}
          />
        </button>
      </div>
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{content}</div>;
  }

  return (
    <section className="rounded-2xl glass-panel p-6 space-y-4">
      {content}
    </section>
  );
}
