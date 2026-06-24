import { Home } from "lucide-react";

type Props = {
  name?: string;
};

export function HomeBriefingHero({ name }: Props) {
  const today = new Date().toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <header className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-7 shadow-soft">
      <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-start gap-3 min-w-0">
          <div className="rounded-2xl bg-gradient-primary text-primary-foreground p-3 shadow-elevated shrink-0">
            <Home className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold">
              สตูดิโอวันนี้
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1 leading-tight">
              สวัสดี{name ? `, ${name}` : ""}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 capitalize">{today}</p>
            <p className="text-xs text-primary/80 font-medium mt-2">อ่าน → ฝึก → แชร์</p>
          </div>
        </div>
      </div>
    </header>
  );
}
