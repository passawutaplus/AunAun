import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { Column } from "@/components/admin/DataTable";
import StatusPill from "@/components/admin/StatusPill";
import { SearchBar, useSearch } from "@/components/admin/SearchBar";
import AdminExportButton from "@/components/admin/AdminExportButton";
import { useAdminList } from "@/hooks/admin/useAdminList";
import { formatThaiDate } from "@/lib/format";

interface Row {
  id: string;
  kind: string;
  project_title: string;
  client_id: string;
  freelancer_id: string;
  created_at: string;
  last_message_at: string;
}

export default function AdminChatsPage() {
  const { data, isLoading } = useAdminList<Row>("conversations", "*", "last_message_at");
  const { q, setQ, filtered } = useSearch(data, ["project_title", "kind"]);

  const cols: Column<Row>[] = [
    { key: "kind", header: "ประเภท", render: (r) => <StatusPill status={r.kind} tone={r.kind === "hire" ? "accent" : "muted"} /> },
    { key: "title", header: "หัวข้อ", render: (r) => <span className="font-medium">{r.project_title || "—"}</span> },
    {
      key: "client",
      header: "Client",
      render: (r) => (
        <a href={`/u/${r.client_id}`} className="font-mono text-xs text-admin-accent hover:underline">
          {r.client_id.slice(0, 8)}…
        </a>
      ),
    },
    {
      key: "free",
      header: "Freelancer",
      render: (r) => (
        <a href={`/u/${r.freelancer_id}`} className="font-mono text-xs text-admin-accent hover:underline">
          {r.freelancer_id.slice(0, 8)}…
        </a>
      ),
    },
    { key: "last", header: "ล่าสุด", render: (r) => <span className="font-mono text-xs">{formatThaiDate(r.last_message_at)}</span> },
    { key: "created", header: "เริ่ม", render: (r) => <span className="font-mono text-xs">{formatThaiDate(r.created_at)}</span> },
  ];

  return (
    <div>
      <SectionHeader
        eyebrow="chats"
        title="ห้องสนทนา"
        description={`${data?.length ?? 0} ห้อง`}
        actions={
          <div className="flex items-center gap-2">
            <AdminExportButton rows={(filtered ?? []) as unknown as Record<string, unknown>[]} filename="admin-chats.csv" />
            <SearchBar value={q} onChange={setQ} />
          </div>
        }
      />
      <DataTable columns={cols} rows={filtered} loading={isLoading} rowKey={(r) => r.id} />
    </div>
  );
}
