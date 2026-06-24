import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { Column } from "@/components/admin/DataTable";
import StatusPill from "@/components/admin/StatusPill";
import { SearchBar, useSearch } from "@/components/admin/SearchBar";
import AdminExportButton from "@/components/admin/AdminExportButton";
import { useAdminList } from "@/hooks/admin/useAdminList";
import { formatThaiDate } from "@/lib/format";

interface Row {
  id: string;
  client_name: string;
  project_title: string;
  email: string;
  status: string;
  budget: string | null;
  budget_amount: number | null;
  created_at: string;
}

export default function AdminHiringPage() {
  const { data, isLoading } = useAdminList<Row>("hiring_requests");
  const { q, setQ, filtered } = useSearch(data, ["client_name", "project_title", "email", "status"]);

  const cols: Column<Row>[] = [
    {
      key: "client",
      header: "ลูกค้า",
      render: (r) => (
        <div>
          <p className="font-medium">{r.client_name}</p>
          <p className="text-xs text-admin-muted font-mono">{r.email}</p>
        </div>
      ),
    },
    { key: "project", header: "งาน", render: (r) => <span>{r.project_title}</span> },
    {
      key: "budget",
      header: "งบ",
      render: (r) => <span className="font-mono text-xs">{r.budget || (r.budget_amount ? r.budget_amount.toLocaleString() : "—")}</span>,
    },
    { key: "status", header: "สถานะ", render: (r) => <StatusPill status={r.status} tone={r.status === "ใหม่" ? "accent" : "muted"} /> },
    { key: "created", header: "ส่งเมื่อ", render: (r) => <span className="font-mono text-xs">{formatThaiDate(r.created_at)}</span> },
  ];

  return (
    <div>
      <SectionHeader
        eyebrow="hiring"
        title="คำขอจ้างงาน"
        description={`${data?.length ?? 0} คำขอ`}
        actions={
          <div className="flex items-center gap-2">
            <AdminExportButton rows={(filtered ?? []) as unknown as Record<string, unknown>[]} filename="admin-hiring.csv" />
            <SearchBar value={q} onChange={setQ} />
          </div>
        }
      />
      <DataTable columns={cols} rows={filtered} loading={isLoading} rowKey={(r) => r.id} />
    </div>
  );
}
