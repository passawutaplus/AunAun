import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, ExternalLink, Loader2, Share2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import type { Supplier } from "@/store/suppliers";
import { SHAREABLE_FIELDS } from "./SupplierPaper";

interface Props {
  open: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onEnable: (id: string) => Promise<Supplier>;
  onDisable: (id: string) => Promise<void>;
  onUpdate: (id: string, patch: Partial<Supplier>) => Promise<void>;
}

export function SupplierShareDialog({
  open,
  supplier,
  onClose,
  onEnable,
  onDisable,
  onUpdate,
}: Props) {
  const [working, setWorking] = React.useState(false);
  const [current, setCurrent] = React.useState<Supplier | null>(supplier);
  const [hidden, setHidden] = React.useState<string[]>(supplier?.shareHiddenFields ?? []);
  const [savingFields, setSavingFields] = React.useState(false);

  React.useEffect(() => {
    setCurrent(supplier);
    setHidden(supplier?.shareHiddenFields ?? []);
  }, [supplier]);

  const isShared = current?.isShared && current?.shareToken;
  const url =
    isShared && typeof window !== "undefined"
      ? `${window.location.origin}/supplier/${current!.shareToken}`
      : "";

  const toggleShare = async (next: boolean) => {
    if (!current) return;
    setWorking(true);
    try {
      if (next) {
        const updated = await onEnable(current.id);
        setCurrent(updated);
        toast.success("เปิดลิงก์สาธารณะแล้ว");
      } else {
        await onDisable(current.id);
        setCurrent({ ...current, isShared: false, shareToken: undefined });
        toast.success("ปิดลิงก์สาธารณะแล้ว");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
    } finally {
      setWorking(false);
    }
  };

  const persistHidden = async (next: string[]) => {
    if (!current) return;
    setHidden(next);
    setSavingFields(true);
    try {
      await onUpdate(current.id, { shareHiddenFields: next });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSavingFields(false);
    }
  };

  const toggleField = (key: string, show: boolean) => {
    const next = show ? hidden.filter((k) => k !== key) : Array.from(new Set([...hidden, key]));
    void persistHidden(next);
  };

  const showAll = () => void persistHidden([]);
  const hideAll = () => void persistHidden(SHAREABLE_FIELDS.map((f) => f.key));

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success("คัดลอกลิงก์แล้ว");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" /> แชร์ Supplier
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 p-4 bg-muted/30 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{current?.name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                ลิงก์สาธารณะ — ใครเข้าก็เห็น (ไม่แสดงโน้ตส่วนตัว/ไฟล์)
              </p>
            </div>
            <Switch checked={Boolean(isShared)} onCheckedChange={toggleShare} disabled={working} />
          </div>

          {working && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          )}

          {isShared && url && (
            <>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input value={url} readOnly className="h-10 text-xs font-mono" />
                  <Button size="sm" variant="outline" className="h-10 px-3" onClick={copy}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button asChild variant="outline" size="sm" className="w-full gap-1.5 h-9">
                  <a href={url} target="_blank" rel="noopener">
                    <ExternalLink className="h-3.5 w-3.5" /> เปิดดูตัวอย่าง
                  </a>
                </Button>
              </div>

              <div className="rounded-xl border border-border/60 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">เลือกข้อมูลที่จะแสดง</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      ติ๊ก = แสดง · เอาออก = ซ่อนจากผู้ที่ดูลิงก์
                    </p>
                  </div>
                  {savingFields && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                </div>

                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[11px] gap-1 px-2"
                    onClick={showAll}
                  >
                    <Eye className="h-3 w-3" /> แสดงทั้งหมด
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[11px] gap-1 px-2"
                    onClick={hideAll}
                  >
                    <EyeOff className="h-3 w-3" /> ซ่อนทั้งหมด
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {SHAREABLE_FIELDS.map((f) => {
                    const checked = !hidden.includes(f.key);
                    return (
                      <label
                        key={f.key}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => toggleField(f.key, Boolean(v))}
                        />
                        <span className="text-[12px]">{f.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {!isShared && (
            <p className="text-[11px] text-muted-foreground text-center">
              เปิดสวิตช์เพื่อสร้างลิงก์สาธารณะ จากนั้นเลือกข้อมูลที่ต้องการแสดงได้
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
