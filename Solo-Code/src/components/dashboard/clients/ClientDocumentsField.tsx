import * as React from "react";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { assertFileSignature, type AllowedKind } from "@/lib/fileSignature";
import type { ClientFile } from "@/store/clients";
import {
  type ClientDocCategory,
  CLIENT_DOC_CATEGORIES,
  clientDocCategoriesForType,
} from "./shared";

export type StagedClientFile = { file: File; docCategory: ClientDocCategory };

interface Props {
  clientType: "individual" | "company" | undefined;
  isEditing: boolean;
  files: ClientFile[];
  stagedFiles: StagedClientFile[];
  onStagedChange: (files: StagedClientFile[]) => void;
  onUpload?: (file: File, docCategory: ClientDocCategory) => Promise<void>;
  onDeleteFile?: (f: ClientFile) => Promise<void>;
  getSignedUrl: (path: string) => Promise<string>;
}

export function ClientDocumentsField({
  clientType,
  isEditing,
  files,
  stagedFiles,
  onStagedChange,
  onUpload,
  onDeleteFile,
  getSignedUrl,
}: Props) {
  const [dragging, setDragging] = React.useState(false);
  const [pendingCategory, setPendingCategory] = React.useState<ClientDocCategory>("other");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const categories = clientDocCategoriesForType(clientType);

  React.useEffect(() => {
    if (!categories.includes(pendingCategory)) {
      setPendingCategory(categories[0] ?? "other");
    }
  }, [categories, pendingCategory]);

  const validateAndAddFile = async (f: File) => {
    if (f.size > 5 * 1024 * 1024) {
      toast.error("ไฟล์ใหญ่เกิน 5MB");
      return;
    }
    try {
      await assertFileSignature(f, ["jpeg", "png", "webp", "pdf"] as readonly AllowedKind[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ไฟล์ไม่ผ่านการตรวจสอบ");
      return;
    }
    if (isEditing && onUpload) {
      try {
        await onUpload(f, pendingCategory);
        toast.success("อัปโหลดสำเร็จ");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
      }
    } else {
      onStagedChange([...stagedFiles, { file: f, docCategory: pendingCategory }]);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    for (const f of Array.from(e.dataTransfer.files)) {
      await validateAndAddFile(f);
    }
  };

  return (
    <div className="rounded-xl border border-border/60 p-3.5 space-y-2.5">
      <div className="flex items-center gap-1.5">
        <FileText className="h-3.5 w-3.5 text-primary" />
        <h4 className="text-xs font-semibold">เอกสารแนบ (PDF / รูป)</h4>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => {
          const active = pendingCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setPendingCategory(cat)}
              className={cn(
                "text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-card hover:border-primary/50",
              )}
            >
              {CLIENT_DOC_CATEGORIES[cat].label}
            </button>
          );
        })}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition-all",
          dragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border/60 bg-muted/20 hover:border-primary/50 hover:bg-primary/5",
        )}
      >
        <Upload
          className={cn(
            "h-6 w-6 mx-auto mb-1.5",
            dragging ? "text-primary" : "text-muted-foreground",
          )}
        />
        <p className="text-xs font-medium">
          ลากไฟล์มาวาง หรือ <span className="text-primary">คลิกเพื่อเลือก</span>
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          ประเภท: {CLIENT_DOC_CATEGORIES[pendingCategory].label} · PDF / รูป · ไม่เกิน 5MB
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,image/*"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) await validateAndAddFile(f);
          e.target.value = "";
        }}
      />

      {(isEditing ? files.length > 0 : stagedFiles.length > 0) && (
        <div className="space-y-1.5">
          {isEditing &&
            files.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-2.5 py-1.5"
              >
                <button
                  type="button"
                  onClick={async () => window.open(await getSignedUrl(f.storagePath), "_blank")}
                  className="flex items-center gap-1.5 text-xs hover:text-primary truncate flex-1 text-left"
                >
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate">{f.fileName}</span>
                  <span className="text-muted-foreground text-[10px] shrink-0">
                    {CLIENT_DOC_CATEGORIES[f.docCategory]?.label ?? "อื่นๆ"}
                  </span>
                  {f.sizeBytes != null && (
                    <span className="text-muted-foreground text-[10px]">
                      ({Math.ceil(f.sizeBytes / 1024)} KB)
                    </span>
                  )}
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={async () => window.open(await getSignedUrl(f.storagePath), "_blank")}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                {onDeleteFile && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive"
                    onClick={async () => {
                      await onDeleteFile(f);
                      toast.success("ลบไฟล์แล้ว");
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          {!isEditing &&
            stagedFiles.map((sf, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-2.5 py-1.5"
              >
                <span className="flex items-center gap-1.5 text-xs truncate flex-1">
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate">{sf.file.name}</span>
                  <span className="text-muted-foreground text-[10px] shrink-0">
                    {CLIENT_DOC_CATEGORIES[sf.docCategory].label}
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    ({Math.ceil(sf.file.size / 1024)} KB)
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-destructive"
                  onClick={() => onStagedChange(stagedFiles.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
        </div>
      )}

      {!isEditing && stagedFiles.length > 0 && (
        <p className="text-[10px] text-muted-foreground italic">ไฟล์จะถูกอัปโหลดเมื่อกดบันทึก</p>
      )}
    </div>
  );
}
