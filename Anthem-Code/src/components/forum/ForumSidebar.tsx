import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Bug,
  Flame,
  Home,
  LifeBuoy,
  Lightbulb,
  Megaphone,
  MessageCircleHeart,
  Bookmark,
  type LucideIcon,
} from "lucide-react";
import { forumCategoryTone } from "@/data/forumCategories";
import { useTrendingForumTopics, type ForumCategory } from "@/hooks/useForum";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
  LifeBuoy,
  Bug,
  Lightbulb,
  MessageCircleHeart,
  Megaphone,
  Home,
  Bookmark,
};

type Props = {
  categories: ForumCategory[];
  className?: string;
  onNavigate?: () => void;
};

export function ForumSidebar({ categories, className, onNavigate }: Props) {
  const { pathname } = useLocation();
  const { data: trending = [] } = useTrendingForumTopics(5);

  const nav = [
    { to: "/forum", label: "หน้าแรกชุมชน", icon: Home, exact: true },
    { to: "/forum?tab=unanswered", label: "ยังไม่มีคำตอบ", icon: Bookmark, exact: false },
  ];

  return (
    <aside className={cn("space-y-6", className)}>
      <nav className="space-y-1">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? pathname === "/forum"
            : pathname.startsWith(item.to.split("?")[0]);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                active && item.exact && pathname === "/forum"
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div>
        <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          หมวดหมู่
        </p>
        <nav className="space-y-1">
          {categories.map((cat) => {
            const Icon = ICON_MAP[cat.icon] ?? LifeBuoy;
            const to = `/forum/c/${cat.slug}`;
            const active = pathname === to;
            const tone = forumCategoryTone(cat.slug);
            return (
              <Link
                key={cat.id}
                to={to}
                onClick={onNavigate}
                className={cn(
                  "flex items-start gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  active ? cn("font-medium", tone.softActive) : cn("text-foreground/80", tone.soft),
                )}
              >
                <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", tone.icon)} />
                <span>
                  <span className={cn("block", active ? undefined : tone.text)}>{cat.name_th}</span>
                  <span className="block text-xs font-normal text-muted-foreground line-clamp-1">
                    {cat.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-3 border-t border-border pt-3 px-3">
          <Link
            to="/"
            onClick={onNavigate}
            className="group inline-flex items-center gap-2 text-sm font-medium text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0 transition-colors group-hover:text-primary" aria-hidden />
            <span className="border-b border-foreground/80 pb-0.5 transition-colors group-hover:border-primary group-hover:text-primary">
              กลับฟีดหลัก
            </span>
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Flame className="h-4 w-4 text-orange-500" />
          น่าสนใจในสัปดาห์นี้
        </h3>
        {trending.length === 0 ? (
          <p className="text-xs text-muted-foreground">ยังไม่มีกระทู้ฮิต — เป็นคนแรกที่โพสต์ได้</p>
        ) : (
          <ul className="space-y-2.5">
            {trending.map((t) => (
              <li key={t.id}>
                <Link
                  to={`/forum/t/${t.id}`}
                  onClick={onNavigate}
                  className="text-sm font-medium text-foreground hover:text-primary line-clamp-2"
                >
                  {t.title}
                </Link>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t.reply_count} ความเห็น</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
