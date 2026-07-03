import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { type Column } from "@/components/admin/DataTable";
import StatusPill from "@/components/admin/StatusPill";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string;
  claimant_name: string;
  claimant_email: string;
  infringing_url: string;
  status: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  new: "ใหม่",
  reviewing: "กำลังตรวจ",
  hidden: "ซ่อนแล้ว",
  rejected: "ปฏิเสธ",
  resolved: "เสร็จแล้ว",
};

export default function AdminCopyrightReportsPage() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "copyright-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("copyright_reports" as never)
        .select("id, claimant_name, claimant_email, infringing_url, status, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const columns: Column<Row>[] = [
    {
      key: "claimant",
      header: "ผู้แจ้ง",
      cell: (r) => (
        <div>
          <p className="font-medium text-admin-fg">{r.claimant_name}</p>
          <p className="text-[11px] text-admin-muted">{r.claimant_email}</p>
        </div>
      ),
    },
    {
      key: "url",
      header: "ลิงก์ที่แจ้ง",
      cell: (r) => (
        <a href={r.infringing_url} target="_blank" rel="noopener noreferrer" className="text-xs text-admin-accent hover:underline truncate block max-w-[200px]">
          {r.infringing_url}
        </a>
      ),
    },
    {
      key: "status",
      header: "สถานะ",
      cell: (r) => <StatusPill status={r.status} label={STATUS_LABEL[r.status] ?? r.status} />,
    },
    {
      key: "when",
      header: "เมื่อ",
      cell: (r) => (
        <span className="text-xs text-admin-muted">
          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: th })}
        </span>
      ),
    },
  ];

  return (
    <div>
      <SectionHeader
        title="คำร้องลิขสิทธิ์"
        description="Notice & takedown — ตรวจจาก /legal/copyright-report"
        action={
          <Link to="/admin/compliance" className="text-xs text-admin-accent hover:underline">
            ← Compliance
          </Link>
        }
      />
      <DataTable columns={columns} rows={rows} loading={isLoading} emptyMessage="ยังไม่มีคำร้อง" />
    </div>
  );
}
