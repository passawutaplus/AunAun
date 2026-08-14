import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { fetchFeedCardRows } from "@/lib/fetchProjectRow";
import AiDisclosureBadge from "@/components/license/AiDisclosureBadge";

type OwnerWorkThumb = {
  id: string;
  title: string;
  cover_url: string | null;
  gallery_urls: string[] | null;
  views: number | null;
  ai_assisted?: boolean | null;
  ai_disclosure_note?: string | null;
};

type Props = {
  ownerId: string | undefined;
  excludeProjectId: string | undefined;
  ownerName?: string | null;
  className?: string;
};

const LIMIT = 4;
const THUMB_SELECT = "id, title, cover_url, gallery_urls, views";
const THUMB_SELECT_WITH_AI = `${THUMB_SELECT}, ai_assisted, ai_disclosure_note`;

export function OwnerOtherWorks({
  ownerId,
  excludeProjectId,
  ownerName,
  className,
}: Props) {
  const { data: works = [] } = useQuery({
    queryKey: ["owner-other-works", ownerId, excludeProjectId],
    enabled: !!ownerId,
    queryFn: async (): Promise<OwnerWorkThumb[]> => {
      const data = await fetchFeedCardRows(
        (select) =>
          supabase
            .from("projects")
            .select(select)
            .eq("owner_id", ownerId!)
            .eq("status", "Published")
            .order("views", { ascending: false })
            .limit(LIMIT + 4),
        THUMB_SELECT_WITH_AI,
        THUMB_SELECT,
      );
      return (data as OwnerWorkThumb[])
        .filter((p) => p.id !== excludeProjectId)
        .slice(0, LIMIT);
    },
  });

  if (!ownerId || works.length === 0) return null;

  const label = ownerName?.trim() ? `ผลงานอื่นของ ${ownerName.trim()}` : "ผลงานอื่น ๆ";

  return (
    <section className={cn("space-y-3 pt-2", className)}>
      <h2 className="text-base font-semibold text-foreground">{label}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {works.map((p) => {
          const thumb = p.cover_url || p.gallery_urls?.[0];
          const views = p.views ?? 0;
          return (
            <Link
              key={p.id}
              to={`/project/${p.id}`}
              className="group min-w-0 rounded-xl overflow-hidden glass-panel hover:shadow-md transition-shadow"
            >
              <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                ) : null}
                <div className="absolute top-1.5 right-1.5 z-10">
                  <AiDisclosureBadge assisted={p.ai_assisted} note={p.ai_disclosure_note} />
                </div>
              </div>
              <div className="flex min-w-0 items-center gap-1.5 px-2 py-1.5">
                <p className="min-w-0 flex-1 truncate text-xs font-medium leading-snug text-foreground">
                  {p.title}
                </p>
                <span
                  className="inline-flex shrink-0 items-center gap-0.5 text-[10px] text-muted-foreground tabular-nums"
                  aria-label={`${views.toLocaleString("th-TH")} วิว`}
                >
                  <Eye className="h-2.5 w-2.5" aria-hidden />
                  {views.toLocaleString("th-TH")}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default OwnerOtherWorks;
