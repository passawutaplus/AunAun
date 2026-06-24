import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sanitizeText } from "@/lib/security";
import { toast } from "sonner";
import { ImagePlus, X, Plus } from "lucide-react";
import { Revision, RevisionStatus, STATUS_META, filesToDataUrls } from "./types";

export function AddRevisionForm({
  nextRound,
  onAdd,
}: {
  nextRound: number;
  onAdd: (rev: Omit<Revision, "id" | "createdAt">) => void;
}) {
  const [notes, setNotes] = React.useState("");
  const [images, setImages] = React.useState<string[]>([]);
  const [status, setStatus] = React.useState<RevisionStatus>("in_progress");

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const urls = await filesToDataUrls(files);
      setImages((arr) => [...arr, ...urls].slice(0, 8));
    } catch {
      toast.error("อ่านไฟล์รูปไม่สำเร็จ");
    }
  };

  const submit = () => {
    const n = sanitizeText(notes, 2000);
    if (!n) return toast.error("กรอกรายละเอียดการแก้ไข");
    onAdd({ round: nextRound, notes: n, images, status });
    setNotes("");
    setImages([]);
    setStatus("in_progress");
    toast.success(`บันทึกการแก้ไขครั้งที่ ${nextRound} แล้ว`);
  };

  return (
    <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary-soft/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Badge className="bg-primary text-primary-foreground rounded-md">
          แก้ไขครั้งที่ {nextRound}
        </Badge>
      </div>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={`บันทึกการแก้ไขครั้งที่ ${nextRound}: แก้อะไร จุดไหนบ้าง...`}
        rows={4}
        maxLength={2000}
        className="rounded-xl bg-background"
      />

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((src, i) => (
            <div
              key={i}
              className="relative group rounded-lg overflow-hidden border border-border/60"
            >
              <img
                src={src}
                alt={`ref ${i + 1}`}
                className="w-full aspect-square object-cover"
                loading="lazy"
                decoding="async"
              />
              <button
                type="button"
                onClick={() => setImages((arr) => arr.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                aria-label="ลบรูป"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary/50 transition-colors">
          <ImagePlus className="h-3.5 w-3.5" />
          แนบรูป
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>

        <Select value={status} onValueChange={(v) => setStatus(v as RevisionStatus)}>
          <SelectTrigger className="h-9 w-[150px] rounded-xl text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(STATUS_META) as RevisionStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={submit}
          className="ml-auto rounded-xl bg-primary hover:bg-primary/90 gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> บันทึก
        </Button>
      </div>
    </div>
  );
}
