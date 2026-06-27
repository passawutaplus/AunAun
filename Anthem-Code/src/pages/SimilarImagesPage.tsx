import { useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { ExternalLink, Sparkles, ImageIcon } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { useProject } from "@/hooks/useProjects";
import { useSimilarImages, type SimilarMode } from "@/hooks/useSimilarImages";
import { Skeleton } from "@/components/ui/skeleton";

const SimilarImagesPage = () => {
  const { projectId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const imgIdx = parseInt(params.get("img") ?? "0", 10);
  const { data: project } = useProject(projectId);
  const [mode, setMode] = useState<SimilarMode>("ai");
  const { data: similar = [], isLoading } = useSimilarImages(projectId, mode);

  const sourceImage =
    project?.gallery_urls?.[imgIdx] || project?.gallery_urls?.[0] || project?.cover_url || "";

  const modes: { key: SimilarMode; label: string; Icon: typeof Sparkles }[] = [
    { key: "image", label: "จากภาพนี้", Icon: ImageIcon },
    { key: "ai", label: "AI แนะนำ", Icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-app-ambient">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <BackButton className="shrink-0" />
          <h1 className="text-sm font-semibold truncate">ภาพคล้ายกัน</h1>
          <div className="flex items-center gap-1 shrink-0">
            {modes.map(({ key, label, Icon }) => {
              const active = mode === key;
              return (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3 h-3" /> <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[420px_1fr] gap-6">
          {/* Source image (sticky left) */}
          <div className="lg:sticky lg:top-20 lg:self-start space-y-4">
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

          {/* Similar grid (Pinterest masonry) */}
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              {isLoading
                ? "กำลังค้นหา..."
                : `${mode === "ai" ? "AI พบ" : "พบ"} ${similar.length} ภาพ`}
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
              <div className="text-center py-12 text-muted-foreground text-sm">
                ยังไม่มีภาพคล้าย ลองสลับโหมดด้านบน หรือกลับมาอีกครั้ง
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
