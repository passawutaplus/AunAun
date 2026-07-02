import { toast } from "sonner";
import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { Column } from "@/components/admin/DataTable";
import StatusPill from "@/components/admin/StatusPill";
import { SearchBar, useSearch } from "@/components/admin/SearchBar";
import AdminRowActions from "@/components/admin/AdminRowActions";
import AdminExportButton from "@/components/admin/AdminExportButton";
import { useAdminList } from "@/hooks/admin/useAdminList";
import { useAdminDeleteProject, useAdminSetProjectStatus } from "@/hooks/admin/useAdminMutations";
import { formatThaiDate } from "@/lib/format";
import { getLicenseMeta } from "@/lib/licenses";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

interface Row {
  id: string;
  title: string;
  category: string;
  status: string;
  owner_id: string;
  views: number;
  likes: number;
  created_at: string;
  license_type: string;
  rights_attested_at: string | null;
}

const STATUSES = ["Published", "Draft", "Private"] as const;

type LicenseFilter = "all" | "risk";

export default function AdminProjectsPage() {
  const [licenseFilter, setLicenseFilter] = useState<LicenseFilter>("all");
  const { data, isLoading } = useAdminList<Row>(
    "projects",
    "id,title,category,status,owner_id,views,likes,created_at,license_type,rights_attested_at",
  );
  const { q, setQ, filtered: searched } = useSearch(data, ["title", "category", "status", "license_type"]);
  const filtered = (searched ?? []).filter((r) => {
    if (licenseFilter === "risk") {
      return r.status === "Published" && !r.rights_attested_at;
    }
    return true;
  });
  const setStatus = useAdminSetProjectStatus();
  const remove = useAdminDeleteProject();

  const cols: Column<Row>[] = [
    {
      key: "title",
      header: "ชื่อผลงาน",
      render: (r) => <span className="font-medium">{r.title}</span>,
    },
    { key: "category", header: "หมวด", render: (r) => <StatusPill status={r.category} tone="muted" /> },
    {
      key: "license",
      header: "ลิขสิทธิ์",
      render: (r) => (
        <div className="space-y-0.5">
          <span className="text-xs">{getLicenseMeta(r.license_type).shortLabel}</span>
          {r.status === "Published" && !r.rights_attested_at && (
            <StatusPill status="ไม่ยืนยันสิทธิ์" tone="accent" />
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "สถานะ",
      render: (r) => <StatusPill status={r.status} tone={r.status === "Published" ? "accent" : "muted"} />,
    },
    { key: "views", header: "Views", render: (r) => <span className="font-mono">{r.views}</span> },
    { key: "likes", header: "+1", render: (r) => <span className="font-mono">{r.likes}</span> },
    { key: "created", header: "สร้างเมื่อ", render: (r) => <span className="font-mono text-xs">{formatThaiDate(r.created_at)}</span> },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (r) => (
        <AdminRowActions
          actions={[
            { label: "ดูผลงาน", href: `/project/${r.id}` },
            ...STATUSES.filter((s) => s !== r.status).map((s) => ({
              label: `ตั้งเป็น ${s}`,
              onClick: () =>
                setStatus.mutate(
                  { id: r.id, status: s },
                  {
                    onSuccess: () => toast.success(`อัปเดตเป็น ${s}`),
                    onError: (e: Error) => toast.error(e.message),
                  },
                ),
            })),
            {
              label: "ลบผลงาน",
              destructive: true,
              onClick: () => {
                if (!window.confirm(`ลบผลงาน "${r.title}" ถาวร?`)) return;
                remove.mutate(r.id, {
                  onSuccess: () => toast.success("ลบผลงานแล้ว"),
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
        eyebrow="projects"
        title="ผลงาน"
        description={`${data?.length ?? 0} ผลงาน — เปลี่ยนสถานะหรือลบได้`}
        actions={
          <div className="flex items-center gap-2">
            <AdminExportButton rows={(filtered ?? []) as unknown as Record<string, unknown>[]} filename="admin-projects.csv" />
            <SearchBar value={q} onChange={setQ} />
          </div>
        }
      />
      <Tabs value={licenseFilter} onValueChange={(v) => setLicenseFilter(v as LicenseFilter)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
          <TabsTrigger value="risk">เผยแพร่แต่ไม่ยืนยันสิทธิ์</TabsTrigger>
        </TabsList>
      </Tabs>
      <DataTable columns={cols} rows={filtered} loading={isLoading} rowKey={(r) => r.id} />
    </div>
  );
}
