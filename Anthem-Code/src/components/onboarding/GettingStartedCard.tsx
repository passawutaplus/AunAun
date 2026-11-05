import { Link } from "react-router-dom";
import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Compass, ImagePlus, Rocket, UserRound, BriefcaseBusiness } from "lucide-react";
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

type Step = {
  id: string;
  title: string;
  hint: string;
  done: boolean;
  icon: LucideIcon;
  action: () => void;
  href?: string;
  /** Several small destinations shown under the step instead of one tap target. */
  links?: { to: string; label: string; key: string }[];
};

const EXPLORE_LINKS = [
  { key: "showcase", label: "Showcase", to: "/?mode=showcase" },
  { key: "creators", label: "Creators", to: "/?mode=creators" },
  { key: "exhibition", label: "Exhibition", to: "/exhibition" },
  { key: "studio", label: "My Studio", to: "/dashboard" },
];
const EXPLORED_KEY = "samecor:onboarding-explored";
const COLLAPSED_KEY = "samecor:onboarding-collapsed";

function readExplored(): string[] {
  try {
    const raw = localStorage.getItem(EXPLORED_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/**
 * First three things to do after signing up — photo, role, first work (publish first, polish later) —
 * plus how complete the profile is. Hidden once the profile is complete.
 */
export default function GettingStartedCard({ input, onEditProfile, onAvatar }: Props) {
  const percent = profileCompletion(input);
  const [explored, setExplored] = useState<string[]>(readExplored);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const toggleCollapsed = () => {
    const nextValue = !collapsed;
    setCollapsed(nextValue);
    try {
      localStorage.setItem(COLLAPSED_KEY, nextValue ? "1" : "0");
    } catch {
      /* private mode */
    }
  };
  if (percent >= 100) return null;

  const markExplored = (key: string) => {
    const next = Array.from(new Set([...explored, key]));
    setExplored(next);
    try {
      localStorage.setItem(EXPLORED_KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
  };

  const steps: Step[] = [
    { id: "avatar", title: "ใส่รูปโปรไฟล์", hint: "ให้คนจำหน้าคุณได้", done: input.hasAvatar, icon: UserRound, action: onAvatar },
    {
      id: "role",
      title: "บอกว่าคุณทำอะไร",
      hint: "สายงาน แนะนำตัว และสถานะรับงาน",
      done: input.hasRole,
      icon: BriefcaseBusiness,
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
    {
      id: "explore",
      title: "สำรวจ SAMECOR",
      hint: "Showcase · Creators · Exhibition · My Studio",
      done: EXPLORE_LINKS.every((l) => explored.includes(l.key)),
      icon: Compass,
      action: () => undefined,
      links: EXPLORE_LINKS,
    },
  ];
  const next = steps.find((s) => !s.done);

  const track = (id: string) => void trackProductEvent("onboarding_step", { step: id, percent }, { debounceMs: 0 });

  return (
    <section className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-4 sm:p-5" aria-labelledby="getting-started-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="getting-started-title" className="flex items-center gap-1.5 text-sm font-semibold">
            <Rocket className="h-4 w-4 text-brand" aria-hidden />
            เริ่มต้นใช้งาน
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">โปรไฟล์ที่ครบ ช่วยให้คนที่ใช่ค้นเจอคุณ</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-sm font-semibold tabular-nums text-primary">{percent}%</span>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-controls="getting-started-steps"
            aria-label={collapsed ? "แสดงทุกขั้นตอน" : "หุบการ์ด"}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", !collapsed && "rotate-180")} />
          </button>
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>
      <ol
        id="getting-started-steps"
        className={cn("grid gap-2", collapsed ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-4")}
      >
        {/* Still-to-do steps float to the top; finished ones drop below (numbers stay put). */}
        {[...steps.filter((x) => !x.done), ...steps.filter((x) => x.done)].map((s) => {
          const i = steps.indexOf(s);
          // Collapsed: only the next thing to do.
          if (collapsed && s.id !== next?.id) return null;
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
              {!s.done && !s.links ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
            </>
          );
          const cls = cn(
            "flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors",
            s.done ? "border-transparent bg-muted/30" : "border-border hover:bg-muted/50",
            next?.id === s.id && "border-primary/50 ring-1 ring-primary/30",
          );
          return (
            <li key={s.id}>
              {s.links && !s.done ? (
                <div className={cn(cls, "flex-wrap hover:bg-transparent")}>
                  {body}
                  <span className="flex w-full flex-wrap gap-1.5 pl-[2.625rem]">
                    {s.links.map((l) => {
                      const seen = explored.includes(l.key);
                      return (
                        <Link
                          key={l.key}
                          to={l.to}
                          onClick={() => {
                            track(`${s.id}_${l.key}`);
                            markExplored(l.key);
                          }}
                          className={cn(
                            "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-medium transition-colors",
                            seen
                              ? "border-transparent bg-muted/60 text-muted-foreground"
                              : "border-border text-foreground hover:bg-muted",
                          )}
                        >
                          {seen ? <Check className="h-3 w-3" aria-hidden /> : null}
                          {l.label}
                        </Link>
                      );
                    })}
                  </span>
                </div>
              ) : s.done ? (
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
