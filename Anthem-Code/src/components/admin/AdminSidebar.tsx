import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BRAND_NAME } from "@/lib/brandConfig";
import { OPS_HUB_URL } from "@/lib/productLinks";
import { useAdminRealtime } from "@/hooks/admin/useAdminRealtime";
import { useAdminQueue } from "@/hooks/admin/useAdminQueue";
import { ADMIN_TONE } from "@/lib/admin/adminTone";
import { adminDbGapForPath } from "@/lib/admin/adminDbGaps";
import {
  adminNavGroups,
  adminPageMeta,
  type AdminNavGroup,
  type AdminNavItem,
} from "@/lib/admin/adminNavigation";
import { cn } from "@/lib/utils";

const OPEN_GROUPS_KEY = "admin.nav.open-groups";

function readOpenGroups(): string[] {
  try {
    const raw = window.localStorage.getItem(OPEN_GROUPS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeOpenGroups(ids: string[]) {
  try {
    window.localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(ids));
  } catch {
    /* private mode / blocked storage: the menu simply forgets what was open */
  }
}

function CountPill({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-admin-accent px-1.5 font-mono text-[10px] font-medium text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function NavRow({ item, count, onNavigate }: { item: AdminNavItem; count: number; onNavigate?: () => void }) {
  const gap = adminDbGapForPath(item.to.split("?")[0]);
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={gap ? `${item.hint}\nรอ DB: ${gap.effect}` : item.hint}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent",
          isActive ? "bg-admin-fg font-medium text-admin-bg" : "text-admin-muted hover:bg-admin-hover hover:text-admin-fg",
        )
      }
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
      {count > 0 ? (
        <CountPill count={count} />
      ) : gap ? (
        <span className="ml-auto shrink-0 rounded border border-admin-border px-1 font-mono text-[9px] uppercase tracking-wide text-admin-muted">
          รอ DB
        </span>
      ) : null}
    </NavLink>
  );
}

function GroupSection({
  group,
  open,
  active,
  onToggle,
  counts,
  onNavigate,
}: {
  group: AdminNavGroup;
  open: boolean;
  active: boolean;
  onToggle: () => void;
  counts: Record<string, number>;
  onNavigate?: () => void;
}) {
  const tone = ADMIN_TONE[group.tone];
  const pending = group.items.reduce((sum, i) => sum + (i.badgeKey ? counts[i.badgeKey] ?? 0 : 0), 0);
  const Icon = group.icon;
  const panelId = `admin-nav-${group.id}`;
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-admin-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent",
          active && "bg-admin-hover/60",
        )}
      >
        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", tone.chip)}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="flex-1 truncate text-[13px] font-medium text-admin-fg">{group.title}</span>
        {!open && pending > 0 ? <CountPill count={pending} /> : null}
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-admin-muted transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div id={panelId} className="mt-0.5 space-y-0.5 pl-3.5">
          <div className="space-y-0.5 border-l border-admin-border pl-2">
            {group.items.map((item) => (
              <NavRow key={item.to + item.label} item={item} count={item.badgeKey ? counts[item.badgeKey] ?? 0 : 0} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type Props = {
  /** "drawer" = inside the mobile Sheet: always visible, full width. */
  variant?: "desktop" | "drawer";
  onNavigate?: () => void;
  onOpenSearch?: () => void;
};

export default function AdminSidebar({ variant = "desktop", onNavigate, onOpenSearch }: Props) {
  useAdminRealtime();
  const { pathname } = useLocation();
  const { counts, entries, total } = useAdminQueue();
  const groups = useMemo(() => adminNavGroups(), []);
  const activeGroupId = adminPageMeta(pathname)?.group.id;
  const [openIds, setOpenIds] = useState<string[]>(() => readOpenGroups());

  // The group you are in is always open, whatever was saved.
  useEffect(() => {
    if (activeGroupId) setOpenIds((prev) => (prev.includes(activeGroupId) ? prev : [...prev, activeGroupId]));
  }, [activeGroupId]);

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      writeOpenGroups(next);
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "flex-col border-admin-border bg-admin-surface",
        variant === "desktop" ? "sticky top-0 hidden h-screen w-64 shrink-0 border-r md:flex" : "flex h-full w-full",
      )}
      aria-label="เมนูหลังบ้าน"
    >
      <div className="flex items-center gap-2.5 border-b border-admin-border px-4 py-4">
        <BrandLogo size="sm" showWordmark={false} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-admin-fg">{BRAND_NAME} Admin</p>
          <p className="truncate text-[11px] text-admin-muted">หลังบ้าน</p>
        </div>
      </div>

      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex w-full items-center gap-2 rounded-md border border-admin-border bg-admin-bg px-2.5 py-2 text-left text-[13px] text-admin-muted transition-colors hover:border-admin-fg/40 hover:text-admin-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1">ค้นหาเมนู…</span>
          <kbd className="hidden rounded border border-admin-border px-1 font-mono text-[10px] sm:inline">Ctrl K</kbd>
        </button>
      </div>

      <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-3" aria-label="หมวดหมู่หลังบ้าน">
        <section aria-label="ต้องทำตอนนี้" className="rounded-lg border border-admin-border bg-admin-bg p-2">
          <div className="mb-1 flex items-center justify-between px-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-admin-muted">ต้องทำตอนนี้</p>
            {total > 0 ? <CountPill count={total} /> : null}
          </div>
          {entries.length === 0 ? (
            <p className="flex items-center gap-1.5 px-1 py-1 text-[12px] text-emerald-700 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" /> ไม่มีงานค้าง
            </p>
          ) : (
            <ul className="space-y-0.5">
              {entries.map((e) => (
                <li key={e.key}>
                  <NavLink
                    to={e.item.to}
                    onClick={onNavigate}
                    className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 text-[13px] text-admin-fg transition-colors hover:bg-admin-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent"
                  >
                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded", ADMIN_TONE[e.group.tone].chip)}>
                      <e.item.icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate">{e.item.label}</span>
                    <CountPill count={e.count} />
                  </NavLink>
                </li>
              ))}
            </ul>
          )}
        </section>

        {groups.map((group) => (
          <GroupSection
            key={group.id}
            group={group}
            open={openIds.includes(group.id)}
            active={group.id === activeGroupId}
            onToggle={() => toggle(group.id)}
            counts={counts}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="space-y-1.5 border-t border-admin-border px-4 py-3 text-xs">
        <a
          href={OPS_HUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block font-mono uppercase tracking-wider text-admin-accent hover:underline"
        >
          Ops Hub ↗
        </a>
        <NavLink to="/" onClick={onNavigate} className="block font-mono uppercase tracking-wider text-admin-muted hover:text-admin-accent">
          ← กลับสู่เว็บไซต์
        </NavLink>
      </div>
    </aside>
  );
}
