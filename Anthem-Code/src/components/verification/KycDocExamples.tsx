import type { ReactNode } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Selfie do / don't guide (style like exchange KYC caution cards). */
export function SelfieExample({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border/70 bg-muted/15 p-3 space-y-3", className)}>
      <p className="text-sm font-medium">ตัวอย่างเซลฟี่ถือบัตร</p>
      <div className="grid grid-cols-2 gap-2">
        <GuideCard
          ok
          title="รูปแบบที่ถูกต้อง"
          bullets={["เห็นเต็มใบหน้า", "ถือบัตรข้างแก้ม", "เห็นบัตรเต็มใบ อ่านเลขได้", "แสงพอ ไม่สะท้อน"]}
        >
          <CorrectSelfieArt />
        </GuideCard>
        <GuideCard
          ok={false}
          title="รูปแบบที่ไม่ถูกต้อง"
          bullets={["บัตรบังใบหน้า", "แสงสะท้อนบนบัตร", "มือบังเลขบัตร", "ใบหน้า/บัตรถูกตัดเฟรม"]}
        >
          <IncorrectSelfieArt />
        </GuideCard>
      </div>
    </div>
  );
}

function GuideCard({
  ok,
  title,
  bullets,
  children,
}: {
  ok: boolean;
  title: string;
  bullets: string[];
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-2 space-y-2",
        ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5",
      )}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "inline-flex h-4 w-4 items-center justify-center rounded-full",
            ok ? "bg-emerald-600 text-white" : "bg-destructive text-white",
          )}
        >
          {ok ? <Check className="w-2.5 h-2.5" strokeWidth={3} /> : <X className="w-2.5 h-2.5" strokeWidth={3} />}
        </span>
        <p className={cn("text-sm font-medium", ok ? "text-emerald-700 dark:text-emerald-400" : "text-destructive")}>
          {title}
        </p>
      </div>
      <div className="rounded-md overflow-hidden bg-background/60 border border-border/50">{children}</div>
      <ul className="space-y-0.5">
        {bullets.map((b) => (
          <li key={b} className="text-sm text-muted-foreground leading-snug">
            • {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CorrectSelfieArt() {
  return (
    <svg viewBox="0 0 160 120" className="w-full h-auto" aria-hidden>
      <rect width="160" height="120" fill="hsl(var(--muted))" opacity="0.25" />
      {/* Face on the left — card held beside the cheek, not covering */}
      <circle cx="52" cy="44" r="22" fill="hsl(var(--muted-foreground))" opacity="0.35" />
      <ellipse cx="52" cy="92" rx="32" ry="22" fill="hsl(var(--muted-foreground))" opacity="0.25" />
      <rect x="88" y="38" width="58" height="38" rx="3" fill="hsl(var(--card))" stroke="#22c55e" strokeWidth="1.5" />
      <rect x="93" y="43" width="12" height="16" rx="1" fill="hsl(var(--muted))" opacity="0.5" />
      <rect x="109" y="45" width="30" height="3" rx="1" fill="hsl(var(--muted-foreground))" opacity="0.4" />
      <rect x="109" y="51" width="26" height="3" rx="1" fill="hsl(var(--muted-foreground))" opacity="0.3" />
      <rect x="109" y="57" width="22" height="3" rx="1" fill="hsl(var(--muted-foreground))" opacity="0.22" />
    </svg>
  );
}

function IncorrectSelfieArt() {
  return (
    <svg viewBox="0 0 160 120" className="w-full h-auto" aria-hidden>
      <rect width="160" height="120" fill="hsl(var(--muted))" opacity="0.25" />
      {/* Face partially hidden */}
      <circle cx="80" cy="40" r="22" fill="hsl(var(--muted-foreground))" opacity="0.35" />
      <ellipse cx="80" cy="90" rx="36" ry="22" fill="hsl(var(--muted-foreground))" opacity="0.25" />
      {/* Card covering lower face */}
      <rect x="48" y="48" width="64" height="40" rx="3" fill="hsl(var(--card))" stroke="#ef4444" strokeWidth="1.5" />
      <rect x="54" y="54" width="14" height="18" rx="1" fill="hsl(var(--muted))" opacity="0.5" />
      <rect x="72" y="56" width="32" height="3" rx="1" fill="hsl(var(--muted-foreground))" opacity="0.35" />
      <rect x="72" y="63" width="28" height="3" rx="1" fill="hsl(var(--muted-foreground))" opacity="0.25" />
      {/* Glare */}
      <ellipse cx="95" cy="62" rx="10" ry="6" fill="white" opacity="0.45" />
    </svg>
  );
}

export default SelfieExample;
