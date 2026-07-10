import BriefcaseIcon from "../icons/BriefcaseIcon";
import { useNavigate } from "react-router-dom";
import { Sparkles, X, Check } from "lucide-react";
import {
  useJobMatchNotifications,
  useDismissJobMatch,
  useMarkJobMatchRead,
} from "@/hooks/useJobMatchNotifications";
import { InlineLoader } from "@/components/ui/BanterLoader";

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชม.ที่แล้ว`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString("th-TH");
};

export const JobMatchList = ({ onBeforeNavigate }: { onBeforeNavigate?: () => void }) => {
  const navigate = useNavigate();
  const { data = [], isLoading } = useJobMatchNotifications();
  const dismiss = useDismissJobMatch();
  const markRead = useMarkJobMatchRead();

  if (isLoading) return <InlineLoader />;
  if (data.length === 0)
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">ยังไม่มีงานที่ตรงกับคุณ — ลองอัปเดตสกิลใน Settings</p>
      </div>
    );

  const high = data.filter((d) => d.match_score >= 70);
  const mid = data.filter((d) => d.match_score < 70);

  const Card = ({ n }: { n: (typeof data)[number] }) => (
    <div
      className={`p-4 rounded-2xl glass-panel transition-colors ${
        !n.is_read ? "border-primary/40 bg-primary/5" : "hover:border-primary/30"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-brand text-white flex items-center justify-center shrink-0">
            {n.job?.post_type === "seeking" ? <Sparkles className="w-4 h-4" /> : <BriefcaseIcon className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{n.job?.title ?? "งาน"}</p>
            <p className="text-[11px] text-muted-foreground">
              {n.job?.post_type === "seeking" ? "ผู้ใช้ประกาศหางาน" : "ลงประกาศรับสมัคร"} ·{" "}
              {n.job?.role_category}
            </p>
          </div>
        </div>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
            n.match_score >= 70 ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"
          }`}
        >
          {n.match_score}% match
        </span>
      </div>

      {n.match_reasons.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {n.match_reasons.map((r, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-foreground/80">
              {r}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</span>
        <div className="flex gap-1.5">
          <button
            onClick={() => dismiss.mutate(n.id)}
            className="px-3 py-1.5 rounded-full bg-secondary text-foreground text-xs hover:bg-accent flex items-center gap-1"
          >
            <X className="w-3 h-3" /> ไม่สนใจ
          </button>
          <button
            onClick={() => {
              markRead.mutate(n.id);
              onBeforeNavigate?.();
              navigate(`/job/${n.job_id}`);
            }}
            className="px-3 py-1.5 rounded-full bg-gradient-brand text-white text-xs font-medium hover:opacity-90 flex items-center gap-1"
          >
            <Check className="w-3 h-3" /> ดูงาน
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {high.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-primary flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> ตรงกับคุณมาก
          </p>
          {high.map((n) => <Card key={n.id} n={n} />)}
        </div>
      )}
      {mid.length > 0 && (
        <div className="space-y-2">
          {high.length > 0 && <p className="text-xs font-medium text-muted-foreground">น่าสนใจอื่นๆ</p>}
          {mid.map((n) => <Card key={n.id} n={n} />)}
        </div>
      )}
    </div>
  );
};
