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
  slug: string;
  name: string;
  tagline: string;
  verified: boolean;
  member_count: number;
  location: string;
  created_at: string;
}

export default function AdminStudiosPage() {
  const { data, isLoading } = useAdminList<Row>("studios");
  const { q, setQ, filtered } = useSearch(data, ["name", "slug", "tagline", "location"]);

  const cols: Column<Row>[] = [
    {
      key: "name",
      header: "สตูดิโอ",
      render: (r) => (
        <div>
          <Link to={`/s/${r.slug}`} className="font-medium text-admin-accent hover:underline">
            {r.name}
          </Link>
          <p className="text-xs text-admin-muted">/{r.slug}</p>
        </div>
      ),
    },
    { key: "tagline", header: "Tagline", render: (r) => <span className="text-xs text-admin-muted truncate block max-w-xs">{r.tagline || "—"}</span> },
    { key: "members", header: "สมาชิก", render: (r) => <span className="font-mono">{r.member_count}</span> },
    { key: "verified", header: "Verified", render: (r) => (r.verified ? <StatusPill status="VERIFIED" tone="accent" /> : <StatusPill status="—" tone="muted" />) },
    { key: "location", header: "ที่ตั้ง", render: (r) => r.location || "—" },
    { key: "created", header: "สร้างเมื่อ", render: (r) => <span className="font-mono text-xs">{formatThaiDate(r.created_at)}</span> },
  ];

  return (
    <div>
      <SectionHeader
        eyebrow="studios"
        title="สตูดิโอ"
        description={`${data?.length ?? 0} สตูดิโอ`}
        actions={
          <div className="flex items-center gap-2">
            <AdminExportButton rows={(filtered ?? []) as unknown as Record<string, unknown>[]} filename="admin-studios.csv" />
            <SearchBar value={q} onChange={setQ} />
          </div>
        }
      />
      <DataTable columns={cols} rows={filtered} loading={isLoading} rowKey={(r) => r.id} />
    </div>
  );
}
