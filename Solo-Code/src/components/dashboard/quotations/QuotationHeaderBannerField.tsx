import * as React from "react";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/auth/AuthProvider";
import { uploadCompressedImage } from "@/lib/imageCompress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  value?: string;
  onChange: (url: string | undefined) => void;
}

export function QuotationHeaderBannerField({ value, onChange }: Props) {
  const { user } = useAuth();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);

  async function handleFile(file: File) {
    if (!user) {
      toast.error("ต้องเข้าสู่ระบบก่อน");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadCompressedImage({
        file,
        bucket: "quotation-banners",
        userId: user.id,
        prefix: "banner",
      });
      onChange(url);
      toast.success("อัปโหลดภาพหัวเอกสารแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label className="text-[11px] text-muted-foreground font-normal">
        ภาพหัวเอกสาร <span className="text-muted-foreground/70">(ไม่บังคับ)</span>
      </Label>
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-border/60 bg-muted/20">
          <img src={value} alt="Banner" className="w-full h-32 object-cover" loading="lazy" />
          <div className="absolute top-2 right-2 flex gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 text-xs shadow-sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              เปลี่ยน
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 w-7 p-0 shadow-sm"
              onClick={() => onChange(undefined)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void handleFile(file);
          }}
          className={cn(
            "w-full rounded-xl border-2 border-dashed px-4 py-8 flex flex-col items-center gap-2 transition-colors",
            dragging
              ? "border-primary bg-primary/5"
              : "border-border/60 hover:border-primary/40 hover:bg-muted/30",
          )}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground/60" />
          )}
          <span className="text-xs font-medium text-foreground">เพิ่มภาพหัวเอกสาร</span>
          <span className="text-[10px] text-muted-foreground text-center max-w-xs">
            แสดงใน preview และตอนส่งให้ลูกค้า — ลากไฟล์มาวางหรือคลิกเลือก
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
      {!value && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          เลือกรูปภาพ
        </Button>
      )}
    </div>
  );
}
