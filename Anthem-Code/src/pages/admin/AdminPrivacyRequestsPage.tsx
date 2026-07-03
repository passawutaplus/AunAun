import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { type Column } from "@/components/admin/DataTable";
import StatusPill from "@/components/admin/StatusPill";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Row = {
  id: string;
  user_id: string;
  request_type: string;
  description: string | null;
  status: string;
  requested_at: string;
};

const TYPE_LABEL: Record<string, string> = {
  access: "ขอดูข้อมูล",
  export: "ส่งออกข้อมูล",
  delete: "ลบบัญชี",
  correct: "แก้ไขข้อมูล",
  object: "คัดค้าน",
  withdraw: "ถอนยินยอม",
};

const STATUS_LABEL: Record<string, string> = {
  new: "ใหม่",
  reviewing: "กำลังตรวจ",
  approved: "อนุมัติ",
  rejected: "ปฏิเสธ",
  completed: "เสร็จแล้ว",
};

export default function AdminPrivacyRequestsPage() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "privacy-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("privacy_requests" as never)
        .select("id, user_id, request_type, description, status, requested_at")
        .order("requested_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const markDone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("privacy_requests" as never)
        .update({ status: "completed", completed_at: new Date().toISOString() } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "privacy-requests"] });
      qc.invalidateQueries({ queryKey: ["admin", "compliance"] });
      toast.success("อัปเดตสถานะแล้ว");
    },
    onError: () => toast.error("อัปเดตไม่สำเร็จ"),
  });

  const columns: Column<Row>[] = [
    {
      key: "type",
      header: "ประเภท",
      cell: (r) => (
        <span className={`text-sm font-medium ${r.request_type === "delete" ? "text-admin-accent" : "text-admin-fg"}`}>
          {TYPE_LABEL[r.request_type] ?? r.request_type}
        </span>
      ),
    },
    { key: "user", header: "User ID", cell: (r) => <code className="text-[10px]">{r.user_id.slice(0, 8)}…</code> },
    {
      key: "desc",
      header: "รายละเอียด",
      cell: (r) => <span className="text-xs text-admin-muted line-clamp-2">{r.description ?? "—"}</span>,
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
          {formatDistanceToNow(new Date(r.requested_at), { addSuffix: true, locale: th })}
        </span>
      ),
    },
    {
      key: "act",
      header: "",
      cell: (r) =>
        r.status !== "completed" ? (
          <Button type="button" size="sm" variant="outline" disabled={markDone.isPending} onClick={() => markDone.mutate(r.id)}>
            เสร็จแล้ว
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <SectionHeader
        title="คำขอ PDPA"
        description="ลบบัญชี ส่งออกข้อมูล และสิทธิอื่น ๆ จากผู้ใช้"
        action={
          <Link to="/admin/compliance" className="text-xs text-admin-accent hover:underline">
            ← Compliance
          </Link>
        }
      />
      <DataTable columns={columns} rows={rows} loading={isLoading} emptyMessage="ยังไม่มีคำขอ" />
    </div>
  );
}
