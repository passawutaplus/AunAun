import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { type Column } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAdminApplyModeration } from "@/hooks/useModeration";
import { formatThaiDate } from "@/lib/format";

type ActionRow = {
  id: string;
  user_id: string;
  action_type: string;
  source: string;
  reason: string;
  expires_at: string | null;
  created_at: string;
};

export default function AdminModerationPage() {
  const [userFilter, setUserFilter] = useState("");
  const applyMod = useAdminApplyModeration();

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["admin", "moderation", userFilter],
    queryFn: async () => {
      let q = supabase
        .from("moderation_actions")
        .select("id, user_id, action_type, source, reason, expires_at, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (userFilter.trim()) q = q.eq("user_id", userFilter.trim());
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ActionRow[];
    },
  });

  const cols: Column<ActionRow>[] = [
    { key: "user", header: "User", render: (r) => r.user_id.slice(0, 8) + "…" },
    { key: "type", header: "Action", render: (r) => r.action_type },
    { key: "source", header: "Source", render: (r) => r.source },
    { key: "reason", header: "Reason", render: (r) => r.reason || "—" },
    { key: "expires", header: "หมดอายุ", render: (r) => (r.expires_at ? formatThaiDate(r.expires_at) : "—") },
    { key: "at", header: "เมื่อ", render: (r) => formatThaiDate(r.created_at) },
    {
      key: "unban",
      header: "",
      render: (r) =>
        r.action_type === "ban" || r.action_type === "mute" ? (
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                await applyMod.mutateAsync({ userId: r.user_id, action: "unban", note: "admin manual unban" });
                toast.success("ปลดแบนแล้ว");
                refetch();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "ล้มเหลว");
              }
            }}
          >
            ปลดแบน
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader title="Moderation" description="ประวัติ strike / ban / unban" />
      <div className="flex gap-2 max-w-md">
        <Input
          placeholder="กรองด้วย user_id (uuid)"
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
        />
        <Button variant="outline" onClick={() => refetch()}>ค้นหา</Button>
      </div>
      <DataTable columns={cols} rows={data} loading={isLoading} rowKey={(r) => r.id} />
    </div>
  );
}
