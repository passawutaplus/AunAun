import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Heart } from "lucide-react";
import { useColorPalettes } from "@/hooks/useColorPalettes";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hex: string;
}

export function SaveColorDialog({ open, onOpenChange, hex }: Props) {
  const { palettes, createPalette, addColor } = useColorPalettes();
  const [paletteId, setPaletteId] = React.useState<string>("");
  const [label, setLabel] = React.useState("");
  const [newName, setNewName] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setLabel("");
      setNewName("");
      setCreating(palettes.length === 0);
      setPaletteId(palettes[0]?.id ?? "");
    }
  }, [open, palettes]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let pid = paletteId;
      if (creating || !pid) {
        const id = await createPalette(newName || "พาเลทของฉัน");
        if (!id) return;
        pid = id;
      }
      await addColor(pid, hex, label);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" /> บันทึกสีนี้
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div
              className="w-12 h-12 rounded-md border border-border"
              style={{ backgroundColor: hex }}
            />
            <div>
              <div className="text-xs text-muted-foreground">สีที่จะบันทึก</div>
              <div className="font-mono font-semibold text-sm">{hex}</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">ชื่อสี (ถ้ามี)</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="เช่น สีหลักโลโก้"
              maxLength={60}
            />
          </div>

          {!creating && palettes.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">เลือกหมวด</Label>
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> สร้างหมวดใหม่
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {palettes.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPaletteId(p.id)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition ${
                      paletteId === p.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:border-primary"
                    }`}
                  >
                    {p.name} <span className="opacity-60">({p.colors.length})</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs">ชื่อหมวดใหม่</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="เช่น Brand Colors / Pastel"
                maxLength={40}
                autoFocus
              />
              {palettes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  ← กลับไปเลือกหมวดเดิม
                </button>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            <Heart className="h-4 w-4" /> บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
