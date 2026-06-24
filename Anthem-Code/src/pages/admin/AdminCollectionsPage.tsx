import { toast } from "sonner";
import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { Column } from "@/components/admin/DataTable";
import { SearchBar, useSearch } from "@/components/admin/SearchBar";
import AdminRowActions from "@/components/admin/AdminRowActions";
import { useAdminList } from "@/hooks/admin/useAdminList";
import { useAdminDeleteCollection } from "@/hooks/admin/useAdminMutations";
import { formatThaiDate } from "@/lib/format";

interface Row {
  id: string;
  name: string;
  user_id: string;
  is_public: boolean;
  created_at: string;
}

export default function AdminCollectionsPage() {
  const { data, isLoading } = useAdminList<Row>("collections", "id,name,user_id,is_public,created_at");
  const { q, setQ, filtered } = useSearch(data, ["name"]);
  const remove = useAdminDeleteCollection();

  const cols: Column<Row>[] = [
    { key: "name", header: "ชื่อ", render: (r) => <span className="font-medium">{r.name}</span> },
    {
      key: "owner",
      header: "เจ้าของ",
      render: (r) => (
        <a href={`/u/${r.user_id}`} className="font-mono text-xs text-admin-accent hover:underline">
          {r.user_id.slice(0, 8)}…
        </a>
      ),
    },
    { key: "public", header: "สาธารณะ", render: (r) => (r.is_public ? "ใช่" : "ไม่") },
    { key: "at", header: "สร้างเมื่อ", render: (r) => <span className="font-mono text-xs">{formatThaiDate(r.created_at)}</span> },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (r) => (
        <AdminRowActions
          actions={[
            { label: "ดูคอลเลกชัน", href: `/collections/${r.id}` },
            {
              label: "ลบคอลเลกชัน",
              destructive: true,
              onClick: () => {
                if (!window.confirm(`ลบ "${r.name}"?`)) return;
                remove.mutate(r.id, {
                  onSuccess: () => toast.success("ลบแล้ว"),
                  onError: (e: Error) => toast.error(e.message),
                });
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <SectionHeader
        eyebrow="collections"
        title="คอลเลกชัน"
        description={`${data?.length ?? 0} คอลเลกชัน`}
        actions={<SearchBar value={q} onChange={setQ} />}
      />
      <DataTable columns={cols} rows={filtered} loading={isLoading} rowKey={(r) => r.id} />
    </div>
  );
}
