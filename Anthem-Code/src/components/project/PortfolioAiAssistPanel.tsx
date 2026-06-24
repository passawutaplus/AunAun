import { useRef, useState } from "react";
import { Loader2, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GalleryMediaButtons } from "@/components/project/GalleryMediaButtons";
import { SortableGalleryGrid } from "@/components/project/SortableGalleryGrid";
import { ANTHEM_PORTFOLIO_FROM_IMAGES_CREDITS } from "@/lib/aiFeatureCredits";
import { SO1O_PRICING_URL } from "@/lib/productLinks";
import { countMediaByKind, type PortfolioMediaItem } from "@/lib/portfolioMedia";
import type { PortfolioAiAssistResult } from "@/hooks/usePortfolioAiAssist";
import { cn } from "@/lib/utils";

interface PortfolioAiAssistPanelProps {
  mediaItems: PortfolioMediaItem[];
  coverUrl: string;
  category: string;
  categories: string[];
  hint: string;
  onHintChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  uploadingGallery: boolean;
  uploadingVideo: boolean;
  onPickFiles: (files: FileList | File[]) => void;
  onPickVideo: (file: File) => void;
  onReorder: (items: PortfolioMediaItem[]) => void;
  onSetCover: (url: string) => void;
  onRemove: (index: number) => void;
  maxGallery: number;
  maxVideos: number;
  aiLoading: boolean;
  aiResult: PortfolioAiAssistResult | null;
  limitReached: boolean;
  onRunAi: () => void;
  onApplyAll: (result: PortfolioAiAssistResult) => void;
  onApplyField: (field: keyof PortfolioAiAssistResult, result: PortfolioAiAssistResult) => void;
  onClearResult: () => void;
}

export function PortfolioAiAssistPanel({
  mediaItems,
  coverUrl,
  category,
  categories,
  hint,
  onHintChange,
  onCategoryChange,
  uploadingGallery,
  uploadingVideo,
  onPickFiles,
  onPickVideo,
  onReorder,
  onSetCover,
  onRemove,
  maxGallery,
  maxVideos,
  aiLoading,
  aiResult,
  limitReached,
  onRunAi,
  onApplyAll,
  onApplyField,
  onClearResult,
}: PortfolioAiAssistPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const imageCount = countMediaByKind(mediaItems, "image");
  const videoCount = countMediaByKind(mediaItems, "video");
  const canRunAi = imageCount >= 2 && !aiLoading && !limitReached;
  const atMaxImages = imageCount >= maxGallery;
  const atMaxVideos = videoCount >= maxVideos;

  return (
    <section className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          โยนรูปก่อน — AI ช่วยเติมข้อมูล
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          อัปโหลดรูปผลงาน แล้วบอกสั้นๆ ว่างานอะไร · AI จะช่วยเรียงภาพ ตั้งปก ชื่อ แท็ก และเครื่องมือ
        </p>
      </div>

      {mediaItems.length === 0 ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            if (e.dataTransfer.files?.length) onPickFiles(e.dataTransfer.files);
          }}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "rounded-2xl border-2 border-dashed cursor-pointer p-10 flex flex-col items-center justify-center gap-2 transition",
            drag ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted/30",
          )}
        >
          {uploadingGallery ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          ) : (
            <Upload className="w-8 h-8 text-muted-foreground" />
          )}
          <p className="text-sm font-medium text-foreground">ลากภาพหลายไฟล์มาวาง หรือคลิกเพื่อเลือก</p>
          <p className="text-xs text-muted-foreground">อย่างน้อย 2 ภาพเพื่อใช้ AI · สูงสุด {maxGallery} ภาพ</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => e.target.files && onPickFiles(e.target.files)}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm font-semibold">
              แกลเลอรีผลงาน ({imageCount} ภาพ{videoCount > 0 ? `, ${videoCount} วิดีโอ` : ""})
            </Label>
            <GalleryMediaButtons
              imageDisabled={atMaxImages}
              videoDisabled={atMaxVideos}
              uploadingImage={uploadingGallery}
              uploadingVideo={uploadingVideo}
              onPickImages={(files) => onPickFiles(files)}
              onPickVideo={onPickVideo}
            />
          </div>
          <SortableGalleryGrid
            items={mediaItems}
            coverUrl={coverUrl}
            onReorder={onReorder}
            onSetCover={onSetCover}
            onRemove={onRemove}
            layout="grid"
          />
          {(uploadingGallery || uploadingVideo) && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> กำลังอัปโหลด...
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">งานนี้คืออะไร? (ไม่บังคับ)</Label>
          <Input
            value={hint}
            onChange={(e) => onHintChange(e.target.value)}
            placeholder="เช่น rebrand ร้านกาแฟ โทนอบอุ่น เชียงใหม่"
            maxLength={500}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">หมวดคร่าวๆ</Label>
          <Select value={category} onValueChange={onCategoryChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <Button
          onClick={onRunAi}
          disabled={!canRunAi}
          className="rounded-full gap-2"
        >
          {aiLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          ให้ AI ช่วยเติม · {ANTHEM_PORTFOLIO_FROM_IMAGES_CREDITS} เครดิต
        </Button>
        {imageCount === 1 && (
          <p className="text-xs text-muted-foreground">เพิ่มอีก 1 รูปเพื่อใช้ AI</p>
        )}
        {limitReached && (
          <p className="text-xs text-destructive">
            เครดิตหมดแล้ว —{" "}
            <a href={SO1O_PRICING_URL} target="_blank" rel="noopener noreferrer" className="underline">
              อัปเกรดที่ So1o
            </a>
          </p>
        )}
      </div>

      {aiResult && (
        <AiResultPreview
          result={aiResult}
          onApplyAll={() => onApplyAll(aiResult)}
          onApplyField={(field) => onApplyField(field, aiResult)}
          onClear={onClearResult}
          onRegenerate={onRunAi}
          regenerating={aiLoading}
        />
      )}
    </section>
  );
}

function AiResultPreview({
  result,
  onApplyAll,
  onApplyField,
  onClear,
  onRegenerate,
  regenerating,
}: {
  result: PortfolioAiAssistResult;
  onApplyAll: () => void;
  onApplyField: (field: keyof PortfolioAiAssistResult) => void;
  onClear: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const fields: { key: keyof PortfolioAiAssistResult; label: string; preview: string }[] = [
    { key: "title", label: "ชื่อผลงาน", preview: result.title },
    { key: "subtitle", label: "คำโปรย", preview: result.subtitle },
    { key: "description", label: "รายละเอียด", preview: result.description.slice(0, 120) + (result.description.length > 120 ? "…" : "") },
    { key: "category", label: "หมวด", preview: result.category },
    { key: "tags", label: "แท็ก", preview: result.tags.join(", ") },
    { key: "tools", label: "เครื่องมือ", preview: result.tools.join(", ") },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground">ผลลัพธ์จาก AI</p>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => onApplyField("image_order")}>
          ใช้ลำดับภาพ
        </Button>
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => onApplyField("cover_index")}>
          ตั้งปก (ภาพที่ {result.cover_index + 1})
        </Button>
      </div>

      <div className="space-y-2">
        {fields.map(({ key, label, preview }) => (
          <div key={key} className="flex items-start gap-2 text-sm">
            <Button size="sm" variant="ghost" className="h-7 shrink-0 text-xs text-primary" onClick={() => onApplyField(key)}>
              ใช้
            </Button>
            <div className="min-w-0 flex-1">
              <span className="text-xs text-muted-foreground">{label}: </span>
              <span className="text-foreground">{preview || "—"}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" className="rounded-full" onClick={onApplyAll}>
          ใช้ทั้งหมด
        </Button>
        <Button size="sm" variant="outline" className="rounded-full" onClick={onRegenerate} disabled={regenerating}>
          {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : "สร้างใหม่"}
        </Button>
        <Button size="sm" variant="ghost" className="rounded-full" onClick={onClear}>
          ปิด
        </Button>
      </div>
    </div>
  );
}
