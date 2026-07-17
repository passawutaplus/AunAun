import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderPlus, Link2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type LinkWorkKind = "hire" | "collab";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: LinkWorkKind;
  requestId: string;
  currentProjectId?: string | null;
  onLinked?: () => void;
};

type OwnerProject = {
  id: string;
  title: string;
  cover_url: string | null;
  status: string | null;
};

export default function LinkWorkDialog({
  open,
  onOpenChange,
  kind,
  requestId,
  currentProjectId,
  onLinked,
}: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [pickingId, setPickingId] = useState<string | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["dashboard-link-projects", user?.id],
    enabled: open && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, cover_url, status")
        .eq("owner_id", user!.id)
        .order("updated_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return (data ?? []) as OwnerProject[];
    },
  });

  const linkProject = useMutation({
    mutationFn: async (projectId: string) => {
      if (kind === "hire") {
        const { error } = await supabase
          .from("hiring_requests")
          .update({ linked_project_id: projectId } as never)
          .eq("id", requestId);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("collab_requests")
        .update({ linked_project_id: projectId } as never)
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: (_data, projectId) => {
      void qc.invalidateQueries({ queryKey: ["hiring_requests"] });
      void qc.invalidateQueries({ queryKey: ["collab-requests"] });
      toast.success("เชื่อมผลงานแล้ว");
      onLinked?.();
      onOpenChange(false);
      if (projectId) navigate(`/project/${projectId}`);
    },
    onError: (e: Error) => toast.error(e.message || "เชื่อมผลงานไม่สำเร็จ"),
    onSettled: () => setPickingId(null),
  });

  const createNew = () => {
    onOpenChange(false);
    const param =
      kind === "hire"
        ? `hire_request_id=${encodeURIComponent(requestId)}`
        : `collab_request_id=${encodeURIComponent(requestId)}`;
    navigate(`/portfolio/new?${param}`);
  };

  const pick = (projectId: string) => {
    setPickingId(projectId);
    linkProject.mutate(projectId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            เชื่อมผลงานกับคำขอ
          </DialogTitle>
          <DialogDescription>
            เลือกผลงานที่มีอยู่ หรือสร้างผลงานใหม่แล้วเชื่อมกับคำขอ{kind === "hire" ? "จ้าง" : "ร่วมงาน"}นี้
          </DialogDescription>
        </DialogHeader>

        <Button
          type="button"
          variant="outline"
          className="rounded-full justify-start gap-2 shrink-0"
          onClick={createNew}
        >
          <FolderPlus className="w-4 h-4" />
          สร้างผลงานใหม่
        </Button>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pt-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              กำลังโหลดผลงาน…
            </div>
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              ยังไม่มีผลงาน — สร้างใหม่แล้วกลับมาเชื่อมได้
            </p>
          ) : (
            projects.map((p) => {
              const selected = currentProjectId === p.id;
              const busy = pickingId === p.id && linkProject.isPending;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={linkProject.isPending}
                  onClick={() => pick(p.id)}
                  className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:border-primary/40 ${
                    selected ? "border-primary bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-border shrink-0 bg-muted">
                    {p.cover_url ? (
                      <img src={p.cover_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground px-1 text-center">
                        {p.title.slice(0, 12)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    <p className="text-[11px] text-muted-foreground">{p.status ?? "Draft"}</p>
                  </div>
                  {busy ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
                  ) : selected ? (
                    <span className="text-[10px] text-primary font-medium shrink-0">เชื่อมอยู่</span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
