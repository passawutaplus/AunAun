import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { Column } from "@/components/admin/DataTable";
import StatusPill from "@/components/admin/StatusPill";
import { SearchBar, useSearch } from "@/components/admin/SearchBar";
import AdminExportButton from "@/components/admin/AdminExportButton";
import { useAdminList } from "@/hooks/admin/useAdminList";

interface Row {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  created_at: string;
}

export default function AdminAuditPage() {
  const { data, isLoading } = useAdminList<Row>("admin_audit_log");
  const { q, setQ, filtered } = useSearch(data, ["action", "target_type"]);

  const cols: Column<Row>[] = [
    { key: "at", header: "เวลา", render: (r) => <span className="font-mono text-xs">{r.created_at.slice(0, 19).replace("T", " ")}</span> },
    {
      key: "actor",
      header: "Actor",
      render: (r) => (
        <a href={`/u/${r.actor_id}`} className="font-mono text-xs text-admin-accent hover:underline">
          {r.actor_id.slice(0, 8)}…
        </a>
      ),
    },
    { key: "action", header: "Action", render: (r) => <StatusPill status={r.action} tone="accent" /> },
    { key: "target", header: "Target", render: (r) => <span className="font-mono text-xs">{r.target_type}/{r.target_id.slice(0, 8)}…</span> },
  ];

  return (
    <div>
      <SectionHeader
        eyebrow="audit"
        title="บันทึกการใช้งาน"
        description="ทุกการกระทำของแอดมินจะถูกบันทึก"
        actions={
          <div className="flex items-center gap-2">
            <AdminExportButton rows={(filtered ?? []) as unknown as Record<string, unknown>[]} filename="admin-audit.csv" />
            <SearchBar value={q} onChange={setQ} placeholder="ค้น action / target" />
          </div>
        }
      />
      <DataTable columns={cols} rows={filtered} loading={isLoading} rowKey={(r) => r.id} empty="ยังไม่มีบันทึก" />
    </div>
  );
}
