import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import {
  useCreateInspireBoard,
  useUpdateInspireBoard,
  type InspireBoard,
} from "@/hooks/useInspire";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Pick<InspireBoard, "id" | "name"> | null;
  onCreated?: (id: string) => void;
  onUpdated?: () => void;
};

const InspireBoardFormDialog = ({ open, onOpenChange, initial, onCreated, onUpdated }: Props) => {
  const { user } = useAuth();
  const create = useCreateInspireBoard(user?.id);
  const update = useUpdateInspireBoard(user?.id);
  const isEdit = !!initial;
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) setName(initial?.name ?? "");
  }, [open, initial]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("กรุณาตั้งชื่อบอร์ด");
      return;
    }
    try {
      if (isEdit && initial) {
        await update.mutateAsync({ id: initial.id, name: trimmed });
        toast.success("บันทึกชื่อบอร์ดแล้ว");
        onUpdated?.();
      } else {
        const created = await create.mutateAsync(trimmed);
        toast.success("สร้างบอร์ดแล้ว");
        onCreated?.(created.id);
      }
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message || "เกิดข้อผิดพลาด");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "แก้ไขชื่อบอร์ด" : "สร้างบอร์ด Inspire"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="inspire-board-name">ชื่อบอร์ด *</Label>
            <Input
              id="inspire-board-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น Tea Shop — Warm Minimal Direction"
              maxLength={120}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
            />
          </div>

          {!isEdit ? (
            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 space-y-1">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                ส่วนตัว
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                บอร์ดว่างสำหรับเก็บภาพจากผลงาน — กด Inspire บนภาพเพื่อเพิ่มเข้าบอร์ดนี้
              </p>
            </div>
          ) : null}
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
            {isEdit ? "บันทึก" : "สร้างบอร์ด"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InspireBoardFormDialog;
