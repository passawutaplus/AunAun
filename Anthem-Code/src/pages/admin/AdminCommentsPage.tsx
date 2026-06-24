import { toast } from "sonner";
import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { Column } from "@/components/admin/DataTable";
import { SearchBar, useSearch } from "@/components/admin/SearchBar";
import AdminRowActions from "@/components/admin/AdminRowActions";
import AdminExportButton from "@/components/admin/AdminExportButton";
import { useAdminList } from "@/hooks/admin/useAdminList";
import { useAdminDeleteComment } from "@/hooks/admin/useAdminMutations";
import { formatThaiDate } from "@/lib/format";

interface Row {
  id: string;
  user_id: string;
  project_id: string;
  content: string;
  created_at: string;
}

export default function AdminCommentsPage() {
  const { data, isLoading } = useAdminList<Row>("project_comments");
  const { q, setQ, filtered } = useSearch(data, ["content"]);
  const remove = useAdminDeleteComment();

  const cols: Column<Row>[] = [
    {
      key: "user",
      header: "ผู้ใช้",
      render: (r) => (
        <a href={`/u/${r.user_id}`} className="font-mono text-xs text-admin-accent hover:underline">
          {r.user_id.slice(0, 8)}…
        </a>
      ),
    },
    {
      key: "project",
      header: "ผลงาน",
      render: (r) => (
        <a href={`/project/${r.project_id}`} className="font-mono text-xs text-admin-accent hover:underline">
          {r.project_id.slice(0, 8)}…
        </a>
      ),
    },
    { key: "content", header: "ข้อความ", render: (r) => <span className="block max-w-2xl truncate">{r.content}</span> },
    { key: "at", header: "เมื่อ", render: (r) => <span className="font-mono text-xs">{formatThaiDate(r.created_at)}</span> },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (r) => (
        <AdminRowActions
          actions={[
            {
              label: "ลบคอมเมนต์",
              destructive: true,
              onClick: () => {
                if (!window.confirm("ลบคอมเมนต์นี้?")) return;
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
        eyebrow="comments"
        title="คอมเมนต์"
        description={`${data?.length ?? 0} ข้อความ`}
        actions={
          <div className="flex items-center gap-2">
            <AdminExportButton rows={(filtered ?? []) as unknown as Record<string, unknown>[]} filename="admin-comments.csv" />
            <SearchBar value={q} onChange={setQ} />
          </div>
        }
      />
      <DataTable columns={cols} rows={filtered} loading={isLoading} rowKey={(r) => r.id} />
    </div>
  );
}
