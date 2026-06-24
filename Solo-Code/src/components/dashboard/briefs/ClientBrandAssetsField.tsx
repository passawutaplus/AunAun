import * as React from "react";
import { Upload, X, Loader2, Palette, Image as ImageIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { uploadBriefReference } from "./uploadReference";
import { extractPaletteFromImage } from "@/lib/extractPalette";
import { normalizeHex } from "@/lib/colorUtils";
import type { BriefClientInfo } from "@/lib/briefSchema";

interface Props {
  value: BriefClientInfo;
  onChange: (patch: Partial<BriefClientInfo>) => void;
  /** Merge extracted palette into the design_direction.liked_color_chips */
  onMergePalette?: (hexes: string[]) => void;
  userId?: string | null;
  disabled?: boolean;
}

/**
 * Two-slot uploader for the client's existing brand assets:
 *  - Logo  → stored in `client_info.logo_url`
 *  - CI image (brand photo / mockup / existing artwork) → `client_info.ci_image_url`
 *    + auto-extracts a 6-color palette → `client_info.ci_palette`
 */
export function ClientBrandAssetsField({
  value,
  onChange,
  onMergePalette,
  userId,
  disabled,
}: Props) {
  const [logoBusy, setLogoBusy] = React.useState(false);
  const [ciBusy, setCiBusy] = React.useState(false);

  const handleLogo = async (file: File) => {
    if (!userId) {
      toast.error("กรุณาเข้าสู่ระบบ");
      return;
    }
    setLogoBusy(true);
    try {
      const r = await uploadBriefReference({ file, userId });
      onChange({ logo_url: r.url });
      toast.success("อัปโหลดโลโก้แล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setLogoBusy(false);
    }
  };

  const handleCi = async (file: File) => {
    if (!userId) {
      toast.error("กรุณาเข้าสู่ระบบ");
      return;
    }
    setCiBusy(true);
    try {
      const [r, palette] = await Promise.all([
        uploadBriefReference({ file, userId }),
        extractPaletteFromImage(file, 6).catch(() => [] as string[]),
      ]);
      const cleanPalette = palette.map((c) => normalizeHex(c)).filter((c): c is string => !!c);
      onChange({ ci_image_url: r.url, ci_palette: cleanPalette });
      toast.success(
        cleanPalette.length
          ? `อัปโหลดรูป CI + ดึงสีออกมาได้ ${cleanPalette.length} สี`
          : "อัปโหลดรูป CI แล้ว",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setCiBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <UploadSlot
          label="โลโก้ลูกค้า"
          hint="ใช้อ้างอิงตอนออกแบบ + ใส่ในหน้าปก PDF"
          icon={<ImageIcon className="h-4 w-4" />}
          busy={logoBusy}
          disabled={disabled}
          previewUrl={value.logo_url}
          onFile={handleLogo}
          onRemove={() => onChange({ logo_url: undefined })}
        />
        <UploadSlot
          label="รูป CI / ภาพแบรนด์ลูกค้า"
          hint="อัปแล้ว AI จะดึงสีหลักออกมาให้อัตโนมัติ"
          icon={<Palette className="h-4 w-4" />}
          busy={ciBusy}
          disabled={disabled}
          previewUrl={value.ci_image_url}
          onFile={handleCi}
          onRemove={() => onChange({ ci_image_url: undefined, ci_palette: [] })}
        />
      </div>

      {value.ci_palette && value.ci_palette.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-medium flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-primary" />
              พาเลตต์สีหลักจากรูป CI
            </p>
            {onMergePalette && !disabled && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 rounded-lg gap-1"
                onClick={() => {
                  onMergePalette(value.ci_palette ?? []);
                  toast.success("เพิ่มสีพาเลตต์เข้า 🎨 สีที่ชอบ แล้ว");
                }}
              >
                <Sparkles className="h-3 w-3" />
                ใส่เข้า "สีที่ชอบ"
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {value.ci_palette.map((hex, i) => (
              <div
                key={`${hex}-${i}`}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card p-1.5 pr-2 text-[11px]"
              >
                <span
                  className="h-6 w-6 rounded border border-border"
                  style={{ background: hex }}
                />
                <code className="font-mono">{hex.toUpperCase()}</code>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            พาเลตต์นี้จะถูกฝังในหน้า "Brand CI Reference" ของ PDF เพื่อเป็นเข็มทิศกันงานหลุด CI
            ของลูกค้า
          </p>
        </div>
      )}
    </div>
  );
}

function UploadSlot({
  label,
  hint,
  icon,
  busy,
  disabled,
  previewUrl,
  onFile,
  onRemove,
}: {
  label: string;
  hint: string;
  icon: React.ReactNode;
  busy: boolean;
  disabled?: boolean;
  previewUrl?: string;
  onFile: (f: File) => void;
  onRemove: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold flex items-center gap-1.5 truncate">
            <span className="text-primary">{icon}</span> {label}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">{hint}</p>
        </div>
        {previewUrl && !disabled && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            title="ลบ"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {previewUrl ? (
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          className="block w-full rounded-lg border border-border bg-background overflow-hidden hover:opacity-90 transition disabled:cursor-not-allowed"
          title="คลิกเพื่อเปลี่ยนรูป"
        >
          <img src={previewUrl} alt={label} className="w-full h-32 object-contain bg-white" />
        </button>
      ) : (
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center w-full h-32 rounded-lg border border-dashed border-primary/30 bg-primary/[0.04] hover:bg-primary/[0.08] transition text-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          <span className="text-[11px] mt-1">{busy ? "กำลังอัปโหลด…" : "เลือกไฟล์"}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        disabled={disabled || busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
