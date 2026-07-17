import { useState } from "react";
import { Loader2, Link2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSubmitHireWork } from "@/hooks/useHireOrderFlow";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  conversationId: string;
  userId: string;
};

export default function HireWorkSubmitDialog({
  open,
  onOpenChange,
  orderId,
  conversationId,
  userId,
}: Props) {
  const submit = useSubmitHireWork();
  const [links, setLinks] = useState<string[]>([""]);
  const [note, setNote] = useState("");

  const setLink = (idx: number, value: string) => {
    setLinks((prev) => prev.map((l, i) => (i === idx ? value : l)));
  };

  const addLink = () => setLinks((prev) => [...prev, ""]);
  const removeLink = (idx: number) => setLinks((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    const clean = links.map((l) => l.trim()).filter(Boolean);
    if (!clean.length) {
      toast.error("ใส่ลิงก์ผลงานอย่างน้อย 1 รายการ");
      return;
    }
    try {
      await submit.mutateAsync({
        orderId,
        conversationId,
        links: clean,
        note,
        userId,
      });
      setLinks([""]);
      setNote("");
      onOpenChange(false);
    } catch {
      /* toast in hook */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ส่งผลงาน</DialogTitle>
          <DialogDescription>
            แนบลิงก์ไฟล์งาน (Drive, Figma, ฯลฯ) — ผู้จ้างมีเวลายืนยันหรือขอแก้ไขตามเงื่อนไขแพลตฟอร์ม
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label>ลิงก์ผลงาน</Label>
            {links.map((link, idx) => (
              <div key={idx} className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={link}
                    onChange={(e) => setLink(idx, e.target.value)}
                    placeholder="https://..."
                    className="pl-9 rounded-xl"
                    disabled={submit.isPending}
                  />
                </div>
                {links.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 rounded-full"
                    onClick={() => removeLink(idx)}
                    disabled={submit.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                ) : null}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={addLink}
              disabled={submit.isPending}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> เพิ่มลิงก์
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hire-delivery-note">หมายเหตุ (ไม่บังคับ)</Label>
            <Textarea
              id="hire-delivery-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="อธิบายสิ่งที่ส่งมา หรือวิธีเปิดไฟล์..."
              className="rounded-xl min-h-[80px]"
              disabled={submit.isPending}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={submit.isPending}
            onClick={() => onOpenChange(false)}
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            className="rounded-full"
            disabled={submit.isPending}
            onClick={() => void handleSubmit()}
          >
            {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            ส่งผลงาน
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
