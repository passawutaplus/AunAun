import { Link } from "react-router-dom";
import { useMyFeedback } from "@/hooks/useFeedback";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Star } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { InlineLoader } from "@/components/ui/BanterLoader";
import { Button } from "@/components/ui/button";
import FeedbackKindBadge from "@/components/feedback/FeedbackKindBadge";
import FeedbackScreenshotThumb from "@/components/feedback/FeedbackScreenshotThumb";
import { useOpenFeedbackTicket } from "@/hooks/useOpenFeedbackTicket";

const STATUS_TONE: Record<string, string> = {
  new: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  reviewing: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  resolved: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  dismissed: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABEL: Record<string, string> = {
  new: "ใหม่",
  reviewing: "กำลังพิจารณา",
  resolved: "นำไปปรับปรุงแล้ว",
  dismissed: "ปิด",
};

const MyFeedbackPage = () => {
  const { data: rows = [], isLoading } = useMyFeedback();
  const openFeedback = useOpenFeedbackTicket();

  return (
    <div className="container max-w-3xl mx-auto px-4 py-6 pb-24">
      <BackButton to="/settings" className="mb-4" />
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-semibold">ฟีดแบ็กของฉัน</h1>
        </div>
        <Button size="sm" onClick={openFeedback}>
          ส่งฟีดแบ็ก
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">ตั๋วที่คุณส่งและสถานะการพิจารณา</p>

      {isLoading ? (
        <InlineLoader />
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">ยังไม่เคยส่งฟีดแบ็ก</p>
          <Button className="mt-3" onClick={openFeedback}>
            ส่งฟีดแบ็ก
          </Button>
          <Button asChild variant="link" className="mt-1">
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
                    {r.ticket_number ? (
                      <span className="font-mono text-xs font-semibold">{r.ticket_number}</span>
                    ) : null}
                    <FeedbackKindBadge kind={r.kind} />
                    <Badge variant="outline" className={STATUS_TONE[r.status] ?? ""}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{r.feature}</span>
                    {r.rating != null ? (
                      <span className="flex items-center gap-0.5 text-xs">
                        {r.rating} <Star className="w-3 h-3 fill-primary text-primary" />
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{r.route}</p>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {r.created_at.slice(0, 16).replace("T", " ")}
                </span>
              </div>
              {r.message ? <p className="text-sm">{r.message}</p> : null}
              {r.screenshot_path ? (
                <FeedbackScreenshotThumb stored={r.screenshot_path} annotationJson={r.annotation_json} />
              ) : null}
              {r.admin_note ? (
                <div className="text-xs bg-muted/60 rounded-md p-2 border-l-2 border-primary">
                  <strong className="text-foreground">ทีมงาน:</strong> {r.admin_note}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyFeedbackPage;
