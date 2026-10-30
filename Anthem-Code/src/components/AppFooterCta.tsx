import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAuthDialog } from "@/stores/authDialogStore";
import { cn } from "@/lib/utils";

/**
 * What the Android app shows where the website has its footer: one clear next step — post your work.
 * (Legal links, help, contact and the © line live in Settings instead.)
 */
export default function AppFooterCta({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const openSignup = useAuthDialog((s) => s.openSignup);

  const post = () => {
    if (!user) {
      openSignup("/portfolio/new");
      return;
    }
    navigate("/portfolio/new");
  };

  return (
    <section
      aria-labelledby="app-cta-title"
      className={cn("mx-auto mt-14 w-full max-w-xl px-4 pb-6", className)}
    >
      <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card px-6 pb-7 pt-8 text-center">
        {/* Brand symbol as a quiet watermark, cropped off the corner. */}
        <img
          src="/brand/symbol-black.svg"
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute -bottom-10 -right-10 h-44 w-44 opacity-[0.06] dark:hidden"
        />
        <img
          src="/brand/symbol-white.svg"
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute -bottom-10 -right-10 hidden h-44 w-44 opacity-[0.07] dark:block"
        />
        <div className="relative">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">ถึงตาคุณแล้ว</p>
          <h2
            id="app-cta-title"
            className="mt-2 font-display text-[2rem] font-light leading-[1.1] tracking-[-0.03em] text-foreground"
          >
            Your work
            <br />
            belongs here.
          </h2>
          <p className="mx-auto mt-3 max-w-[19rem] text-balance text-sm leading-relaxed text-muted-foreground">
            เริ่มจากชิ้นเดียวก็พอ ให้คนที่ใช่ได้เห็นฝีมือคุณ
          </p>
          <button
            type="button"
            onClick={post}
            className="mx-auto mt-6 inline-flex h-12 w-full max-w-[15rem] items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Plus className="h-4 w-4" aria-hidden />
            ลงผลงานของคุณ
          </button>
        </div>
      </div>
    </section>
  );
}
