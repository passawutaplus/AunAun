import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { Column } from "@/components/admin/DataTable";
import StatusPill from "@/components/admin/StatusPill";
import { SearchBar, useSearch } from "@/components/admin/SearchBar";
import AdminRowActions from "@/components/admin/AdminRowActions";
import AdminExportButton from "@/components/admin/AdminExportButton";
import { supabase } from "@/integrations/supabase/client";
import { useAdminDismissNotification } from "@/hooks/admin/useAdminMutations";
import { resolveNotificationLink } from "@/lib/notificationLinks";
import { formatThaiDate } from "@/lib/format";

interface Row {
  id: string;
  user_id: string;
  app: string;
  kind: string;
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

export default function AdminNotificationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const { data: rows, error } = await supabase.rpc("admin_list_notifications", { _limit: 200 });
      if (error) throw error;
      return (rows ?? []) as Row[];
    },
  });
  const { q, setQ, filtered } = useSearch(data, ["title", "body", "kind", "app"]);
  const dismiss = useAdminDismissNotification();

  const cols: Column<Row>[] = [
    { key: "app", header: "แอป", render: (r) => <StatusPill status={r.app} tone="muted" /> },
    { key: "kind", header: "ประเภท", render: (r) => <span className="font-mono text-xs">{r.kind}</span> },
    {
      key: "title",
      header: "หัวข้อ",
      render: (r) => (
        <div>
          <p className="font-medium">{r.title}</p>
          {r.body && <p className="text-xs text-admin-muted truncate max-w-md">{r.body}</p>}
        </div>
      ),
    },
    {
      key: "user",
      header: "ผู้รับ",
      render: (r) => (
        <a href={`/u/${r.user_id}`} className="font-mono text-xs text-admin-accent hover:underline">
          {r.user_id.slice(0, 8)}…
        </a>
      ),
    },
    {
      key: "state",
      header: "สถานะ",
      render: (r) => (
        <div className="flex gap-1">
          {r.is_dismissed && <StatusPill status="dismissed" tone="muted" />}
          {r.is_read && !r.is_dismissed && <StatusPill status="read" tone="muted" />}
          {!r.is_read && !r.is_dismissed && <StatusPill status="unread" tone="accent" />}
        </div>
      ),
    },
    { key: "at", header: "เมื่อ", render: (r) => <span className="font-mono text-xs">{formatThaiDate(r.created_at)}</span> },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (r) => (
        <AdminRowActions
          actions={[
            ...(r.link ? [{ label: "เปิดลิงก์", href: resolveNotificationLink(r.link) }] : []),
            ...(!r.is_dismissed
              ? [
                  {
                    label: "ซ่อน (dismiss)",
                    onClick: () =>
                      dismiss.mutate(r.id, {
                        onSuccess: () => toast.success("ซ่อนแล้ว"),
                        onError: (e: Error) => toast.error(e.message),
                      }),
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
        eyebrow="notifications"
        title="ศูนย์แจ้งเตือน"
        description={`มอนิเตอร์การแจ้งเตือนทั้งระบบ (${data?.length ?? 0} รายการล่าสุด)`}
        actions={
          <div className="flex items-center gap-2">
            <AdminExportButton rows={(filtered ?? []) as unknown as Record<string, unknown>[]} filename="admin-notifications.csv" />
            <SearchBar value={q} onChange={setQ} />
          </div>
        }
      />
      <DataTable columns={cols} rows={filtered} loading={isLoading} rowKey={(r) => r.id} />
    </div>
  );
}
