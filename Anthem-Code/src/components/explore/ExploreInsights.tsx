import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Hash, LayoutGrid, Link2, Palette, Search, Users } from "lucide-react";
import ToolIcon from "@/components/ToolIcon";
import UserAvatar from "@/components/UserAvatar";
import { useImagePalette } from "@/hooks/useImagePalette";
import type { DBProject } from "@/hooks/useProjects";
import { fromCreatorServices } from "@/lib/creatorServicesDb";
import { formatServicePrice } from "@/hooks/useCreatorServices";
import { normalizeTag, normalizeToolName, type ExploreKind } from "@/lib/exploreRoutes";
import { toHexColor } from "@/lib/imagePalette";
import { thumbFeedCoverUrl } from "@/lib/feedProjectCover";
import { CATEGORY_PARENTS, parentIdForProjectCategory, stripCategorySubTags, type CategoryParentId } from "@/data/categoryTaxonomy";
import { cn } from "@/lib/utils";

type Creator = { name: string; avatar: string; username?: string };

/** Count values across works, most common first, skipping the page's own value. */
function topValues(lists: string[][], skip: (v: string) => boolean, limit: number): string[] {
  const counts = new Map<string, { label: string; n: number }>();
  for (const list of lists) {
    for (const raw of new Set(list)) {
      const label = raw.trim();
      if (!label || skip(label)) continue;
      const key = label.toLowerCase();
      const cur = counts.get(key);
      if (cur) cur.n += 1;
      else counts.set(key, { label, n: 1 });
    }
  }
  return [...counts.values()]
    .filter((c) => c.n >= 2)
    .sort((a, b) => b.n - a.n)
    .slice(0, limit)
    .map((c) => c.label);
}

const chip =
  "inline-flex items-center gap-1 rounded-full border border-border/70 px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-accent";

/** "Often together" tags and tools — tap to add it to the current search (works must match all). */
export function ExploreRelatedChips({
  rows,
  kind,
  value,
  selectedTools,
  selectedTags,
  onAddTool,
  onAddTag,
}: {
  rows: DBProject[];
  kind: ExploreKind;
  value: string;
  selectedTools: string[];
  selectedTags: string[];
  onAddTool: (tool: string) => void;
  onAddTag: (tag: string) => void;
}) {
  const toolSkip = useMemo(
    () => new Set([...(kind === "tool" ? [value] : []), ...selectedTools].map(normalizeToolName)),
    [kind, value, selectedTools],
  );
  const tagSkip = useMemo(
    () => new Set([...(kind === "tag" ? [value] : []), ...selectedTags].map(normalizeTag)),
    [kind, value, selectedTags],
  );
  const tags = useMemo(
    () => topValues(rows.map((r) => stripCategorySubTags(r.tags)), (t) => tagSkip.has(normalizeTag(t)), 8),
    [rows, tagSkip],
  );
  const tools = useMemo(
    () => topValues(rows.map((r) => r.tools ?? []), (t) => toolSkip.has(normalizeToolName(t)), 6),
    [rows, toolSkip],
  );
  if (!tags.length && !tools.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="flex basis-full items-center gap-1.5 pb-0.5 text-xs font-medium text-muted-foreground"><Link2 className="h-3.5 w-3.5" aria-hidden /> มักใช้คู่กัน</span>
      {tools.map((t) => (
        <button key={`tool-${t}`} type="button" onClick={() => onAddTool(t)} className={chip} title={`กรองเพิ่ม: ใช้ ${t} ด้วย`}>
          <ToolIcon name={t} size="sm" /> {t}
        </button>
      ))}
      {tags.map((t) => (
        <button key={`tag-${t}`} type="button" onClick={() => onAddTag(t)} className={chip} title={`กรองเพิ่ม: มีแท็ก #${t.replace(/^#+/, "")} ด้วย`}>
          <Hash className="h-3 w-3 text-muted-foreground" aria-hidden />
          {t.replace(/^#+/, "")}
        </button>
      ))}
    </div>
  );
}

/** Category filter built from the works on the page (only categories that actually appear). */
export function ExploreCategoryChips({
  rows,
  value,
  onChange,
}: {
  rows: DBProject[];
  value: CategoryParentId | "all";
  onChange: (next: CategoryParentId | "all") => void;
}) {
  const present = useMemo(() => {
    const counts = new Map<CategoryParentId, number>();
    for (const r of rows) {
      const id = parentIdForProjectCategory(r.category);
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return CATEGORY_PARENTS.filter((p) => counts.has(p.id)).map((p) => ({ ...p, n: counts.get(p.id)! }));
  }, [rows]);
  if (present.length < 2) return null;
  const pill = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-xs transition-colors",
      active ? "border-foreground bg-foreground text-background" : "border-border/70 text-muted-foreground hover:text-foreground",
    );
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="กรองตามหมวด">
      <span className="flex basis-full items-center gap-1.5 pb-0.5 text-xs font-medium text-muted-foreground"><LayoutGrid className="h-3.5 w-3.5" aria-hidden /> หมวด</span>
      <button type="button" aria-pressed={value === "all"} className={pill(value === "all")} onClick={() => onChange("all")}>
        ทุกหมวด
      </button>
      {present.map((p) => (
        <button
          key={p.id}
          type="button"
          aria-pressed={value === p.id}
          className={pill(value === p.id)}
          onClick={() => onChange(value === p.id ? "all" : p.id)}
        >
          {p.label} <span className="tabular-nums opacity-60">{p.n}</span>
        </button>
      ))}
    </div>
  );
}

/** Creators who use this tag / tool — a random handful each visit. */
export function ExploreTopCreators({ rows, creators }: { rows: DBProject[]; creators: Record<string, Creator> }) {
  const top = useMemo(() => {
    const byOwner = new Map<string, { views: number; works: number }>();
    for (const r of rows) {
      const cur = byOwner.get(r.owner_id) ?? { views: 0, works: 0 };
      cur.views += r.views ?? 0;
      cur.works += 1;
      byOwner.set(r.owner_id, cur);
    }
    // A fresh random six on every visit, so the same creators do not always sit on top.
    const all = [...byOwner.entries()];
    for (let i = all.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all.slice(0, 6);
  }, [rows]);
  if (top.length < 2) return null;
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Users className="h-3.5 w-3.5" aria-hidden /> ครีเอเตอร์เด่น</h2>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:flex-col lg:overflow-visible">
        {top.map(([id, stat]) => {
          const c = creators[id];
          return (
            <Link
              key={id}
              to={`/u/${id}`}
              className="flex min-w-[9.5rem] shrink-0 items-center gap-2 rounded-full border border-border/60 bg-card/60 py-1 pl-1 pr-3 hover:bg-accent/40 lg:min-w-0"
            >
              <UserAvatar src={c?.avatar} name={c?.name} username={c?.username} className="h-8 w-8" />
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium text-foreground">{c?.name ?? "ครีเอเตอร์"}</span>
                <span className="block text-[11px] text-muted-foreground">{stat.works} ผลงาน</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** Popular colours across the top works; each opens the colour search. */
export function ExplorePalette({ rows }: { rows: DBProject[] }) {
  const covers = useMemo(
    () =>
      [...rows]
        .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
        .map((r) => r.cover_url || r.gallery_urls?.[0] || "")
        .filter(Boolean)
        .slice(0, 4),
    [rows],
  );
  const a = useImagePalette(covers[0], 2);
  const b = useImagePalette(covers[1], 2);
  const c = useImagePalette(covers[2], 2);
  const d = useImagePalette(covers[3], 2);
  const hexes = [...new Set([...a, ...b, ...c, ...d].filter((x) => !x.startsWith("hsl(")).map(toHexColor))].slice(0, 6);
  if (covers.length < 2 || hexes.length < 3) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="flex basis-full items-center gap-1.5 pb-0.5 text-xs font-medium text-muted-foreground"><Palette className="h-3.5 w-3.5" aria-hidden /> โทนสียอดนิยม</span>
      {hexes.map((hex) => (
        <Link
          key={hex}
          to={`/?mode=projects&color=${encodeURIComponent(hex)}`}
          aria-label={`ค้นหาผลงานโทน ${hex.toUpperCase()}`}
          title={`ค้นหาผลงานโทน ${hex.toUpperCase()}`}
          className="h-6 w-6 rounded-full border border-border shadow-sm transition-transform hover:scale-110"
          style={{ backgroundColor: hex }}
        />
      ))}
      <Search className="ml-0.5 h-3 w-3 text-muted-foreground" aria-hidden />
    </div>
  );
}

/** Packages from the creators on this page — the step from "looking" to "hiring". */
export function ExplorePackages({ ownerIds, title }: { ownerIds: string[]; title: string }) {
  const ids = ownerIds.slice(0, 12);
  const { data = [] } = useQuery({
    queryKey: ["explore-packages", ids],
    enabled: ids.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: rows, error } = await fromCreatorServices()
        .select("id, title, cover_url, gallery_urls, price_thb, price_min_thb, owner_id")
        .in("owner_id", ids)
        .eq("status", "Published")
        .order("updated_at", { ascending: false })
        .limit(4);
      if (error) return [];
      return (rows ?? []) as {
        id: string;
        title: string;
        cover_url: string | null;
        gallery_urls: string[] | null;
        price_thb: number | null;
        price_min_thb: number | null;
      }[];
    },
  });
  if (!data.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5">
        {data.map((p) => {
          const img = p.cover_url || p.gallery_urls?.[0] || "";
          const lo = Number(p.price_min_thb) || 0;
          const start = lo > 0 ? lo : Number(p.price_thb) || 0;
          return (
            <Link key={p.id} to={`/service/${p.id}`} className="group min-w-0 overflow-hidden rounded-xl glass-panel transition-shadow hover:shadow-md">
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                {img ? (
                  <img src={thumbFeedCoverUrl(img)} alt={p.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                ) : null}
              </div>
              <div className="flex min-w-0 items-center gap-1.5 px-2 py-1.5">
                <p className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{p.title}</p>
                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                  {start > 0 ? `เริ่ม ${formatServicePrice(start)}` : "คุยราคา"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
