import { motion, useReducedMotion } from "framer-motion";
import { MessageCircle, Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { smoothEase } from "@/lib/motion";

/** Stylized product UI previews — no screenshots required. */
export function LearnExploreMock({ className }: { className?: string }) {
  const tiles = [
    "from-orange-500/40 to-amber-700/30",
    "from-sky-500/35 to-slate-700/40",
    "from-rose-500/35 to-stone-700/35",
    "from-emerald-500/30 to-teal-800/35",
    "from-violet-500/25 to-zinc-700/40",
    "from-yellow-500/30 to-orange-800/30",
  ];

  return (
    <div className={cn("grid grid-cols-3 gap-2 p-3 sm:gap-2.5 sm:p-4", className)}>
      {tiles.map((g, i) => (
        <motion.div
          key={g}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20px" }}
          transition={{ delay: i * 0.05, duration: 0.4, ease: smoothEase }}
          className={cn("aspect-[4/3] rounded-xl bg-gradient-to-br", g)}
        />
      ))}
    </div>
  );
}

export function LearnProfileMock({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3 p-4 sm:p-5", className)}>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-brand text-white shadow-lg">
          <UserRound className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="h-3 w-28 rounded-full bg-foreground/80" />
          <div className="mt-2 h-2 w-40 max-w-full rounded-full bg-muted-foreground/35" />
        </div>
        <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-medium text-emerald-500">
          เปิดรับโอกาส
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-primary/40 to-orange-900/40" />
        <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-sky-400/30 to-slate-800/50" />
      </div>
      <div className="flex gap-2">
        <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground">Branding</span>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground">UI</span>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground">Motion</span>
      </div>
    </div>
  );
}

export function LearnChatMock({ className }: { className?: string }) {
  const reduced = useReducedMotion();

  return (
    <div className={cn("space-y-3 p-4 sm:p-5", className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <MessageCircle className="h-3.5 w-3.5 text-primary" aria-hidden />
        คุยจากชิ้นงาน · Brand refresh
      </div>
      <motion.div
        animate={reduced ? undefined : { y: [0, -3, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        className="max-w-[85%] rounded-2xl rounded-tl-md bg-muted/80 px-3 py-2.5 text-xs leading-relaxed text-foreground"
      >
        ชอบโทนงานชิ้นนี้มาก — อยากคุยขอบเขตรีแบรนด์ครับ
      </motion.div>
      <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-md bg-gradient-brand px-3 py-2.5 text-xs leading-relaxed text-white">
        ได้เลย ส่ง moodboard ที่ชอบมาได้เลยนะ
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Sparkles className="h-3 w-3 text-primary" aria-hidden />
        เริ่มจากผลงานจริง — ไม่เริ่มจากแพ็กเกจราคา
      </div>
    </div>
  );
}

export function LearnLoopRail({ steps }: { steps: readonly string[] }) {
  const reduced = useReducedMotion();

  return (
    <ol className="flex gap-3 overflow-x-auto pb-1 scrollbar-none sm:grid sm:grid-cols-5 sm:overflow-visible">
      {steps.map((label, i) => (
        <motion.li
          key={label}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-24px" }}
          transition={{ delay: i * 0.06, duration: 0.45, ease: smoothEase }}
          whileHover={reduced ? undefined : { y: -4 }}
          className="min-w-[8.5rem] flex-1 rounded-2xl border border-border/60 bg-background/70 px-3 py-4 sm:min-w-0"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-brand text-xs font-semibold text-white">
            {i + 1}
          </span>
          <p className="mt-3 text-sm font-medium leading-snug text-foreground">{label}</p>
        </motion.li>
      ))}
    </ol>
  );
}
