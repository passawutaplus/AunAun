import { ClipboardList, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatCardShell, ChatCardStatus } from "@/components/chat/ChatCardShell";
import { COLLAB_PIPELINE, COLLAB_PLAN_DOC_PREFIX, COLLAB_ALIGN_DISCUSSION_TOPICS } from "@/lib/collabToolkit";

type Props = {
  content: string;
  onOpenPlan: () => void;
};

/** Document-style collab plan card (parallel to hire quotation cards). */
export function CollabPlanDocCard({ content, onOpenPlan }: Props) {
  const lines = content
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const subject =
    lines.find((l) => l.startsWith("เรื่อง:"))?.replace(/^เรื่อง:\s*/, "") || "คอลแลป";
  const statusLine =
    lines.find((l) => l.startsWith("สถานะ:"))?.replace(/^สถานะ:\s*/, "") ||
    "ตอบรับแล้ว — เริ่มวางแผนร่วมกัน";

  return (
    <ChatCardShell
      tone="collab"
      icon={FileText}
      title="เอกสารแผนคอลแลป"
      meta="แนวทางร่วม"
      className="min-w-[16rem] max-w-[22rem]"
      footer={
        <div className="space-y-2">
          <Button
            type="button"
            size="sm"
            className="w-full rounded-full bg-[hsl(var(--chat-collab))] text-white hover:opacity-90"
            onClick={onOpenPlan}
          >
            <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
            เปิดเอกสารแผนงาน
          </Button>
          <ChatCardStatus>
            คุยตามหัวข้อในแชท แล้วสรุปใส่เอกสารแผน · ทุกคนต้องติ๊กยืนยันครบก่อนไปขั้นถัดไป
          </ChatCardStatus>
        </div>
      }
    >
      <div className="space-y-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">เรื่อง</p>
          <p className="text-sm font-medium text-foreground leading-snug">{subject}</p>
        </div>
        <p className="text-[11px] text-[hsl(var(--chat-collab))] leading-snug">{statusLine}</p>
        <div className="rounded-xl border border-border/70 bg-muted/30 px-2.5 py-2 space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground">เริ่มจากอะไร → ไล่ตามนี้</p>
          <ol className="space-y-1">
            {COLLAB_PIPELINE.map((s) => (
              <li key={s.id} className="text-[11px] text-foreground leading-snug flex gap-2">
                <span className="tabular-nums text-muted-foreground shrink-0 w-3">{s.step}.</span>
                <span>
                  <span className="font-medium">{s.title}</span>
                  <span className="text-muted-foreground"> — {s.summary}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-xl border border-border/70 bg-muted/20 px-2.5 py-2 space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground">เริ่มคุยจากหัวข้อเหล่านี้</p>
          <ol className="space-y-1">
            {COLLAB_ALIGN_DISCUSSION_TOPICS.map((topic, i) => (
              <li key={topic} className="text-[11px] text-foreground leading-snug flex gap-2">
                <span className="tabular-nums text-[hsl(var(--chat-collab))] shrink-0 w-3 font-medium">
                  {i + 1}.
                </span>
                <span>{topic}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </ChatCardShell>
  );
}

export function looksLikeCollabPlanDoc(content: string | null | undefined): boolean {
  return !!content?.trim().startsWith(COLLAB_PLAN_DOC_PREFIX);
}
