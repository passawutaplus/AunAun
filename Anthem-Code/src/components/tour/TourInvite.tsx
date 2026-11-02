import { createPortal } from "react-dom";
import { ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MascotCharacter } from "@/components/project/TourMascot";
import { mobileFabBottom } from "@/lib/mobileLayout";

type Props = {
  label: string;
  title: string;
  body: string;
  onStart: () => void;
  onClose: () => void;
  onNeverAgain: () => void;
};

/**
 * The quiet way into a tour that opened by itself: nothing is dimmed and the page stays usable.
 * Below lg it is a bar above the floating nav; from lg up, a small card in the bottom right corner.
 */
export function TourInvite({ label, title, body, onStart, onClose, onNeverAgain }: Props) {
  return createPortal(
    <>
      <div
        role="region"
        aria-label={label}
        style={{ bottom: mobileFabBottom("0.5rem") }}
        className="fixed inset-x-3 z-[70] mx-auto flex max-w-md items-center gap-2.5 rounded-2xl bg-surface-strong p-2 pr-2.5 text-white shadow-sm lg:hidden"
      >
        <MascotCharacter className="h-10 w-12 shrink-0" />
        <button type="button" onClick={onStart} className="min-w-0 flex-1 text-left outline-none focus-visible:underline">
          <span className="block truncate font-display text-sm font-light tracking-tight">{title}</span>
          <span className="block truncate text-xs text-white/70">ดูทัวร์สั้น ๆ ของหน้านี้</span>
        </button>
        <button
          type="button"
          onClick={onStart}
          aria-label="เริ่มทัวร์"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#111111]"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิดทัวร์"
          className="flex h-9 w-7 shrink-0 items-center justify-center text-white/70 hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div
        role="region"
        aria-label={label}
        className="fixed bottom-6 right-6 z-[70] hidden w-[280px] rounded-2xl border border-border bg-card p-3 text-left shadow-sm lg:block"
      >
        <div className="flex items-start gap-2">
          <MascotCharacter className="h-10 w-12 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-light tracking-tight text-foreground">{title}</p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{body}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดทัวร์"
            className="-mr-1 -mt-1 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onNeverAgain}
            className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            ไม่ต้องแสดงอีก
          </button>
          <Button type="button" size="sm" className="rounded-full" onClick={onStart}>
            เริ่มทัวร์
          </Button>
        </div>
      </div>
    </>,
    document.body,
  );
}
