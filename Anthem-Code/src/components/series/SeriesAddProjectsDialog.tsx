import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMyProjects } from "@/hooks/useProjects";
import { useAddProjectsToSeries, useProjectSeriesItems } from "@/hooks/useProjectSeries";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  seriesId: string;
  seriesTitle?: string;
}

export function SeriesAddProjectsDialog({ open, onOpenChange, seriesId, seriesTitle }: Props) {
  const { user } = useAuth();
  const { data: projects = [] } = useMyProjects(user?.id);
  const { data: existingItems = [] } = useProjectSeriesItems(open ? seriesId : undefined);
  const add = useAddProjectsToSeries();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const alreadyInSeries = useMemo(
    () => new Set(existingItems.map((i) => i.project_id)),
    [existingItems],
  );

  const published = useMemo(
    () => projects.filter((p) => p.status === "Published" && !alreadyInSeries.has(p.id)),
    [projects, alreadyInSeries],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    const ids = [...selected];
    if (!ids.length) {
      toast.error("เลือกอย่างน้อย 1 ผลงาน");
      return;
    }
    try {
      await add.mutateAsync({ seriesId, projectIds: ids });
      toast.success(`เพิ่ม ${ids.length} ผลงานเข้าชุดแล้ว`);
      setSelected(new Set());
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "เพิ่มไม่สำเร็จ");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setSelected(new Set());
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>เพิ่มผลงานเข้าชุด</DialogTitle>
          {seriesTitle ? (
            <p className="text-xs text-muted-foreground">{seriesTitle}</p>
          ) : null}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 -mx-1 px-1">
          {published.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              ไม่มีผลงานที่เผยแพร่แล้วให้เพิ่ม
              <br />
              (ชิ้นที่อยู่ในชุดนี้อยู่แล้วจะไม่แสดง)
            </div>
          ) : (
            published.map((p) => {
              const active = selected.has(p.id);
              const thumb = p.cover_url || p.gallery_urls?.[0];
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border/60 bg-secondary/40 hover:bg-accent",
                  )}
                >
                  <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                    {thumb ? (
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.category || "ผลงาน"}</p>
                  </div>
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full border flex items-center justify-center shrink-0",
                      active ? "bg-primary border-primary text-primary-foreground" : "border-border",
                    )}
                  >
                    {active ? <Check className="w-3.5 h-3.5" /> : null}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={add.isPending || selected.size === 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            เพิ่มเข้าชุด ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
