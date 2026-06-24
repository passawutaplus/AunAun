import * as React from "react";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Copy, CheckCircle2, ImagePlus, X, LogIn } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CATEGORY_OPTIONS,
  createTicketSchema,
  type CreateTicketInput,
  type TicketCategory,
  type TicketSource,
} from "@/lib/ticketSchema";
import { useMyTickets, type SupportTicket } from "@/store/supportTickets";
import { trackFeature } from "@/lib/featureUsage";
import { getSupabaseErrorMessage, mapTicketSubmitErrorMessage } from "@/lib/supabaseError";

export type TicketPrefill = Partial<CreateTicketInput>;

export function CreateTicketForm({
  prefill,
  onCreated,
  onCancel,
  compact = false,
}: {
  prefill?: TicketPrefill;
  onCreated?: (ticket: SupportTicket) => void;
  onCancel?: () => void;
  compact?: boolean;
}) {
  const { user } = useAuth();
  const { create } = useMyTickets();
  const [title, setTitle] = React.useState(prefill?.title ?? "");
  const [description, setDescription] = React.useState(prefill?.description ?? "");
  const [category, setCategory] = React.useState<TicketCategory>(prefill?.category ?? "bug");
  const [files, setFiles] = React.useState<File[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [created, setCreated] = React.useState<SupportTicket | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const resetForm = React.useCallback(() => {
    setTitle(prefill?.title ?? "");
    setDescription(prefill?.description ?? "");
    setCategory(prefill?.category ?? "bug");
    setFiles([]);
    setSubmitting(false);
    setCreated(null);
    if (fileRef.current) fileRef.current.value = "";
  }, [prefill?.title, prefill?.description, prefill?.category]);

  React.useEffect(() => {
    resetForm();
  }, [resetForm]);

  if (!user) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="h-14 w-14 rounded-full bg-orange-50 flex items-center justify-center mb-3">
          <LogIn className="h-6 w-6 text-[#FF5F05]" />
        </div>
        <h3 className="font-semibold text-gray-900 mb-1">เข้าสู่ระบบเพื่อแจ้งปัญหา</h3>
        <p className="text-sm text-gray-500 mb-4">ระบบจะออกเลขตั๋วให้ติดตามสถานะได้</p>
        <Link to="/auth" search={{ redirect: undefined }}>
          <Button style={{ background: "#FF5F05" }} className="text-white hover:opacity-90">
            เข้าสู่ระบบ
          </Button>
        </Link>
      </div>
    );
  }

  const addFiles = (incoming: FileList | File[]) => {
    const next = [...files];
    for (const f of Array.from(incoming)) {
      if (!f.type.startsWith("image/")) {
        toast.error("รองรับเฉพาะไฟล์รูปภาพ");
        continue;
      }
      if (next.length >= 3) break;
      next.push(f);
    }
    setFiles(next.slice(0, 3));
  };

  const submit = async () => {
    const parsed = createTicketSchema.safeParse({
      title,
      description: description.trim() || undefined,
      category,
      source: (prefill?.source ?? "support_hub") as TicketSource,
      sourceFeature: prefill?.sourceFeature,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }
    setSubmitting(true);
    try {
      const ticket = await create({ ...parsed.data, files });
      void trackFeature("ticket.create");
      setCreated(ticket);
      onCreated?.(ticket);
      toast.success("สร้างตั๋วเรียบร้อย");
    } catch (e) {
      console.error("[ticket.create]", e);
      const msg = getSupabaseErrorMessage(e);
      toast.error(mapTicketSubmitErrorMessage(msg, "สร้างตั๋วไม่สำเร็จ"));
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center text-center",
          compact ? "p-4" : "p-6",
        )}
      >
        <div className="h-14 w-14 rounded-full bg-green-50 flex items-center justify-center mb-3">
          <CheckCircle2 className="h-7 w-7 text-green-600" />
        </div>
        <p className="text-sm text-gray-500">เลขตั๋วของคุณ</p>
        <p className="text-2xl font-bold text-[#FF5F05] tracking-wide mt-1">
          {created.ticketNumber}
        </p>
        <p className="text-xs text-gray-500 mt-2 max-w-[260px]">
          ติดตามสถานะได้ที่ &quot;ตั๋วของฉัน&quot; — ทีมงานจะอัปเดตเมื่อเริ่มแก้และปิดงาน
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 gap-1.5"
          onClick={() => {
            navigator.clipboard.writeText(created.ticketNumber);
            toast.success("คัดลอกเลขตั๋วแล้ว");
          }}
        >
          <Copy className="h-3.5 w-3.5" />
          คัดลอกเลขตั๋ว
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("overflow-y-auto h-full", compact ? "p-3 space-y-3" : "p-4 space-y-4")}>
      <div>
        <label className="text-xs font-medium text-gray-700">หัวข้อปัญหา *</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="เช่น กดชำระเงินแล้วระบบค้าง"
          maxLength={120}
          className="mt-1"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-700">รายละเอียด</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="อธิบายขั้นตอนที่ทำก่อนเจอปัญหา หรือสิ่งที่คาดหวัง"
          rows={compact ? 3 : 4}
          maxLength={2000}
          className="mt-1 resize-none text-sm"
        />
        <p className="text-[10px] text-gray-400 mt-0.5 text-right">{description.length}/2000</p>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-700">ประเภท</label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {CATEGORY_OPTIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                category === c.value
                  ? "border-[#FF5F05] bg-[#FF5F05]/10 text-[#FF5F05]"
                  : "border-gray-200 text-gray-600 hover:border-[#FF5F05]/40",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-700">แนบภาพหน้าจอ (สูงสุด 3)</label>
        <div
          className="mt-1.5 rounded-xl border border-dashed border-gray-200 p-3 text-center hover:border-[#FF5F05]/40 transition cursor-pointer"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
          onPaste={(e) => {
            const items = e.clipboardData?.files;
            if (items?.length) addFiles(items);
          }}
        >
          <ImagePlus className="h-5 w-5 text-gray-400 mx-auto" />
          <p className="text-[11px] text-gray-500 mt-1">คลิก ลาก หรือวาง screenshot</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {files.map((f, i) => (
              <div key={i} className="relative group">
                <img
                  src={URL.createObjectURL(f)}
                  alt=""
                  className="h-14 w-14 rounded-lg object-cover border"
                />
                <button
                  type="button"
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gray-800 text-white flex items-center justify-center"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              resetForm();
              onCancel();
            }}
          >
            ยกเลิก
          </Button>
        )}
        <Button
          className="flex-1 text-white gap-1.5"
          style={{ background: "#FF5F05" }}
          disabled={submitting || title.trim().length < 3}
          onClick={submit}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          สร้างตั๋ว
        </Button>
      </div>
    </div>
  );
}
