import { toast } from "sonner";
import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { Column } from "@/components/admin/DataTable";
import StatusPill from "@/components/admin/StatusPill";
import { SearchBar, useSearch } from "@/components/admin/SearchBar";
import AdminRowActions from "@/components/admin/AdminRowActions";
import { useAdminList } from "@/hooks/admin/useAdminList";
import { useAdminSetJobStatus } from "@/hooks/admin/useAdminMutations";
import { formatThaiDate } from "@/lib/format";

interface Row {
  id: string;
  title: string;
  status: string;
  role_category: string | null;
  location: string | null;
  created_at: string;
}

export default function AdminJobsPage() {
  const { data, isLoading } = useAdminList<Row>("job_posts", "id,title,status,role_category,location,created_at");
  const { q, setQ, filtered } = useSearch(data, ["title", "role_category", "location"]);
  const setStatus = useAdminSetJobStatus();

  const cols: Column<Row>[] = [
    { key: "title", header: "หัวข้อ", render: (r) => <span className="font-medium">{r.title}</span> },
    { key: "status", header: "สถานะ", render: (r) => <StatusPill status={r.status} tone="accent" /> },
    { key: "cat", header: "หมวด", render: (r) => r.role_category || "—" },
    { key: "loc", header: "ที่ตั้ง", render: (r) => r.location || "—" },
    { key: "at", header: "โพสต์เมื่อ", render: (r) => <span className="font-mono text-xs">{formatThaiDate(r.created_at)}</span> },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (r) => (
        <AdminRowActions
          actions={[
            { label: "ดูงาน", href: `/jobs/${r.id}` },
            ...(r.status !== "closed"
              ? [
                  {
                    label: "ปิดประกาศ",
                    onClick: () =>
                      setStatus.mutate(
                        { id: r.id, status: "closed" },
                        { onSuccess: () => toast.success("ปิดประกาศแล้ว"), onError: (e: Error) => toast.error(e.message) },
                      ),
                  },
                ]
              : []),
            ...(r.status !== "open"
              ? [
                  {
                    label: "เปิดประกาศ",
                    onClick: () =>
                      setStatus.mutate(
                        { id: r.id, status: "open" },
                        { onSuccess: () => toast.success("เปิดประกาศแล้ว"), onError: (e: Error) => toast.error(e.message) },
                      ),
                  },
                ]
              : []),
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <SectionHeader
        eyebrow="jobs"
        title="ประกาศงาน"
        description={`${data?.length ?? 0} ประกาศ`}
        actions={<SearchBar value={q} onChange={setQ} />}
      />
      <DataTable columns={cols} rows={filtered} loading={isLoading} rowKey={(r) => r.id} />
    </div>
  );
}
