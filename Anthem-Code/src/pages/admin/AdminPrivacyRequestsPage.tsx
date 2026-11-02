import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { type Column } from "@/components/admin/DataTable";
import StatusPill from "@/components/admin/StatusPill";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { useApproveAccountDeletion } from "@/hooks/useLegalCompliance";
import { toast } from "sonner";

type Row = {
  id: string;
  user_id: string;
  request_type: string;
  description: string | null;
  status: string;
  requested_at: string;
  scheduled_purge_at: string | null;
  admin_note: string | null;
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
  cancelled: "ผู้ใช้ยกเลิก",
};

export default function AdminPrivacyRequestsPage() {
  const qc = useQueryClient();
  const approveDeletion = useApproveAccountDeletion();
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "privacy-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("privacy_requests" as never)
        .select("id, user_id, request_type, description, status, requested_at, scheduled_purge_at, admin_note")
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
      render: (r) => (
        <span className={`text-sm font-medium ${r.request_type === "delete" ? "text-admin-accent" : "text-admin-fg"}`}>
          {TYPE_LABEL[r.request_type] ?? r.request_type}
        </span>
      ),
    },
    { key: "user", header: "User ID", render: (r) => <code className="text-[10px]">{r.user_id.slice(0, 8)}…</code> },
    {
      key: "desc",
      header: "รายละเอียด",
      render: (r) => (
        <div className="space-y-1">
          <span className="text-xs text-admin-muted line-clamp-2">{r.description ?? "—"}</span>
          {r.admin_note ? <span className="block text-[11px] text-admin-accent">{r.admin_note}</span> : null}
        </div>
      ),
    },
    {
      key: "status",
      header: "สถานะ",
      render: (r) =>
        r.request_type === "delete" && r.status === "approved" && r.scheduled_purge_at ? (
          <StatusPill status={`ลบ ${format(new Date(r.scheduled_purge_at), "d MMM yyyy", { locale: th })}`} tone="accent" />
        ) : (
          <StatusPill status={STATUS_LABEL[r.status] ?? r.status} />
        ),
    },
    {
      key: "when",
      header: "เมื่อ",
      render: (r) => (
        <span className="text-xs text-admin-muted">
          {formatDistanceToNow(new Date(r.requested_at), { addSuffix: true, locale: th })}
        </span>
      ),
    },
    {
      key: "act",
      header: "",
      render: (r) => {
        // Deletion finishes through the scheduled purge, never by hand.
        if (r.request_type === "delete") {
          return ["new", "reviewing"].includes(r.status) ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={approveDeletion.isPending}
              onClick={() => setConfirmDelete(r)}
            >
              อนุมัติลบ
            </Button>
          ) : null;
        }
        return !["completed", "cancelled"].includes(r.status) ? (
          <Button type="button" size="sm" variant="outline" disabled={markDone.isPending} onClick={() => markDone.mutate(r.id)}>
            เสร็จแล้ว
          </Button>
        ) : null;
      },
    },
  ];

  return (
    <div>
      <SectionHeader
        title="คำขอ PDPA"
        description="ลบบัญชี ส่งออกข้อมูล และสิทธิอื่น ๆ จากผู้ใช้"
        actions={
          <Link to="/admin/compliance" className="text-xs text-admin-accent hover:underline">
            ← Compliance
          </Link>
        }
      />
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} loading={isLoading} empty="ยังไม่มีคำขอ" />
      <DeleteConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="อนุมัติลบบัญชี?"
        description={
          <>
            โปรไฟล์และผลงานของ <code>{confirmDelete?.user_id.slice(0, 8)}…</code> จะถูกซ่อนทันที และลบถาวรอัตโนมัติใน 30 วัน
            ผู้ใช้ยกเลิกเองได้ก่อนถึงวันนั้น แชตที่ส่งถึงคนอื่นยังอยู่แต่ไม่แสดงชื่อ บันทึกการเงินและภาษีเก็บไว้ตามกฎหมาย
          </>
        }
        confirmLabel="อนุมัติลบ"
        loading={approveDeletion.isPending}
        onConfirm={async () => {
          if (!confirmDelete) return;
          await approveDeletion.mutateAsync(confirmDelete.id).catch(() => undefined);
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}
