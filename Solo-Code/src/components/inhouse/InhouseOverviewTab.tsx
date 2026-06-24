import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useInhouseOrgMembers } from "@/hooks/inhouse/useInhouseOrg";
import { useInhouseActivity, useInhouseMonitor } from "@/hooks/inhouse/useInhouseMonitor";
import { useInhouseTasks } from "@/hooks/inhouse/useInhouseTasks";
import type { InhouseOrg, InhouseWorkspace } from "@/lib/inhouse/types";
import { InhousePipelineBridge } from "@/components/inhouse/InhousePhase2Extras";
import { useCreateInhouseQuotation } from "@/hooks/inhouse/useInhouseQuotation";
import { Activity, CheckCircle2, Clock, Users } from "lucide-react";
import { toast } from "sonner";

interface Props {
  org: InhouseOrg;
  workspace: InhouseWorkspace;
}

export function InhouseOverviewTab({ org, workspace }: Props) {
  const createTeamQuote = useCreateInhouseQuotation();
  const { data: members = [] } = useInhouseOrgMembers(org.id);
  const { data: tasks = [] } = useInhouseTasks(workspace.id);
  const { data: activity = [] } = useInhouseActivity(org.id, workspace.id);
  const { taskStats } = useInhouseMonitor(org.id, org.slug, workspace.id);

  const activeCount = members.filter((m) => m.status === "active").length;

  const handleCreateTeamQuote = async () => {
    try {
      const q = await createTeamQuote.mutateAsync({
        org,
        members,
        workspaceId: workspace.id,
        projectName: workspace.name,
      });
      toast.success(`สร้าง ${q.number} แล้ว — เปิดใน Pipeline`);
      try {
        sessionStorage.setItem("so1o.openQuotationId", q.id);
      } catch {
        /* noop */
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "สร้างใบเสนอราคาไม่สำเร็จ");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{workspace.name}</h2>
        {workspace.description && (
          <p className="mt-1 text-sm text-muted-foreground">{workspace.description}</p>
        )}
      </div>

      <InhousePipelineBridge
        orgId={org.id}
        linkedQuotationId={workspace.linked_quotation_id}
        onCreateTeamQuote={handleCreateTeamQuote}
        creatingTeamQuote={createTeamQuote.isPending}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">สมาชิก</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeCount}</p>
            <p className="text-xs text-muted-foreground">
              {activeCount} / {org.seat_limit} seats
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">กำลังทำ</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{taskStats.inProgress}</p>
            <p className="text-xs text-muted-foreground">จาก {tasks.length} tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">เสร็จแล้ว</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{taskStats.done}</p>
            <p className="text-xs text-muted-foreground">tasks ที่ปิดแล้ว</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            กิจกรรมล่าสุด
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีกิจกรรม</p>
          ) : (
            <ul className="space-y-3">
              {activity.slice(0, 8).map((ev) => (
                <li key={ev.id} className="flex items-start gap-3 text-sm">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={ev.user?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {(ev.user?.display_name ?? "?").slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground">{ev.event_type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ev.created_at).toLocaleString("th-TH")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
