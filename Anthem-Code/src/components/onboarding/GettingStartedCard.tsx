import { Link } from "react-router-dom";
import { Check, ChevronRight, ImagePlus, Sparkles, UserRound, Wand2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { trackProductEvent } from "@/lib/productEvents";
import { cn } from "@/lib/utils";

export type ProfileCompletionInput = {
  hasAvatar: boolean;
  /** Role or at least one discipline. */
  hasRole: boolean;
  bioLength: number;
  skillsCount: number;
  hasAvailability: boolean;
  publishedCount: number;
};

/** Six things that make a profile read well; each is worth an equal share of 100%. */
export function profileCompletion(p: ProfileCompletionInput): number {
  const checks = [
    p.hasAvatar,
    p.hasRole,
    p.bioLength >= 20,
    p.skillsCount > 0,
    p.hasAvailability,
    p.publishedCount > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

type Props = {
  input: ProfileCompletionInput;
  /** Opens the profile editor (role, intro, availability). */
  onEditProfile: () => void;
  /** Avatar lives on the cover header — scroll there. */
  onAvatar: () => void;
};

type Step = { id: string; title: string; hint: string; done: boolean; icon: LucideIcon; action: () => void; href?: string };

/**
 * First three things to do after signing up — photo, role, first work (publish first, polish later) —
 * plus how complete the profile is. Hidden once the profile is complete.
 */
export default function GettingStartedCard({ input, onEditProfile, onAvatar }: Props) {
  const percent = profileCompletion(input);
  if (percent >= 100) return null;

  const steps: Step[] = [
    { id: "avatar", title: "ใส่รูปโปรไฟล์", hint: "ให้คนจำหน้าคุณได้", done: input.hasAvatar, icon: UserRound, action: onAvatar },
    {
      id: "role",
      title: "บอกว่าคุณทำอะไร",
      hint: "สายงาน แนะนำตัว และสถานะรับงาน",
      done: input.hasRole,
      icon: Wand2,
      action: onEditProfile,
    },
    {
      id: "first_project",
      title: "ลงผลงานชิ้นแรก",
      hint: "ลงก่อน ค่อยเติมเรื่องราวทีหลังได้",
      done: input.publishedCount > 0,
      icon: ImagePlus,
      action: () => undefined,
      href: "/portfolio/new",
    },
  ];
  const next = steps.find((s) => !s.done);

  const track = (id: string) => void trackProductEvent("onboarding_step", { step: id, percent }, { debounceMs: 0 });

  return (
    <section className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-4 sm:p-5" aria-labelledby="getting-started-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="getting-started-title" className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            เริ่มต้นใช้งาน
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">โปรไฟล์ที่ครบ ช่วยให้คนที่ใช่ค้นเจอคุณ</p>
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">{percent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>
      <ol className="grid gap-2 sm:grid-cols-3">
        {steps.map((s, i) => {
          const Icon = s.done ? Check : s.icon;
          const body = (
            <>
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  s.done ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block text-sm font-medium", s.done && "text-muted-foreground line-through")}>
                  {i + 1}. {s.title}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">{s.hint}</span>
              </span>
              {!s.done ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
            </>
          );
          const cls = cn(
            "flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors",
            s.done ? "border-transparent bg-muted/30" : "border-border hover:bg-muted/50",
            next?.id === s.id && "border-primary/50 ring-1 ring-primary/30",
          );
          return (
            <li key={s.id}>
              {s.done ? (
                <div className={cls}>{body}</div>
              ) : s.href ? (
                <Link to={s.href} className={cls} onClick={() => track(s.id)}>
                  {body}
                </Link>
              ) : (
                <button
                  type="button"
                  className={cls}
                  onClick={() => {
                    track(s.id);
                    s.action();
                  }}
                >
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
