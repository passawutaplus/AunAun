import { useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { ExternalLink, Palette, Shapes, Sparkles, Grid3x3 } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { useProject } from "@/hooks/useProjects";
import {
  useSimilarImages,
  DEFAULT_SIMILAR_ASPECTS,
  SIMILAR_ASPECTS,
  type SimilarAspect,
} from "@/hooks/useSimilarImages";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const ASPECT_ICONS: Record<SimilarAspect, typeof Palette> = {
  color: Palette,
  style: Sparkles,
  shape: Shapes,
  pattern: Grid3x3,
};

const SimilarImagesPage = () => {
  const { projectId } = useParams();
  const [params] = useSearchParams();
  const imgIdx = parseInt(params.get("img") ?? "0", 10);
  const { data: project } = useProject(projectId);
  const [aspects, setAspects] = useState<SimilarAspect[]>(DEFAULT_SIMILAR_ASPECTS);
  const { data: similar = [], isLoading } = useSimilarImages(projectId, aspects, imgIdx);

  const sourceImage =
    project?.gallery_urls?.[imgIdx] || project?.gallery_urls?.[0] || project?.cover_url || "";

  const activeAspectLabels = useMemo(
    () => SIMILAR_ASPECTS.filter((a) => aspects.includes(a.key)).map((a) => a.label),
    [aspects],
  );

  const toggleAspect = (key: SimilarAspect) => {
    setAspects((prev) => {
      if (prev.includes(key)) {
        const next = prev.filter((k) => k !== key);
        return next.length ? next : [key];
      }
      return [...prev, key];
    });
  };

  return (
    <div className="min-h-screen bg-app-ambient">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <BackButton className="shrink-0" />
            <h1 className="text-sm font-semibold truncate">ภาพคล้ายกัน</h1>
            <div className="w-9 shrink-0" aria-hidden />
          </div>
          <p className="text-[11px] text-muted-foreground text-center sm:text-left">
            ค้นหาจากภาพต้นฉบับ — เลือกมิติที่อยากให้ใกล้เคียง (ไม่ต้องเหมือนเป๊ะ)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SIMILAR_ASPECTS.map(({ key, label, hint }) => {
              const active = aspects.includes(key);
              const Icon = ASPECT_ICONS[key];
              return (
                <button
                  key={key}
                  type="button"
                  title={hint}
                  onClick={() => toggleAspect(key)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[420px_1fr] gap-6">
          <div className="lg:sticky lg:top-28 lg:self-start space-y-4">
            {sourceImage ? (
              <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-sm">
                <img src={sourceImage} alt={project?.title ?? ""} className="w-full object-cover" />
              </div>
            ) : (
              <Skeleton className="w-full aspect-square rounded-2xl" />
            )}
            {project && (
              <div className="space-y-2">
                <p className="text-xs text-primary uppercase tracking-wide">{project.category}</p>
                <h2 className="text-lg font-semibold">{project.title}</h2>
                {project.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{project.description}</p>
                )}
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link to={`/project/${project.id}`}>
                    <ExternalLink className="w-4 h-4 mr-1" /> ดูผลงานเต็ม
                  </Link>
                </Button>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-3">
              {isLoading
                ? "กำลังวิเคราะห์ภาพและค้นหา..."
                : `พบ ${similar.length} ภาพที่ใกล้เคียง${activeAspectLabels.length ? ` (${activeAspectLabels.join(" · ")})` : ""}`}
            </p>
            {isLoading ? (
              <div className="columns-2 md:columns-3 gap-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="w-full mb-3 rounded-xl"
                    style={{ height: `${160 + (i % 4) * 60}px` }}
                  />
                ))}
              </div>
            ) : similar.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm space-y-2">
                <p>ยังไม่พบภาพที่ใกล้เคียงพอ</p>
                <p className="text-xs">ลองเปิดฟิลเตอร์เพิ่ม หรือสลับมิติ (สี / สไตล์ / รูปทรง / รูปแบบ)</p>
              </div>
            ) : (
              <div className="columns-2 md:columns-3 gap-3 [column-fill:_balance]">
                {similar.map((s, i) => (
                  <Link
                    key={`${s.project_id}-${i}`}
                    to={`/project/${s.project_id}`}
                    className="group mb-3 block break-inside-avoid rounded-xl overflow-hidden border border-border bg-card hover:border-primary/50 transition relative"
                  >
                    <img src={s.image_url} alt={s.title} className="w-full object-cover" loading="lazy" />
                    <div className="absolute top-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-white tabular-nums">
                      {Math.round(s.similarity * 100)}%
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition">
                      <p className="text-white text-xs font-medium truncate">{s.title}</p>
                      <p className="text-white/70 text-[10px]">{s.category}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimilarImagesPage;
