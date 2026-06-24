import { Link } from "react-router-dom";
import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { Column } from "@/components/admin/DataTable";
import { SearchBar, useSearch } from "@/components/admin/SearchBar";
import AdminExportButton from "@/components/admin/AdminExportButton";
import { useAdminList } from "@/hooks/admin/useAdminList";
import { formatThaiDate } from "@/lib/format";

interface Row {
  id: string;
  owner_id: string;
  name: string;
  cover_url: string;
  item_count: number;
  created_at: string;
}

export default function AdminInspirePage() {
  const { data, isLoading } = useAdminList<Row>(
    "inspire_boards",
    "id,owner_id,name,cover_url,item_count,created_at",
  );
  const { q, setQ, filtered } = useSearch(data, ["name"]);

  const cols: Column<Row>[] = [
    {
      key: "name",
      header: "บอร์ด",
      render: (r) => (
        <Link to={`/inspire/${r.id}`} className="font-medium text-admin-accent hover:underline">
          {r.name}
        </Link>
      ),
    },
    {
      key: "owner",
      header: "เจ้าของ",
      render: (r) => (
        <a href={`/u/${r.owner_id}`} className="font-mono text-xs text-admin-muted hover:text-admin-accent">
          {r.owner_id.slice(0, 8)}…
        </a>
      ),
    },
    { key: "items", header: "รายการ", render: (r) => <span className="font-mono">{r.item_count}</span> },
    { key: "at", header: "สร้างเมื่อ", render: (r) => <span className="font-mono text-xs">{formatThaiDate(r.created_at)}</span> },
  ];

  return (
    <div>
      <SectionHeader
        eyebrow="inspire"
        title="Inspire boards"
        description={`${data?.length ?? 0} บอร์ด — มอนิเตอร์และส่งออก CSV`}
        actions={
          <div className="flex items-center gap-2">
            <AdminExportButton rows={(filtered ?? []) as unknown as Record<string, unknown>[]} filename="admin-inspire.csv" />
            <SearchBar value={q} onChange={setQ} />
          </div>
        }
      />
      <DataTable columns={cols} rows={filtered} loading={isLoading} rowKey={(r) => r.id} />
    </div>
  );
}
