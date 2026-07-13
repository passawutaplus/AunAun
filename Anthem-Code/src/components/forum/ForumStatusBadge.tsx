import { Link } from "react-router-dom";
import { FORUM_STATUS_LABELS, FORUM_STATUS_TONES, type ForumTopicStatus } from "@/lib/forum";
import { cn } from "@/lib/utils";

export function ForumStatusBadge({ status, className }: { status: ForumTopicStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        FORUM_STATUS_TONES[status] ?? FORUM_STATUS_TONES.open,
        className,
      )}
    >
      {FORUM_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function ForumGuidelinesCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <h3 className="text-sm font-semibold text-foreground">แนวทางชุมชน</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">
        ค้นหาก่อนโพสต์ เลือกหมวดให้ถูก เคารพผู้อื่น และอย่าเปิดเผยข้อมูลส่วนตัวหรือบัญชี
      </p>
      <Link to="/legal/community" className="text-xs font-medium text-primary hover:underline">
        อ่านแนวทางฉบับเต็ม
      </Link>
    </div>
  );
}
