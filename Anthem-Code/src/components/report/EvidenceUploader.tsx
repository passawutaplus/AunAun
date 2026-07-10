import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, FileImage, FileVideo } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { EvidenceFile } from "@/hooks/useReports";
import {
  encodeReportEvidenceRef,
  signedReportEvidenceUrl,
  deleteReportEvidenceRef,
} from "@/lib/reportEvidenceStorage";

const MAX_FILES = 5;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

interface Props {
  value: EvidenceFile[];
  onChange: (files: EvidenceFile[]) => void;
}

function EvidencePreview({ file }: { file: EvidenceFile }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    file.url.startsWith("http") ? file.url : null,
  );

  useEffect(() => {
    if (file.url.startsWith("http")) {
      setPreviewUrl(file.url);
      return;
    }
    let cancelled = false;
    void signedReportEvidenceUrl(file.url).then((url) => {
      if (!cancelled) setPreviewUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [file.url]);

  if (file.type.startsWith("image/") && previewUrl) {
    return <img src={previewUrl} alt={file.name} className="w-full h-full object-cover" />;
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-1">
      {file.type.startsWith("video/") ? <FileVideo className="w-6 h-6" /> : <FileImage className="w-6 h-6" />}
      <span className="text-[9px] line-clamp-1 mt-1">{file.name}</span>
    </div>
  );
}

const EvidenceUploader = ({ value, onChange }: Props) => {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handlePick = async (files: FileList | null) => {
    if (!files || !user) return;
    if (value.length + files.length > MAX_FILES) {
      toast.warning(`แนบได้สูงสุด ${MAX_FILES} ไฟล์`);
      return;
    }
    setUploading(true);
    const uploaded: EvidenceFile[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_SIZE) {
        toast.warning(`${file.name} เกิน 10MB`);
        continue;
      }
      if (!/^(image|video)\//.test(file.type)) {
        toast.warning(`${file.name} ไม่ใช่รูปหรือวิดีโอ`);
        continue;
      }
      const safeName = file.name.replace(/[^\w.\-]/g, "_");
      const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase.storage
        .from("report-evidence")
        .upload(path, file, { cacheControl: "3600" });
      if (error) {
        toast.error(`อัปโหลด ${file.name} ไม่สำเร็จ`);
        continue;
      }
      uploaded.push({
        url: encodeReportEvidenceRef(path),
        type: file.type,
        name: file.name,
        size: file.size,
      });
    }
    onChange([...value, ...uploaded]);
    setUploading(false);
  };

  const removeAt = async (i: number) => {
    const removed = value[i];
    if (removed && !removed.url.startsWith("http")) {
      await deleteReportEvidenceRef(removed.url);
    }
    onChange(value.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => handlePick(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || value.length >= MAX_FILES}
        className="w-full"
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
        ) : (
          <Upload className="w-4 h-4 mr-1.5" />
        )}
        แนบไฟล์หลักฐาน ({value.length}/{MAX_FILES})
      </Button>
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {value.map((f, i) => (
            <div key={`${f.url}-${i}`} className="relative group rounded-md overflow-hidden border border-border bg-muted aspect-square">
              <EvidencePreview file={f} />
              <button
                type="button"
                onClick={() => void removeAt(i)}
                className="absolute top-1 right-1 bg-background/80 backdrop-blur-sm rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="ลบไฟล์"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">
        รองรับรูปและวิดีโอ ≤10MB/ไฟล์ สูงสุด {MAX_FILES} ไฟล์
      </p>
    </div>
  );
};

export default EvidenceUploader;
