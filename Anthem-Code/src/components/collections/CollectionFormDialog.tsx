import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useCreateCollection, useUpdateCollection, type Collection } from "@/hooks/useCollections";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Collection | null;
  onCreated?: (id: string) => void;
}

const CollectionFormDialog = ({ open, onOpenChange, initial, onCreated }: Props) => {
  const { user } = useAuth();
  const create = useCreateCollection();
  const update = useUpdateCollection();
  const isEdit = !!initial;

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setCategory(initial?.category ?? "");
      setDescription(initial?.description ?? "");
      setIsPublic(initial?.is_public ?? false);
    }
  }, [open, initial]);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("กรุณาตั้งชื่อคอลเลกชัน");
      return;
    }
    try {
      if (isEdit && initial) {
        await update.mutateAsync({
          id: initial.id,
          patch: { name: name.trim(), category: category.trim(), description: description.trim(), is_public: isPublic },
        });
        toast.success("บันทึกแล้ว");
      } else {
        if (!user?.id) return;
        const created = await create.mutateAsync({
          ownerId: user.id,
          name: name.trim(),
          category: category.trim(),
          description: description.trim(),
          isPublic,
        });
        toast.success("สร้างคอลเลกชันแล้ว");
        onCreated?.(created.id);
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "เกิดข้อผิดพลาด");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "แก้ไขคอลเลกชัน" : "สร้างคอลเลกชันใหม่"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="col-name">ชื่อคอลเลกชัน *</Label>
            <Input id="col-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น Branding Inspo" maxLength={60} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="col-cat">หมวด / นิทรรศการ</Label>
            <Input id="col-cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="เช่น Minimal, Y2K, Poster" maxLength={40} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="col-desc">คำอธิบาย</Label>
            <Textarea id="col-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={300} placeholder="เล่ารสนิยม / คอนเซปต์ของคอลเลกชันนี้" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <p className="text-sm font-medium">แสดงต่อสาธารณะ</p>
              <p className="text-xs text-muted-foreground">โชว์บนโปรไฟล์ของคุณ</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button onClick={submit} disabled={create.isPending || update.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {isEdit ? "บันทึก" : "สร้าง"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CollectionFormDialog;
