import * as React from "react";
import {
  Upload,
  X,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/auth/AuthProvider";
import { uploadBriefReference } from "./uploadReference";
import { ClientBrandAssetsField } from "./ClientBrandAssetsField";
import { aiBriefExtract } from "@/lib/aiBriefExtract.functions";
import type { AiBriefExtractResult } from "@/lib/briefExtractTypes";
import { saveBriefFromExtractResult } from "@/lib/briefFromExtractResult";
import { StructuredBriefReview } from "./StructuredBriefReview";
import {
  type DesignBrief,
  type BriefClientInfo,
  type BriefReference,
} from "@/lib/briefSchema";

type RefImage = { url: string; name: string; size: number };

export function QuickCapturePanel({
  onSaved,
  onCancel,
}: {
  onSaved: (brief: DesignBrief) => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const extractFn = useServerFn(aiBriefExtract);

  const [images, setImages] = React.useState<RefImage[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [noteText, setNoteText] = React.useState("");
  const [dragOver, setDragOver] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<AiBriefExtractResult | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [clientAssets, setClientAssets] = React.useState<BriefClientInfo>({});
  const [pastWorksBusy, setPastWorksBusy] = React.useState(false);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const pastWorksInput = React.useRef<HTMLInputElement>(null);

  const updateAssets = (patch: Partial<BriefClientInfo>) =>
    setClientAssets((prev) => ({ ...prev, ...patch }));

  const addPastWorks = async (files: FileList | File[]) => {
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบก่อนอัปโหลด");
      return;
    }
    const existing = clientAssets.past_works ?? [];
    const arr = Array.from(files).slice(0, 8 - existing.length);
    if (arr.length === 0) {
      toast.error("อัปโหลดได้สูงสุด 8 รูป");
      return;
    }
    setPastWorksBusy(true);
    try {
      const uploaded: BriefReference[] = [];
      for (const f of arr) {
        try {
          const r = await uploadBriefReference({ file: f, userId: user.id });
          uploaded.push(r);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : `อัปโหลด ${f.name} ไม่สำเร็จ`);
        }
      }
      if (uploaded.length) {
        updateAssets({ past_works: [...existing, ...uploaded] });
        toast.success(`เพิ่มผลงานเก่าลูกค้า ${uploaded.length} รูป`);
      }
    } finally {
      setPastWorksBusy(false);
    }
  };

  const removePastWork = (url: string) =>
    updateAssets({ past_works: (clientAssets.past_works ?? []).filter((x) => x.url !== url) });

  const addFiles = async (files: FileList | File[]) => {
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบก่อนอัปโหลด");
      return;
    }
    const arr = Array.from(files).slice(0, 8 - images.length);
    if (arr.length === 0) {
      toast.error("อัปโหลดได้สูงสุด 8 รูป");
      return;
    }
    setUploading(true);
    try {
      const uploaded: RefImage[] = [];
      for (const f of arr) {
        try {
          const r = await uploadBriefReference({ file: f, userId: user.id });
          uploaded.push(r);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : `อัปโหลด ${f.name} ไม่สำเร็จ`);
        }
      }
      if (uploaded.length) {
        setImages((prev) => [...prev, ...uploaded]);
        toast.success(`เพิ่มรูป ${uploaded.length} รูป`);
      }
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (url: string) => setImages((prev) => prev.filter((x) => x.url !== url));

  const extract = async () => {
    if (images.length === 0 && !noteText.trim()) {
      toast.error("โยนรูป หรือพิมพ์ข้อความก่อนนะครับ");
      return;
    }
    setBusy(true);
    try {
      const r = await extractFn({
        data: {
          imageUrls: images.map((i) => i.url),
          noteText: noteText.trim(),
        },
      });
      setResult(r);
      toast.success("AI สรุปบรีฟแล้ว — ตรวจสอบและแก้ไขได้");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("limit_reached")) {
        toast.error("เครดิต AI หมดแล้ว — เติมเครดิตหรืออัพเกรด Pro");
      } else {
        toast.error(msg || "วิเคราะห์ไม่สำเร็จ");
      }
    } finally {
      setBusy(false);
    }
  };

  const updateResult = <K extends keyof AiBriefExtractResult>(
    key: K,
    val: AiBriefExtractResult[K],
  ) => {
    setResult((prev) => (prev ? { ...prev, [key]: val } : prev));
  };

  const saveAsBrief = async () => {
    if (!user || !result) return;
    setSaving(true);
    try {
      const brief = await saveBriefFromExtractResult({
        userId: user.id,
        result,
        noteText,
        images,
        clientAssets,
      });
      toast.success("บันทึกบรีฟแล้ว — เปิดในตัวแก้ไขให้แล้ว");
      onSaved(brief);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="space-y-0.5">
        <h1 className="text-2xl font-semibold tracking-tight">Smart Brief</h1>
        <p className="text-xs text-muted-foreground">บรีฟลูกค้าและสรุปสโคป</p>
      </div>

      {/* Quick Capture chip row + cancel */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-primary/15 text-primary p-2">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold">Smart Brief — Quick Capture</h2>
            <p className="text-[11px] text-muted-foreground">
              โยนแคปแชท + พิมพ์โน๊ตสด → AI สรุปบรีฟให้เป็น 10 หมวด
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          ยกเลิก
        </Button>
      </div>

      {/* Reference label */}
      <div className="flex items-center gap-1.5">
        <span className="rounded-md bg-primary/15 text-primary p-1">
          <ImageIcon className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="text-xs font-semibold">Reference จากลูกค้า</p>
          <p className="text-[10px] text-muted-foreground">
            แคปแชท Line/Messenger, รูปเรฟ, mood ที่ลูกค้าส่งมาให้ดู
          </p>
        </div>
      </div>

      {/* Hero dropzone — orange border + soft outer glow */}
      <div className="relative">
        {/* outer glow halo */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-3 rounded-[28px] blur-2xl opacity-60"
          style={{
            background:
              "radial-gradient(closest-side, hsl(var(--primary) / 0.35), transparent 70%)",
          }}
        />
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInput.current?.click()}
          className={`relative cursor-pointer rounded-2xl border-2 p-8 sm:p-10 text-center transition ${
            dragOver
              ? "border-primary bg-primary/10"
              : "border-primary/70 bg-primary/[0.05] hover:bg-primary/[0.08]"
          }`}
          style={{
            boxShadow:
              "0 0 0 1px hsl(var(--primary) / 0.15), 0 14px 50px -12px hsl(var(--primary) / 0.45)",
          }}
        >
          <div className="mx-auto h-11 w-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-3">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
          </div>
          <p className="text-base font-semibold">อัปโหลด บรีฟ</p>
          <p className="text-sm text-muted-foreground mt-1">So1o ช่วยสรุปบรีฟให้เข้าใจง่ายขึ้น</p>
          <p className="text-[11px] text-muted-foreground/80 mt-3">
            หน้าจอแชท / ข้อความที่คุยกับลูกค้า / Refference ลูกค้า
          </p>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>
      </div>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {images.map((img) => (
            <span
              key={img.url}
              className="inline-flex items-center gap-1 rounded-full bg-muted/60 border border-border px-2 py-1 text-[11px]"
            >
              <img src={img.url} alt="" className="h-4 w-4 rounded object-cover" loading="lazy" />
              <span className="max-w-[140px] truncate">{img.name}</span>
              <button
                onClick={() => removeImage(img.url)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Text บรีฟเพิ่มเติม */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">Text บรีฟเพิ่มเติม</label>
        <Textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={6}
          placeholder="วางข้อความจากแชท หรือพิมพ์โน๊ตสดๆ ได้เลย..."
          className="bg-muted/30"
        />
      </div>

      {/* Client Brand Assets card */}
      <div className="space-y-3 rounded-2xl border border-border bg-card/50 p-4">
        <div className="flex items-center gap-1.5">
          <span className="rounded-md bg-primary/15 text-primary p-1">
            <Palette className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-xs font-semibold">Client Brand Assets — ของลูกค้าเอง</p>
            <p className="text-[10px] text-muted-foreground">
              โลโก้, รูป CI/แบรนด์, และผลงานเก่าที่ลูกค้าเคยทำ (เพื่อคุม CI)
            </p>
          </div>
        </div>

        <ClientBrandAssetsField value={clientAssets} onChange={updateAssets} userId={user?.id} />

        {/* Past works */}
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <span className="text-primary">
                  <ImageIcon className="h-3.5 w-3.5" />
                </span>
                ผลงานเก่าของลูกค้า
              </p>
              <p className="text-[10px] text-muted-foreground">
                โพสต์เก่า, โบรชัวร์, กราฟิกที่เคยทำ — สูงสุด 8 รูป
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 rounded-lg gap-1"
              disabled={pastWorksBusy || (clientAssets.past_works?.length ?? 0) >= 8}
              onClick={() => pastWorksInput.current?.click()}
            >
              {pastWorksBusy ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              เพิ่มรูป
            </Button>
            <input
              ref={pastWorksInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files?.length) addPastWorks(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
          {(clientAssets.past_works?.length ?? 0) > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {clientAssets.past_works!.map((pw) => (
                <div
                  key={pw.url}
                  className="relative group rounded-lg border border-border overflow-hidden bg-background"
                >
                  <img
                    src={pw.url}
                    alt={pw.name ?? ""}
                    className="w-full h-16 object-cover"
                    loading="lazy"
                  />
                  <button
                    type="button"
                    onClick={() => removePastWork(pw.url)}
                    className="absolute top-0.5 right-0.5 rounded-full bg-background/80 backdrop-blur p-0.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition"
                    title="ลบ"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground italic">ยังไม่ได้อัปโหลด</p>
          )}
        </div>
      </div>

      {/* CTA: วิเคราะห์บรีฟกัน */}
      <Button
        onClick={extract}
        disabled={busy || (images.length === 0 && !noteText.trim())}
        className="w-full h-12 rounded-2xl gap-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/40 transition"
        style={{
          background: "linear-gradient(135deg, #FF5F05 0%, #FF9F67 100%)",
        }}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {busy ? "AI กำลังวิเคราะห์…" : "วิเคราะห์บรีฟกัน"}
      </Button>

      {/* Section 3: Structured brief */}
      {result && (
        <StructuredBriefReview
          result={result}
          onChange={updateResult}
          onSave={() => void saveAsBrief()}
          saving={saving}
          saveLabel="บันทึกเป็นบรีฟ (เปิดในตัวแก้ไขเพื่อทำ PDF)"
        />
      )}
    </div>
  );
}

