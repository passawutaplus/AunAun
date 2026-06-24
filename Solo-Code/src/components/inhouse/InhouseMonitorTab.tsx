import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useInhouseMonitor } from "@/hooks/inhouse/useInhouseMonitor";
import type { InhouseOrg, InhouseWorkspace } from "@/lib/inhouse/types";
import { Activity, Users } from "lucide-react";

interface Props {
  org: InhouseOrg;
  workspace: InhouseWorkspace;
}

export function InhouseMonitorTab({ org, workspace }: Props) {
  const { memberSummaries, activity, taskStats } = useInhouseMonitor(
    org.id,
    org.slug,
    workspace.id,
  );
  const seatUsed = memberSummaries.length;
  const seatPct = org.seat_limit > 0 ? (seatUsed / org.seat_limit) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Team Monitor</h2>
        <p className="text-sm text-muted-foreground">ติดตามการทำงานของสมาชิกใน workspace นี้</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Seats</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {seatUsed} / {org.seat_limit}
            </p>
            <Progress value={seatPct} className="mt-2 h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{taskStats.inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{taskStats.overdue}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{taskStats.done}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            สมาชิก & งาน
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {memberSummaries.map((m) => (
            <div key={m.userId} className="flex items-center gap-3 rounded-lg border p-3">
              <Avatar>
                <AvatarImage src={m.avatarUrl ?? undefined} />
                <AvatarFallback>{m.displayName.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{m.displayName}</p>
                <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
              </div>
              <div className="flex gap-2 text-xs">
                <Badge variant="outline">todo {m.todo}</Badge>
                <Badge variant="secondary">doing {m.doing}</Badge>
                {m.overdue > 0 && <Badge variant="destructive">late {m.overdue}</Badge>}
              </div>
              {m.lastActive && (
                <p className="hidden text-xs text-muted-foreground sm:block">
                  {new Date(m.lastActive).toLocaleDateString("th-TH")}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {activity.slice(0, 20).map((ev) => (
            <div
              key={ev.id}
              className="flex items-center gap-2 text-sm border-b border-dashed pb-2 last:border-0"
            >
              <span className="text-muted-foreground shrink-0 w-28 text-xs">
                {new Date(ev.created_at).toLocaleString("th-TH")}
              </span>
              <span className="font-medium">{ev.user?.display_name ?? "—"}</span>
              <span className="text-muted-foreground">{ev.event_type.replace(/_/g, " ")}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
