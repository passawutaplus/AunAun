import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  useCreateProjectSeries,
  useUpdateProjectSeries,
  type ProjectSeries,
} from "@/hooks/useProjectSeries";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: ProjectSeries | null;
  onCreated?: (id: string) => void;
}

export function SeriesFormDialog({ open, onOpenChange, initial, onCreated }: Props) {
  const { user } = useAuth();
  const create = useCreateProjectSeries();
  const update = useUpdateProjectSeries();
  const isEdit = !!initial;

  const [title, setTitle] = useState("");
  const [clientLabel, setClientLabel] = useState("");
  const [summary, setSummary] = useState("");
  const [year, setYear] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setClientLabel(initial?.client_label ?? "");
    setSummary(initial?.summary ?? "");
    setYear(initial?.year != null ? String(initial.year) : "");
    setIsPublic(initial?.is_public ?? true);
  }, [open, initial]);

  const submit = async () => {
    if (!title.trim()) {
      toast.error("กรุณาตั้งชื่อชุดผลงาน");
      return;
    }
    const yearNum = year.trim() ? Number(year.trim()) : null;
    if (year.trim() && (!Number.isFinite(yearNum) || yearNum! < 1990 || yearNum! > 2100)) {
      toast.error("ปีไม่ถูกต้อง");
      return;
    }
    try {
      if (isEdit && initial) {
        await update.mutateAsync({
          id: initial.id,
          patch: {
            title: title.trim(),
            client_label: clientLabel.trim(),
            summary: summary.trim(),
            year: yearNum,
            is_public: isPublic,
          },
        });
        toast.success("บันทึกแล้ว");
      } else {
        if (!user?.id) return;
        const created = await create.mutateAsync({
          ownerId: user.id,
          title: title.trim(),
          clientLabel: clientLabel.trim(),
          summary: summary.trim(),
          year: yearNum,
          isPublic,
        });
        toast.success("สร้างชุดผลงานแล้ว — เพิ่มผลงานเข้าชุดได้ทุกเมื่อ");
        onCreated?.(created.id);
      }
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "แก้ไขชุดผลงาน" : "สร้างชุดผลงาน"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            สร้างโฟลเดอร์ว่างไว้ก่อนได้ แล้วค่อยเพิ่มผลงานทีหลัง — หรือมีงานแล้วค่อยโยนเข้าชุดก็ได้
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="series-title">ชื่อชุด *</Label>
            <Input
              id="series-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น บริษัท A — Rebrand 2025"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="series-client">ลูกค้า / แบรนด์</Label>
            <Input
              id="series-client"
              value={clientLabel}
              onChange={(e) => setClientLabel(e.target.value)}
              placeholder="เช่น บริษัท A"
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="series-year">ปี</Label>
            <Input
              id="series-year"
              value={year}
              onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="2025"
              inputMode="numeric"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="series-summary">สรุปสั้น ๆ</Label>
            <Textarea
              id="series-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              maxLength={400}
              placeholder="เล่าภาพรวมเคสนี้สั้น ๆ"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <p className="text-sm font-medium">แสดงต่อสาธารณะ</p>
              <p className="text-xs text-muted-foreground">โชว์บนโปรไฟล์เมื่อมีผลงานเผยแพร่ในชุด</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={create.isPending || update.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isEdit ? "บันทึก" : "สร้างชุด"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
