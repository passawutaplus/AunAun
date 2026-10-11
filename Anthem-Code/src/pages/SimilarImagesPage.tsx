import { useMemo, useState, type ReactNode } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Bookmark, ExternalLink, Palette, Shapes, Sparkles, Grid3x3, Search } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";
import SaveToCollectionPopover from "@/components/collections/SaveToCollectionPopover";
import { useProject } from "@/hooks/useProjects";
import { useImagePalette } from "@/hooks/useImagePalette";
import { useProfilesByIds } from "@/core/profiles";
import {
  useSimilarImages,
  projectImageUrls,
  DEFAULT_SIMILAR_ASPECTS,
  SIMILAR_ASPECTS,
  type SimilarAspect,
  type SimilarImage,
} from "@/hooks/useSimilarImages";
import { toHexColor } from "@/lib/imagePalette";
import { thumbFeedCoverUrl } from "@/lib/feedProjectCover";
import { cn } from "@/lib/utils";

const ASPECT_ICONS: Record<SimilarAspect, typeof Palette> = {
  color: Palette,
  style: Sparkles,
  shape: Shapes,
  pattern: Grid3x3,
};

/** Results at or above this blended score are "very close"; the rest are "you may also like". */
const STRONG_MATCH = 0.3;

const RESULTS_GRID = "columns-2 gap-4 sm:gap-5 md:columns-3 xl:columns-4 2xl:columns-5";

function ResultCard({ item, ownerName, ownerAvatar }: { item: SimilarImage; ownerName?: string | null; ownerAvatar?: string | null }) {
  return (
    <div className="group relative mb-4 break-inside-avoid sm:mb-5">
      <Link to={`/project/${item.project_id}`} className="block overflow-hidden rounded-[6px] bg-muted">
        <img src={item.image_url} alt={item.title} className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
      </Link>
      <div className="absolute right-2 top-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
        <SaveToCollectionPopover projectId={item.project_id}>
          <button
            type="button"
            aria-label="เก็บเข้าคอลเลกชัน"
            title="เก็บเข้าคอลเลกชัน"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-background/90 text-foreground shadow-sm backdrop-blur-sm hover:bg-background"
          >
            <Bookmark className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </SaveToCollectionPopover>
      </div>
      <div className="flex min-w-0 items-center gap-2 px-0.5 pt-2">
        <UserAvatar src={ownerAvatar} name={ownerName} className="h-5 w-5" fallbackClassName="text-[8px]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">{item.title}</p>
          {ownerName ? <p className="truncate text-[11px] text-muted-foreground">{ownerName}</p> : null}
        </div>
      </div>
    </div>
  );
}

function SourcePalette({ src }: { src: string }) {
  const raw = useImagePalette(src, 6);
  const readable = raw.length > 0 && raw.every((c) => !c.startsWith("hsl("));
  if (!readable) return null;
  const palette = [...new Set(raw.map(toHexColor))];
  const copy = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex.toUpperCase());
      toast.success(`คัดลอก ${hex.toUpperCase()} แล้ว`);
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  };
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-muted-foreground">สีของภาพนี้ — กดเพื่อคัดลอก</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {palette.map((hex) => (
          <button
            key={hex}
            type="button"
            onClick={() => void copy(hex)}
            aria-label={`คัดลอกสี ${hex.toUpperCase()}`}
            title={hex.toUpperCase()}
            className="h-7 w-7 rounded-full border border-border shadow-sm transition-transform hover:scale-110"
            style={{ backgroundColor: hex }}
          />
        ))}
        <Link
          to={`/?mode=projects&color=${encodeURIComponent(palette.slice(0, 2).join(","))}`}
          className="ml-1 inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Search className="h-3 w-3" aria-hidden /> ผลงานโทนนี้
        </Link>
      </div>
    </div>
  );
}

const SkeletonGrid = () => (
  <div className={RESULTS_GRID} aria-hidden>
    {Array.from({ length: 10 }).map((_, i) => (
      <div
        key={i}
        className="mb-4 animate-pulse break-inside-avoid rounded-[6px] bg-muted sm:mb-5"
        style={{ height: [220, 160, 280, 190, 240][i % 5] }}
      />
    ))}
  </div>
);

const SimilarImagesPage = () => {
  const { projectId } = useParams();
  const [params, setParams] = useSearchParams();
  const imgIdx = parseInt(params.get("img") ?? "0", 10) || 0;
  const { data: project } = useProject(projectId);
  const [aspects, setAspects] = useState<SimilarAspect[]>(DEFAULT_SIMILAR_ASPECTS);
  const { data: similar = [], isLoading } = useSimilarImages(projectId, aspects, imgIdx);

  const sourceUrls = useMemo(
    () =>
      project
        ? projectImageUrls({
            gallery_urls: project.gallery_urls,
            cover_url: project.cover_url,
            content_blocks: (project as { content_blocks?: unknown }).content_blocks,
          })
        : [],
    [project],
  );
  const sourceImage = sourceUrls[imgIdx] || sourceUrls[0] || "";
  const sourceOwnerId = (project as { owner_id?: string } | undefined)?.owner_id;

  const ownerIds = useMemo(
    () => [...new Set([...similar.map((s) => s.owner_id), sourceOwnerId].filter((id): id is string => !!id))],
    [similar, sourceOwnerId],
  );
  const { data: ownersData } = useProfilesByIds(ownerIds);
  const owners = ownersData?.map ?? {};
  const sourceOwner = sourceOwnerId ? owners[sourceOwnerId] : null;

  const visible = useMemo(
    () =>
      [...similar]
        // Only other creators' works — the owner's own are one click away on the project page.
        .filter((s) => !sourceOwnerId || s.owner_id !== sourceOwnerId)
        .sort((a, b) => b.similarity - a.similarity),
    [similar, sourceOwnerId],
  );
  const strong = visible.filter((s) => s.similarity >= STRONG_MATCH);
  const more = visible.filter((s) => s.similarity < STRONG_MATCH);

  const toggleAspect = (key: SimilarAspect) => {
    setAspects((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) {
          toast.message("เลือกอย่างน้อย 1 มิติ");
          return prev;
        }
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  };

  const selectImage = (i: number) => {
    const next = new URLSearchParams(params);
    next.set("img", String(i));
    setParams(next, { replace: true });
  };

  const renderCards = (items: SimilarImage[]): ReactNode => (
    <div className={RESULTS_GRID}>
      {items.map((s, i) => (
        <ResultCard
          key={`${s.project_id}-${i}`}
          item={s}
          ownerName={owners[s.owner_id]?.display_name || owners[s.owner_id]?.username}
          ownerAvatar={owners[s.owner_id]?.avatar_url}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-app-ambient">
      <div className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1920px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 lg:px-8">
          <BackButton className="shrink-0" />
          <h1 className="text-sm font-semibold">ภาพคล้ายกัน</h1>
          <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto" role="group" aria-label="มิติที่อยากให้ใกล้เคียง">
            {SIMILAR_ASPECTS.map(({ key, label, hint }) => {
              const active = aspects.includes(key);
              const Icon = ASPECT_ICONS[key];
              return (
                <button
                  key={key}
                  type="button"
                  title={hint}
                  aria-pressed={active}
                  onClick={() => toggleAspect(key)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3 w-3" aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1920px] px-4 py-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[360px_1fr] xl:grid-cols-[400px_1fr]">
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            {sourceImage ? (
              <div className="overflow-hidden rounded-[6px] border border-border bg-card shadow-sm">
                <img decoding="async" src={sourceImage} alt={project?.title ?? ""} className="w-full object-cover" />
              </div>
            ) : (
              <div className="aspect-square animate-pulse rounded-[6px] bg-muted" aria-hidden />
            )}

            {sourceUrls.length > 1 ? (
              <div className="space-y-1.5">
                <p className="text-[11px] text-muted-foreground">ค้นจากภาพอื่นในงานนี้</p>
                <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                  {sourceUrls.map((u, i) => (
                    <button
                      key={`${u}-${i}`}
                      type="button"
                      onClick={() => selectImage(i)}
                      aria-pressed={i === imgIdx}
                      aria-label={`ค้นจากภาพที่ ${i + 1}`}
                      className={cn(
                        "h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 transition-colors",
                        i === imgIdx ? "border-foreground" : "border-transparent opacity-70 hover:opacity-100",
                      )}
                    >
                      <img src={thumbFeedCoverUrl(u)} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {sourceImage ? <SourcePalette src={sourceImage} /> : null}

            {project ? (
              <div className="space-y-2 border-t border-border/60 pt-4">
                <p className="text-xs uppercase tracking-wide text-primary">{project.category}</p>
                <h2 className="text-lg font-semibold">{project.title}</h2>
                {sourceOwner ? (
                  <Link to={`/u/${sourceOwnerId}`} className="inline-flex items-center gap-2 text-sm text-foreground hover:underline">
                    <UserAvatar src={sourceOwner.avatar_url} name={sourceOwner.display_name} className="h-6 w-6" />
                    {sourceOwner.display_name || sourceOwner.username}
                  </Link>
                ) : null}
                <Button asChild variant="outline" size="sm" className="w-full rounded-full">
                  <Link to={`/project/${project.id}`}>
                    <ExternalLink className="mr-1 h-4 w-4" /> ดูผลงานเต็ม
                  </Link>
                </Button>
              </div>
            ) : null}
          </aside>

          <main className="min-w-0 space-y-6">

            {isLoading ? (
              <SkeletonGrid />
            ) : visible.length === 0 ? (
              <div className="space-y-2 py-12 text-center text-sm text-muted-foreground">
                <p>ยังไม่พบภาพที่ใกล้เคียงพอ</p>
                <p className="text-xs">
                  ลองเปิดมิติเพิ่ม (สี / สไตล์ / รูปทรง / รูปแบบ)
                </p>
              </div>
            ) : (
              <>
                {strong.length > 0 ? (
                  <section className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground">ใกล้เคียงมาก</h3>
                    {renderCards(strong)}
                  </section>
                ) : null}
                {more.length > 0 ? (
                  <section className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground">{strong.length ? "อาจสนใจ" : "ใกล้เคียง"}</h3>
                    {renderCards(more)}
                  </section>
                ) : null}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default SimilarImagesPage;
