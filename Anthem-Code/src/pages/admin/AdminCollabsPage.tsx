import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { Column } from "@/components/admin/DataTable";
import StatusPill from "@/components/admin/StatusPill";
import { SearchBar, useSearch } from "@/components/admin/SearchBar";
import AdminExportButton from "@/components/admin/AdminExportButton";
import { useAdminList } from "@/hooks/admin/useAdminList";
import { formatThaiDate } from "@/lib/format";

interface Row {
  id: string;
  sender_id: string;
  recipient_id: string;
  collab_types: string[];
  message: string;
  status: string;
  timeline: string | null;
  created_at: string;
}

export default function AdminCollabsPage() {
  const { data, isLoading } = useAdminList<Row>("collab_requests");
  const { q, setQ, filtered } = useSearch(data, ["message", "status"]);

  const cols: Column<Row>[] = [
    {
      key: "from",
      header: "ผู้ส่ง",
      render: (r) => (
        <a href={`/u/${r.sender_id}`} className="font-mono text-xs text-admin-accent hover:underline">
          {r.sender_id.slice(0, 8)}…
        </a>
      ),
    },
    {
      key: "to",
      header: "ผู้รับ",
      render: (r) => (
        <a href={`/u/${r.recipient_id}`} className="font-mono text-xs text-admin-accent hover:underline">
          {r.recipient_id.slice(0, 8)}…
        </a>
      ),
    },
    {
      key: "types",
      header: "ประเภท",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.collab_types.slice(0, 3).map((t) => (
            <StatusPill key={t} status={t} tone="muted" />
          ))}
        </div>
      ),
    },
    { key: "msg", header: "ข้อความ", render: (r) => <span className="text-xs text-admin-muted truncate block max-w-sm">{r.message}</span> },
    { key: "status", header: "สถานะ", render: (r) => <StatusPill status={r.status} tone={r.status === "pending" ? "accent" : "muted"} /> },
    { key: "created", header: "เมื่อ", render: (r) => <span className="font-mono text-xs">{formatThaiDate(r.created_at)}</span> },
  ];

  return (
    <div>
      <SectionHeader
        eyebrow="collabs"
        title="คำขอคอลแลป"
        description={`${data?.length ?? 0} คำขอ`}
        actions={
          <div className="flex items-center gap-2">
            <AdminExportButton rows={(filtered ?? []) as unknown as Record<string, unknown>[]} filename="admin-collabs.csv" />
            <SearchBar value={q} onChange={setQ} />
          </div>
        }
      />
      <DataTable columns={cols} rows={filtered} loading={isLoading} rowKey={(r) => r.id} />
    </div>
  );
}
