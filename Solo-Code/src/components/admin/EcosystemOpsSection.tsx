import * as React from "react";
import { ExternalLink, Link2, Loader2, Mic, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/dashboard/StatCard";
import { MemberCodeCopy } from "@/components/MemberCodeCopy";
import { useEcosystemOpsStats } from "@/hooks/useEcosystemOpsStats";
import { OPS_HUB_URL, APLUS1_SHOWCASE_URL } from "@/lib/productLinks";

function fmtWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function hubUserUrl(userId: string) {
  return `${OPS_HUB_URL}/users/${userId}`;
}

export function EcosystemOpsSection() {
  const { data, isLoading, isError, error, refetch, isFetching } = useEcosystemOpsStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-3">
        <p className="text-sm font-medium text-destructive">โหลด Ecosystem Ops ไม่สำเร็จ</p>
        <p className="text-xs text-muted-foreground">
          {error instanceof Error ? error.message : "unknown"} — ต้อง apply migration{" "}
          <code className="text-[10px]">admin_ecosystem_ops_stats</code>
        </p>
        <Button size="sm" variant="outline" onClick={() => void refetch()}>
          ลองใหม่
        </Button>
      </div>
    );
  }

  const aplus1Base = APLUS1_SHOWCASE_URL.replace(/\/$/, "");
  const drillGallery = `${aplus1Base}/drill`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Ecosystem Ops
          </h2>
          <p className="text-sm text-muted-foreground">
            Design Drill + Meeting Capture · อัปเดต {fmtWhen(data.generated_at)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" asChild>
            <a href={`${OPS_HUB_URL}/connections`} target="_blank" rel="noopener noreferrer">
              Ops Hub Connections <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            {isFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            รีเฟรช
          </Button>
        </div>
      </div>

      <Tabs defaultValue="drill">
        <TabsList>
          <TabsTrigger value="drill" className="gap-1.5">
            <Target className="h-3.5 w-3.5" /> Design Drill
          </TabsTrigger>
          <TabsTrigger value="meeting" className="gap-1.5">
            <Mic className="h-3.5 w-3.5" /> Meeting Capture
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drill" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Reroll วันนี้" value={String(data.drill.rerolls_today)} />
            <StatCard label="Cross-link 7 วัน" value={String(data.drill.cross_links_7d)} />
            <StatCard label="Conversion %" value={`${data.drill.conversion_pct}%`} />
            <StatCard label="Drill posts (an1hem)" value={String(data.drill.drill_posts_total)} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" asChild>
              <a href={drillGallery} target="_blank" rel="noopener noreferrer">
                Drill Gallery <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
            <Button size="sm" variant="secondary" asChild>
              <a href={`${OPS_HUB_URL}/connections`} target="_blank" rel="noopener noreferrer">
                Flywheel funnel <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top users (reroll + drill links)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border text-sm">
                {data.drill.top_users.length === 0 ? (
                  <li className="px-4 py-6 text-center text-muted-foreground text-xs">ยังไม่มีข้อมูล</li>
                ) : (
                  data.drill.top_users.map((u) => (
                    <li key={u.user_id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                      <div className="space-y-0.5">
                        <MemberCodeCopy userId={u.user_id} size="sm" showLabel={false} />
                        <p className="text-[10px] text-muted-foreground font-mono">{u.user_id}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>reroll {u.rerolls_today}</span>
                        <span>links {u.drill_links_7d}</span>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                          <a href={hubUserUrl(u.user_id)} target="_blank" rel="noopener noreferrer">
                            User 360
                          </a>
                        </Button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meeting" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Captures ทั้งหมด" value={String(data.meeting.captures_total)} />
            <StatCard label="AI credits 7 วัน" value={String(data.meeting.credits_7d)} />
            <StatCard
              label="Ready"
              value={String(data.meeting.by_status.ready ?? 0)}
            />
          </div>

          {Object.keys(data.meeting.by_status).length > 0 ? (
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(data.meeting.by_status).map(([status, count]) => (
                <span key={status} className="rounded-full border border-border px-2 py-0.5">
                  {status}: <strong>{count}</strong>
                </span>
              ))}
            </div>
          ) : null}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Recent captures</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border text-sm">
                {data.meeting.recent.length === 0 ? (
                  <li className="px-4 py-6 text-center text-muted-foreground text-xs">ยังไม่มีข้อมูล</li>
                ) : (
                  data.meeting.recent.map((row) => (
                    <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{row.title || "ไม่มีชื่อ"}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {fmtWhen(row.created_at)} · {row.status}
                          {row.duration_sec ? ` · ${row.duration_sec}s` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <MemberCodeCopy userId={row.user_id} size="sm" showLabel={false} />
                        <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                          <a href={hubUserUrl(row.user_id)} target="_blank" rel="noopener noreferrer">
                            User 360
                          </a>
                        </Button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
