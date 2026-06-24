import { useEffect, useState } from "react";
import SectionHeader from "@/components/admin/SectionHeader";
import KpiCard from "@/components/admin/KpiCard";
import DataTable, { Column } from "@/components/admin/DataTable";
import {
  sharedStorage,
  SHARED_MEDIA_BUCKET,
} from "@/integrations/supabase/sharedStorageClient";
import { HardDrive, FileImage, FolderOpen } from "lucide-react";

interface Obj { name: string; size: number; updated_at: string }

export default function AdminStoragePage() {
  const [files, setFiles] = useState<Obj[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await sharedStorage.storage
        .from(SHARED_MEDIA_BUCKET)
        .list("anthem", { limit: 100, sortBy: { column: "updated_at", order: "desc" } });
      setFiles(((data ?? []) as unknown as Obj[]));
      setLoading(false);
    })();
  }, []);

  const totalBytes = files.reduce((a, f) => a + (f.size || 0), 0);
  const mb = (totalBytes / 1024 / 1024).toFixed(2);

  const cols: Column<Obj>[] = [
    { key: "name", header: "ไฟล์", render: (r) => <span className="font-mono text-xs">{r.name}</span> },
    { key: "size", header: "ขนาด", render: (r) => <span className="font-mono text-xs">{((r.size || 0) / 1024).toFixed(1)} KB</span> },
    { key: "at", header: "อัปเดต", render: (r) => <span className="font-mono text-xs">{r.updated_at?.slice(0, 16).replace("T", " ") || "—"}</span> },
  ];

  return (
    <div>
      <SectionHeader eyebrow="storage" title="พื้นที่เก็บไฟล์" description="บัคเก็ต project-media" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <KpiCard label="Bucket" value="project-media" icon={FolderOpen} />
        <KpiCard label="Files (top 100)" value={files.length} icon={FileImage} />
        <KpiCard label="Size" value={`${mb} MB`} icon={HardDrive} accent />
      </div>
      <DataTable columns={cols} rows={files} loading={loading} rowKey={(r) => r.name} />
    </div>
  );
}
