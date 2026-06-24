import { Link } from "react-router-dom";
import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { Column } from "@/components/admin/DataTable";
import StatusPill from "@/components/admin/StatusPill";
import { SearchBar, useSearch } from "@/components/admin/SearchBar";
import AdminExportButton from "@/components/admin/AdminExportButton";
import { useAdminList } from "@/hooks/admin/useAdminList";
import { formatThaiDate } from "@/lib/format";

interface Row {
  id: string;
  user_id: string;
  job_id: string | null;
  type: string;
  title: string;
  status: string;
  created_at: string;
}

export default function AdminContractsPage() {
  const { data, isLoading } = useAdminList<Row>(
    "contracts",
    "id,user_id,job_id,type,title,status,created_at",
  );
  const { q, setQ, filtered } = useSearch(data, ["title", "type", "status"]);

  const cols: Column<Row>[] = [
    { key: "title", header: "สัญญา", render: (r) => <span className="font-medium">{r.title}</span> },
    { key: "type", header: "ประเภท", render: (r) => <StatusPill status={r.type} tone="muted" /> },
    { key: "status", header: "สถานะ", render: (r) => <StatusPill status={r.status} tone="accent" /> },
    {
      key: "owner",
      header: "เจ้าของ",
      render: (r) => (
        <Link to={`/u/${r.user_id}`} className="font-mono text-xs text-admin-accent hover:underline">
          {r.user_id.slice(0, 8)}…
        </Link>
      ),
    },
    {
      key: "job",
      header: "งาน",
      render: (r) =>
        r.job_id ? (
          <Link to={`/jobs/${r.job_id}`} className="text-xs text-admin-accent hover:underline">
            {r.job_id.slice(0, 8)}…
          </Link>
        ) : (
          "—"
        ),
    },
    { key: "at", header: "สร้างเมื่อ", render: (r) => <span className="font-mono text-xs">{formatThaiDate(r.created_at)}</span> },
  ];

  return (
    <div>
      <SectionHeader
        eyebrow="contracts"
        title="สัญญา & ใบเสนอราคา"
        description={`${data?.length ?? 0} สัญญาในระบบ`}
        actions={
          <div className="flex items-center gap-2">
            <AdminExportButton rows={(filtered ?? []) as unknown as Record<string, unknown>[]} filename="contracts.csv" />
            <SearchBar value={q} onChange={setQ} placeholder="ค้นหาสัญญา" />
          </div>
        }
      />
      <DataTable columns={cols} rows={filtered} loading={isLoading} rowKey={(r) => r.id} empty="ยังไม่มีสัญญา" />
    </div>
  );
}
