import { Link } from "react-router-dom";
import { useMyReports } from "@/hooks/useReports";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flag } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";

const STATUS_TONE: Record<string, string> = {
  open: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  reviewing: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  resolved: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  dismissed: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABEL: Record<string, string> = {
  open: "รอตรวจสอบ",
  reviewing: "กำลังตรวจสอบ",
  resolved: "ดำเนินการแล้ว",
  dismissed: "ยกคำร้อง",
};

const targetLink = (t: string, id: string) => {
  switch (t) {
    case "project":
      return `/project/${id}`;
    case "user":
      return `/u/${id}`;
    case "job":
      return `/jobs/${id}`;
    case "community_post":
      return `/community/${id}`;
    default:
      return "#";
  }
};

const MyReportsPage = () => {
  const { data: rows = [], isLoading } = useMyReports();

  return (
    <div className="container max-w-3xl mx-auto px-4 py-6 pb-24">
      <BackButton to="/settings" className="mb-4" />
      <div className="flex items-center gap-2 mb-1">
        <Flag className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-semibold">รายงานของฉัน</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">ติดตามสถานะคำร้องเรียนที่คุณส่งให้ทีมงาน</p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">ยังไม่เคยส่งรายงาน</p>
          <Button asChild variant="link" className="mt-2">
            <Link to="/">กลับหน้าแรก</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={STATUS_TONE[r.status] ?? ""}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{r.reason}</span>
                  </div>
                  <Link
                    to={targetLink(r.target_type, r.target_id)}
                    className="text-sm font-medium hover:underline"
                  >
                    {r.target_type} • {r.target_id.slice(0, 8)}…
                  </Link>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {r.created_at.slice(0, 16).replace("T", " ")}
                </span>
              </div>
              {r.details && <p className="text-sm text-muted-foreground">{r.details}</p>}
              {r.admin_note && (
                <div className="text-xs bg-muted/60 rounded-md p-2 border-l-2 border-primary">
                  <strong className="text-foreground">ทีมงาน:</strong> {r.admin_note}
                </div>
              )}
              {r.evidence_files?.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {r.evidence_files.map((f, i) => (
                    <a key={i} href={f.url} target="_blank" rel="noreferrer" className="text-[10px] underline text-muted-foreground">
                      {f.name}
                    </a>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyReportsPage;
