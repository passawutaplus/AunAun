import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/** Thin top banner when the browser reports offline. */
export function OfflineBanner({ className }: Props) {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed inset-x-0 top-0 z-[90] flex items-center justify-center gap-2",
        "bg-amber-600 text-white px-3 py-1.5 text-xs font-medium",
        "pt-[max(0.375rem,env(safe-area-inset-top))]",
        className,
      )}
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden />
      <span>เน็ตหลุดชั่วคราว — บางอย่างอาจโหลดไม่ได้</span>
    </div>
  );
}

export default OfflineBanner;
