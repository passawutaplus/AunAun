import { safeHref } from "@/lib/security";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ExternalLink, Pencil, Rocket, CheckCircle2, MessageSquare } from "lucide-react";
import { Post, PLATFORM_META, STATUS_META, colorForClient } from "./contentMeta";

export function UpcomingSidebar({
  upcomingByClient,
  clientName,
  onEditPost,
  onPublishNow,
}: {
  upcomingByClient: Record<string, Post[]>;
  clientName: (id: string) => string;
  onEditPost?: (p: Post) => void;
  onPublishNow?: (p: Post) => void;
}) {
  const isEmpty = Object.keys(upcomingByClient).length === 0;
  return (
    <Card className="rounded-2xl border-border/60 shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />7 วันข้างหน้า
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[560px] overflow-y-auto">
        {isEmpty && (
          <p className="text-xs text-muted-foreground text-center py-6">
            ยังไม่มีโพสต์ที่กำลังจะมาถึง
          </p>
        )}
        {Object.entries(upcomingByClient).map(([cid, list]) => (
          <div key={cid} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${colorForClient(cid)}`} />
              <h4 className="text-xs font-semibold">{clientName(cid)}</h4>
              <Badge variant="secondary" className="text-[10px] rounded-md h-4 px-1.5">
                {list.length}
              </Badge>
            </div>
            <div className="space-y-1.5 pl-4">
              {list.map((p) => {
                const SM = STATUS_META[p.status];
                return (
                  <div
                    key={p.id}
                    className="rounded-xl border border-border/60 bg-card p-2.5 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium leading-tight flex-1 truncate">{p.title}</p>
                      <span
                        className={`text-[9px] font-medium rounded-md px-1.5 py-0.5 whitespace-nowrap ${SM.className}`}
                      >
                        {SM.label}
                      </span>
                    </div>
                    {p.approvalStatus === "approved" && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[9px] text-emerald-600">
                        <CheckCircle2 className="h-2.5 w-2.5" /> ลูกค้าอนุมัติแล้ว
                      </div>
                    )}
                    {p.approvalStatus === "changes_requested" && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[9px] text-orange-600">
                        <MessageSquare className="h-2.5 w-2.5" /> ขอแก้ไข
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
                      <span>
                        {p.date.slice(5)} • {p.time}
                      </span>
                      <div className="flex items-center gap-1">
                        {p.platforms.map((pl) => {
                          const Icon = PLATFORM_META[pl].icon;
                          return <Icon key={pl} className={`h-3 w-3 ${PLATFORM_META[pl].color}`} />;
                        })}
                        {p.link && safeHref(p.link) && (
                          <a
                            href={safeHref(p.link)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 ml-1"
                            title="เปิดลิงก์"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      {onEditPost && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 rounded-md text-[10px] gap-1"
                          onClick={() => onEditPost(p)}
                        >
                          <Pencil className="h-2.5 w-2.5" /> แก้ไข
                        </Button>
                      )}
                      {onPublishNow && p.status === "approved" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 rounded-md text-[10px] gap-1 text-emerald-600 hover:text-emerald-700"
                          onClick={() => onPublishNow(p)}
                        >
                          <Rocket className="h-2.5 w-2.5" /> Publish Now
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
