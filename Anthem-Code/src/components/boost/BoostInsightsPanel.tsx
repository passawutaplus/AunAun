import { TrendingUp, MousePointerClick, Eye, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useMyBoosts, boostPackageLabel, type PostBoost } from "@/hooks/useBoost";
import BoostBadge from "@/components/boost/BoostBadge";

const statusLabel: Record<PostBoost["status"], string> = {
  pending_payment: "รอชำระ",
  active: "กำลัง Boost",
  expired: "หมดอายุ",
  cancelled: "ยกเลิก",
};

function daysLeft(endAt: string | null): string {
  if (!endAt) return "—";
  const ms = new Date(endAt).getTime() - Date.now();
  if (ms <= 0) return "หมดแล้ว";
  const d = Math.ceil(ms / 86_400_000);
  return `${d} วัน`;
}

function ctr(impressions: number, clicks: number): string {
  if (impressions <= 0) return "—";
  return `${((clicks / impressions) * 100).toFixed(1)}%`;
}

export default function BoostInsightsPanel() {
  const navigate = useNavigate();
  const { data: boosts = [], isLoading } = useMyBoosts();
  const active = boosts.filter((b) => b.status === "active");
  const totalImp = active.reduce((s, b) => s + b.impressions, 0);
  const totalClk = active.reduce((s, b) => s + b.clicks, 0);

  return (
    <section className="space-y-3" id="boost-section">
      <div className="flex items-center gap-3">
        <div className="text-primary">
          <TrendingUp className="w-5 h-5" strokeWidth={2.25} />
        </div>
        <div className="flex-1">
          <h2 className="font-medium text-foreground flex items-center gap-2">
            Boost โพสต์
            <BoostBadge />
          </h2>
          <p className="text-xs text-muted-foreground">
            สถิติการแสดงและคลิก — ดันโพสต์/portfolio ของคุณขึ้นฟีด
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card className="border-dashed">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Active</p>
            <p className="text-xl font-semibold tabular-nums">{active.length}</p>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              <Eye className="w-3 h-3" /> แสดง
            </p>
            <p className="text-xl font-semibold tabular-nums">{totalImp.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              <MousePointerClick className="w-3 h-3" /> คลิก
            </p>
            <p className="text-xl font-semibold tabular-nums">{totalClk.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
      ) : boosts.length === 0 ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="p-4 text-center space-y-2">
            <Sparkles className="w-8 h-8 mx-auto text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">ยังไม่มีประวัติ Boost</p>
            <p className="text-xs text-muted-foreground">กด Boost บนผลงานหรือโพสต์ชุมชน — preset หรือกำหนดเองตั้งแต่ ฿50</p>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => navigate("/")}>
              ไปฟีด
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {boosts.slice(0, 8).map((b) => (
            <Card key={b.id} className="overflow-hidden">
              <CardHeader className="py-2 px-3 pb-0">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-medium truncate">
                    {b.target_type === "project" ? "ผลงาน" : "โพสต์ชุมชน"} ·{" "}
                    {boostPackageLabel(b.package, b.duration_days, b.amount_thb)}
                  </CardTitle>
                  <Badge variant={b.status === "active" ? "default" : "secondary"} className="text-[10px] shrink-0">
                    {statusLabel[b.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="py-2 px-3 text-xs text-muted-foreground grid grid-cols-2 sm:grid-cols-4 gap-2">
                <span>แสดง {b.impressions.toLocaleString()}</span>
                <span>คลิก {b.clicks.toLocaleString()}</span>
                <span>CTR {ctr(b.impressions, b.clicks)}</span>
                <span>เหลือ {daysLeft(b.end_at)}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
