import { useMemo, useState } from "react";
import { Eye, FilePenLine, Globe, Mail } from "lucide-react";
import PackagesIcon from "@/components/icons/PackagesIcon";
import { toast } from "sonner";
import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { Column } from "@/components/admin/DataTable";
import StatusPill from "@/components/admin/StatusPill";
import KpiCard from "@/components/admin/KpiCard";
import { SearchBar, useSearch } from "@/components/admin/SearchBar";
import AdminRowActions from "@/components/admin/AdminRowActions";
import AdminExportButton from "@/components/admin/AdminExportButton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAdminPackageOverview,
  useAdminPackages,
  type AdminPackageRow,
} from "@/hooks/admin/useAdminPackages";
import {
  useAdminDeleteCreatorService,
  useAdminSetCreatorServiceStatus,
} from "@/hooks/admin/useAdminMutations";
import { formatThaiDate } from "@/lib/format";

type StatusFilter = "all" | "Published" | "Draft";

export default function AdminPackagesPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const { data: overview } = useAdminPackageOverview();
  const { data, isLoading } = useAdminPackages();
  const { q, setQ, filtered: searched } = useSearch(data, ["title", "summary", "status", "owner_id"]);
  const setStatus = useAdminSetCreatorServiceStatus();
  const remove = useAdminDeleteCreatorService();

  const filtered = useMemo(() => {
    const list = searched ?? [];
    if (statusFilter === "all") return list;
    return list.filter((r) => r.status === statusFilter);
  }, [searched, statusFilter]);

  const cols: Column<AdminPackageRow>[] = [
    {
      key: "cover",
      header: "",
      className: "w-14",
      render: (r) =>
        r.cover_url ? (
          <img src={r.cover_url} alt="" className="h-10 w-14 rounded object-cover border border-admin-border" />
        ) : (
          <div className="h-10 w-14 rounded border border-admin-border bg-admin-surface flex items-center justify-center">
            <PackagesIcon className="w-3.5 h-3.5 text-admin-muted" />
          </div>
        ),
    },
    {
      key: "title",
      header: "แพ็กเกจ",
      render: (r) => (
        <div className="min-w-0 max-w-[18rem]">
          <p className="font-medium truncate">{r.title}</p>
          {r.summary ? (
            <p className="text-[11px] text-admin-muted line-clamp-1">{r.summary}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "owner",
      header: "เจ้าของ",
      render: (r) => (
        <a href={`/u/${r.owner_id}`} className="font-mono text-xs text-admin-accent hover:underline">
          {r.owner_id.slice(0, 8)}…
        </a>
      ),
    },
    {
      key: "price",
      header: "ราคา",
      render: (r) => <span className="font-mono text-xs tabular-nums">{r.price_label}</span>,
    },
    {
      key: "status",
      header: "สถานะ",
      render: (r) => (
        <StatusPill
          status={r.status === "Published" ? "เผยแพร่" : "แบบร่าง"}
          tone={r.status === "Published" ? "accent" : "muted"}
        />
      ),
    },
    {
      key: "views",
      header: "คนดู",
      render: (r) => <span className="font-mono tabular-nums">{r.view_count}</span>,
    },
    {
      key: "hires",
      header: "กดจ้าง",
      render: (r) => <span className="font-mono tabular-nums">{r.hire_count}</span>,
    },
    {
      key: "updated",
      header: "อัปเดต",
      render: (r) => <span className="font-mono text-xs">{formatThaiDate(r.updated_at)}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (r) => (
        <AdminRowActions
          actions={[
            { label: "ดูโปรไฟล์เจ้าของ", href: `/u/${r.owner_id}` },
            {
              label: r.status === "Published" ? "ตั้งเป็นแบบร่าง" : "เผยแพร่",
              onClick: () => {
                const next = r.status === "Published" ? "Draft" : "Published";
                setStatus.mutate(
                  { id: r.id, status: next },
                  {
                    onSuccess: () =>
                      toast.success(next === "Published" ? "เผยแพร่แล้ว" : "ตั้งเป็นแบบร่างแล้ว"),
                    onError: (e: Error) => toast.error(e.message),
                  },
                );
              },
            },
            {
              label: "ลบแพ็กเกจ",
              destructive: true,
              onClick: () => {
                if (!window.confirm(`ลบแพ็กเกจ "${r.title}"?`)) return;
                remove.mutate(r.id, {
                  onSuccess: () => toast.success("ลบแพ็กเกจแล้ว"),
                  onError: (e: Error) => toast.error(e.message),
                });
              },
            },
          ]}
        />
      ),
    },
  ];

  const exportRows = (filtered ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    owner_id: r.owner_id,
    status: r.status,
    price: r.price_label,
    views: r.view_count,
    hires: r.hire_count,
    updated_at: r.updated_at,
  }));

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="packages"
        title="แพ็กเกจบริการ"
        description="มอนิเตอร์แพ็กเกจครีเอเตอร์ — คนดู / กดจ้าง / สถานะเผยแพร่"
        actions={
          <div className="flex items-center gap-2">
            <AdminExportButton rows={exportRows} filename="admin-packages.csv" />
            <SearchBar value={q} onChange={setQ} placeholder="ค้นหาชื่อ / เจ้าของ…" />
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <KpiCard label="ทั้งหมด" value={overview?.total ?? 0} icon={PackagesIcon} />
        <KpiCard label="เผยแพร่" value={overview?.published ?? 0} icon={Globe} accent />
        <KpiCard label="แบบร่าง" value={overview?.drafts ?? 0} icon={FilePenLine} />
        <KpiCard
          label="คนดู 24 ชม."
          value={overview?.views24h ?? 0}
          icon={Eye}
          delta={overview ? `7 วัน: ${overview.views7d}` : undefined}
        />
        <KpiCard
          label="กดจ้าง 24 ชม."
          value={overview?.hires24h ?? 0}
          icon={Mail}
          accent
          delta={overview ? `7 วัน: ${overview.hires7d}` : undefined}
        />
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
        <TabsList className="h-9">
          <TabsTrigger value="all" className="text-xs">
            ทั้งหมด
          </TabsTrigger>
          <TabsTrigger value="Published" className="text-xs">
            เผยแพร่
          </TabsTrigger>
          <TabsTrigger value="Draft" className="text-xs">
            แบบร่าง
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable columns={cols} rows={filtered} loading={isLoading} rowKey={(r) => r.id} />
    </div>
  );
}
