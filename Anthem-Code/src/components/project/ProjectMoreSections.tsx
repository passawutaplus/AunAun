import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fromCreatorServices } from "@/lib/creatorServicesDb";
import { fromCreatorObjects } from "@/lib/objects/db";
import { formatServicePrice } from "@/hooks/useCreatorServices";
import { thumbFeedCoverUrl } from "@/lib/feedProjectCover";
import { stripCategorySubTags } from "@/data/categoryTaxonomy";

/** Either a view count (works, shown with an eye like "ผลงานอื่นของ…") or a short price label. */
type Tile = { id: string; href: string; title: string; image: string; meta?: string; views?: number };

function TileRow({ title, tiles, moreHref, moreLabel }: { title: string; tiles: Tile[]; moreHref?: string; moreLabel?: string }) {
  if (!tiles.length) return null;
  return (
    <section className="space-y-3 pt-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {moreHref ? (
          <Link to={moreHref} className="inline-flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground">
            {moreLabel ?? "ดูเพิ่ม"} <ArrowUpRight className="h-3 w-3" aria-hidden />
          </Link>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {tiles.map((t) => (
          <Link
            key={t.id}
            to={t.href}
            className="group min-w-0 overflow-hidden rounded-xl glass-panel transition-shadow hover:shadow-md"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-muted">
              {t.image ? (
                <img
                  src={thumbFeedCoverUrl(t.image)}
                  alt={t.title}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              ) : null}
            </div>
            <div className="flex min-w-0 items-center gap-1.5 px-2 py-1.5">
              <p className="min-w-0 flex-1 truncate text-xs font-medium leading-snug text-foreground">{t.title}</p>
              {typeof t.views === "number" ? (
                <span
                  className="inline-flex shrink-0 items-center gap-0.5 text-[10px] tabular-nums text-muted-foreground"
                  aria-label={`${t.views.toLocaleString("th-TH")} วิว`}
                >
                  <Eye className="h-2.5 w-2.5" aria-hidden />
                  {t.views.toLocaleString("th-TH")}
                </span>
              ) : t.meta ? (
                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{t.meta}</span>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

const startPrice = (min: number | null, max: number | null) => {
  const lo = Number(min) || 0;
  const hi = Number(max) || 0;
  const start = lo > 0 ? lo : hi;
  return start > 0 ? `เริ่ม ${formatServicePrice(start)}` : "คุยราคา";
};

/** Packages the creator linked to this work (editor: เชื่อมแพ็กเกจ). */
export function RelatedPackagesRow({ projectId }: { projectId?: string }) {
  const { data = [] } = useQuery({
    queryKey: ["project-related-packages", projectId],
    enabled: !!projectId,
    staleTime: 60_000,
    queryFn: async (): Promise<Tile[]> => {
      const { data: rows, error } = await fromCreatorServices()
        .select("id, title, cover_url, gallery_urls, price_thb, price_min_thb")
        .contains("reference_project_ids", [projectId])
        .eq("status", "Published")
        .order("sort_order", { ascending: true })
        .limit(8);
      if (error) return [];
      return ((rows ?? []) as {
        id: string;
        title: string;
        cover_url: string | null;
        gallery_urls: string[] | null;
        price_thb: number | null;
        price_min_thb: number | null;
      }[]).map((r) => ({
        id: r.id,
        href: `/service/${r.id}`,
        title: r.title,
        image: r.cover_url || r.gallery_urls?.[0] || "",
        meta: startPrice(r.price_min_thb, r.price_thb),
      }));
    },
  });
  return <TileRow title="แพ็กเกจที่เกี่ยวข้อง" tiles={data} />;
}

/** Objects (products) the creator linked to this work. */
export function RelatedObjectsRow({ projectId }: { projectId?: string }) {
  const { data = [] } = useQuery({
    queryKey: ["project-related-objects", projectId],
    enabled: !!projectId,
    staleTime: 60_000,
    queryFn: async (): Promise<Tile[]> => {
      const { data: rows, error } = await fromCreatorObjects()
        .select("id, title, cover_url, gallery_urls, price_thb")
        .contains("reference_project_ids", [projectId])
        .eq("status", "Published")
        .limit(8);
      if (error) return [];
      return ((rows ?? []) as {
        id: string;
        title: string;
        cover_url: string | null;
        gallery_urls: string[] | null;
        price_thb: number | null;
      }[]).map((r) => ({
        id: r.id,
        href: `/object/${r.id}`,
        title: r.title,
        image: r.cover_url || r.gallery_urls?.[0] || "",
        meta: Number(r.price_thb) > 0 ? formatServicePrice(Number(r.price_thb)) : "สอบถามราคา",
      }));
    },
  });
  return <TileRow title="สินค้าที่เกี่ยวข้อง" tiles={data} />;
}

type SimilarRow = {
  id: string;
  title: string;
  owner_id: string;
  cover_url: string | null;
  gallery_urls: string[] | null;
  tags: string[] | null;
  tools: string[] | null;
  views: number | null;
};

/**
 * Other creators' works close to this one: same category, ranked by shared tags and tools, then views.
 * (The image-by-image visual match lives on /similar — linked from the heading.)
 */
export function SimilarWorksRow({
  projectId,
  ownerId,
  category,
  tags,
  tools,
}: {
  projectId?: string;
  ownerId?: string;
  category?: string;
  tags?: string[];
  tools?: string[];
}) {
  const { data = [] } = useQuery({
    queryKey: ["project-similar-works", projectId, category],
    enabled: !!projectId && !!category,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Tile[]> => {
      let q = supabase
        .from("projects")
        .select("id, title, owner_id, cover_url, gallery_urls, tags, tools, views")
        .eq("status", "Published")
        .eq("category", category!)
        .neq("id", projectId!)
        .order("views", { ascending: false })
        .limit(48);
      if (ownerId) q = q.neq("owner_id", ownerId);
      const { data: rows, error } = await q;
      if (error) return [];
      const myTags = new Set(stripCategorySubTags(tags).map((t) => t.toLowerCase()));
      const myTools = new Set((tools ?? []).map((t) => t.toLowerCase()));
      return ((rows ?? []) as SimilarRow[])
        .map((r) => {
          const sharedTags = (r.tags ?? []).filter((t) => myTags.has(t.toLowerCase())).length;
          const sharedTools = (r.tools ?? []).filter((t) => myTools.has(t.toLowerCase())).length;
          return { r, score: sharedTags * 3 + sharedTools * 2 + Math.log10((r.views ?? 0) + 1) };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map(({ r }) => ({
          id: r.id,
          href: `/project/${r.id}`,
          title: r.title,
          image: r.cover_url || r.gallery_urls?.[0] || "",
          views: r.views ?? 0,
        }));
    },
  });
  return (
    <TileRow
      title="ผลงานใกล้เคียงจากครีเอเตอร์อื่น"
      tiles={data}
      moreHref={projectId ? `/similar/${projectId}` : undefined}
      moreLabel="ดูภาพคล้ายแบบละเอียด"
    />
  );
}
