import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, UserCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInspireBoard, useInspireBoardItems, useRemoveFromInspireBoard } from "@/hooks/useInspire";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const InspireBoardDetailPage = () => {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: board } = useInspireBoard(boardId);
  const { data: items = [], isLoading } = useInspireBoardItems(boardId);
  const remove = useRemoveFromInspireBoard(boardId);
  const [selected, setSelected] = useState<string | null>(null);
  const isOwner = user?.id === board?.owner_id;

  useEffect(() => {
    if (items.length > 0 && !selected) setSelected(items[0].id);
  }, [items, selected]);

  const current = items.find((i) => i.id === selected);

  const { data: sourceProject } = useQuery({
    queryKey: ["inspire-source", current?.project_id],
    enabled: !!current?.project_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, title, category, owner_id, description, tags")
        .eq("id", current!.project_id)
        .maybeSingle();
      return data;
    },
  });

  const { data: owner } = useQuery({
    queryKey: ["profile", sourceProject?.owner_id],
    enabled: !!sourceProject?.owner_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, username")
        .eq("id", sourceProject!.owner_id)
        .maybeSingle();
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-app-ambient">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> กลับ
          </button>
          <h1 className="text-sm font-semibold truncate">{board?.name ?? "..."}</h1>
          <div className="w-12" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {isLoading ? (
          <Skeleton className="w-full aspect-video rounded-2xl" />
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm">
            ยังไม่มีภาพในบอร์ดนี้
          </div>
        ) : (
          <>
            <div className="grid lg:grid-cols-[1fr_340px] gap-6 mb-8">
              <div className="rounded-2xl overflow-hidden border border-border bg-card">
                {current && (
                  <img src={current.image_url} alt="" className="w-full object-contain max-h-[75vh]" />
                )}
              </div>
              <aside className="space-y-4">
                {sourceProject ? (
                  <>
                    <div>
                      <p className="text-xs text-primary uppercase tracking-wide mb-1">{sourceProject.category}</p>
                      <h2 className="text-lg font-semibold">{sourceProject.title}</h2>
                      {sourceProject.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-4">{sourceProject.description}</p>
                      )}
                    </div>
                    {owner && (
                      <Link to={`/u/${owner.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/50 transition">
                        {owner.avatar_url ? (
                          <img src={owner.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted grid place-items-center">
                            <UserCircle2 className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{owner.display_name}</p>
                          <p className="text-xs text-muted-foreground">ดูโปรไฟล์เจ้าของ</p>
                        </div>
                      </Link>
                    )}
                    <Button asChild variant="outline" className="w-full">
                      <Link to={`/project/${sourceProject.id}`}>
                        <ExternalLink className="w-4 h-4 mr-1" /> ดูผลงานทั้งหมด
                      </Link>
                    </Button>
                    {isOwner && current && (
                      <Button
                        variant="ghost"
                        className="w-full text-destructive"
                        onClick={() => {
                          remove.mutate(current.id, {
                            onSuccess: () => {
                              toast.success("ลบจากบอร์ดแล้ว");
                              setSelected(null);
                            },
                          });
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> ลบออกจากบอร์ด
                      </Button>
                    )}
                  </>
                ) : (
                  <Skeleton className="w-full h-32 rounded-xl" />
                )}
              </aside>
            </div>

            {/* Thumbnails */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => setSelected(it.id)}
                  className={`relative rounded-lg overflow-hidden border-2 aspect-square transition ${
                    selected === it.id ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={it.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InspireBoardDetailPage;
