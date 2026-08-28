import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { signOutApp } from "@/lib/signOutApp";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  onSignedOut?: () => void;
};

/** Sidebar/sheet row — signs out then goes home. */
export function SignOutNavItem({ className, onSignedOut }: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        void (async () => {
          setBusy(true);
          try {
            await signOutApp(queryClient);
            toast.success("ออกจากระบบแล้ว");
            onSignedOut?.();
            navigate("/");
          } catch {
            setBusy(false);
            toast.error("ออกจากระบบไม่สำเร็จ ลองอีกครั้ง");
          }
        })();
      }}
      className={cn(
        "relative flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium",
        "text-destructive transition-colors hover:bg-destructive/10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
        "disabled:pointer-events-none disabled:opacity-60",
        className,
      )}
    >
      <LogOut className="h-4 w-4 shrink-0" aria-hidden />
      Log Out
    </button>
  );
}
