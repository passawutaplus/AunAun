import { Check, Lock, MessageCircle, PencilLine, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatCardShell, ChatCardStatus } from "@/components/chat/ChatCardShell";
import {
  COLLAB_CHANGE_DONE_PREFIX,
  COLLAB_CHANGE_REQ_PREFIX,
  COLLAB_STEP_LOCKED_PREFIX,
  COLLAB_ALIGN_DISCUSSION_TOPICS,
  parseChangeRequestMessage,
} from "@/lib/collabPlanDoc";

type ChangeReqProps = {
  content: string;
  mine: boolean;
  alreadyApproved?: boolean;
  busy?: boolean;
  onApprove?: () => void;
  onOpenPlan?: () => void;
};

export function CollabChangeRequestCard({
  content,
  mine,
  alreadyApproved,
  busy,
  onApprove,
  onOpenPlan,
}: ChangeReqProps) {
  const parsed = parseChangeRequestMessage(content);
  return (
    <ChatCardShell
      tone="collab"
      icon={Unlock}
      title="ขออนุญาตแก้ไขแผน"
      meta={parsed?.stepLabel || undefined}
      className="min-w-[16rem] max-w-[22rem]"
      footer={
        <div className="space-y-2">
          {!mine && onApprove && !alreadyApproved ? (
            <Button
              type="button"
              size="sm"
              className="w-full rounded-full bg-[hsl(var(--chat-collab))] text-white hover:opacity-90"
              disabled={busy}
              onClick={onApprove}
            >
              อนุมัติให้แก้ไข
            </Button>
          ) : null}
          {alreadyApproved ? (
            <ChatCardStatus>คุณอนุมัติแล้ว — รอคนอื่น</ChatCardStatus>
          ) : null}
          {onOpenPlan ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full rounded-full"
              onClick={onOpenPlan}
            >
              เปิดเอกสารแผน
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-1.5 text-sm">
        {parsed?.stepLabel ? (
          <p>
            <span className="text-muted-foreground text-[11px]">ขั้น </span>
            {parsed.stepLabel}
          </p>
        ) : null}
        {parsed?.reason ? (
          <p className="text-foreground leading-snug whitespace-pre-wrap">{parsed.reason}</p>
        ) : (
          <p className="text-muted-foreground text-xs">ไม่ได้ระบุเหตุผล</p>
        )}
        <p className="text-[11px] text-muted-foreground leading-snug">
          ทุกคนในแชทต้องกดอนุมัติ จึงจะแก้แผนได้
        </p>
      </div>
    </ChatCardShell>
  );
}

export function CollabChangeDoneCard({
  content,
  onOpenPlan,
}: {
  content: string;
  onOpenPlan?: () => void;
}) {
  const step =
    content
      .split("\n")
      .find((l) => l.startsWith("ขั้น:"))
      ?.replace("ขั้น:", "")
      .trim() || "";
  return (
    <ChatCardShell
      tone="collab"
      icon={PencilLine}
      title="มีการแก้ไขแผน"
      meta={step || undefined}
      className="min-w-[16rem] max-w-[22rem]"
      footer={
        onOpenPlan ? (
          <Button
            type="button"
            size="sm"
            className="w-full rounded-full bg-[hsl(var(--chat-collab))] text-white hover:opacity-90"
            onClick={onOpenPlan}
          >
            เปิดดูแผนที่แก้
          </Button>
        ) : (
          <ChatCardStatus>สมาชิกควรตรวจและยืนยันขั้นนี้อีกครั้ง</ChatCardStatus>
        )
      }
    >
      <p className="text-sm leading-snug text-foreground">
        แผนถูกแก้ไขแล้ว — ควรตรวจรายละเอียดแล้วติ๊ก「ขั้นนี้ตกลงแล้ว」ใหม่
      </p>
    </ChatCardShell>
  );
}

export function CollabStepLockedCard({
  content,
  onOpenPlan,
}: {
  content: string;
  onOpenPlan?: () => void;
}) {
  const line =
    content
      .split("\n")
      .find((l) => l.includes("ยืนยันครบ"))
      ?.trim() || "ยืนยันครบทุกคนแล้ว";
  return (
    <ChatCardShell
      tone="success"
      icon={Lock}
      title="ยืนยันแผนครบแล้ว"
      className="min-w-[16rem] max-w-[22rem]"
      footer={
        <div className="space-y-2">
          {onOpenPlan ? (
            <Button
              type="button"
              size="sm"
              className="w-full rounded-full"
              onClick={onOpenPlan}
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              เปิดแผน / ไปขั้นถัดไป
            </Button>
          ) : null}
          <ChatCardStatus>แก้รายละเอียดต่อต้องขออนุญาตจากทุกคน</ChatCardStatus>
        </div>
      }
    >
      <p className="text-sm leading-snug">{line}</p>
    </ChatCardShell>
  );
}

export function looksLikeCollabChangeRequest(content: string | null | undefined): boolean {
  return !!content?.trim().startsWith(COLLAB_CHANGE_REQ_PREFIX);
}

export function looksLikeCollabChangeDone(content: string | null | undefined): boolean {
  return !!content?.trim().startsWith(COLLAB_CHANGE_DONE_PREFIX);
}

export function looksLikeCollabStepLocked(content: string | null | undefined): boolean {
  return !!content?.trim().startsWith(COLLAB_STEP_LOCKED_PREFIX);
}

const DISCUSSION_TOPICS = COLLAB_ALIGN_DISCUSSION_TOPICS;

/** Kickoff card — only when sent explicitly from plan popup. */
export function CollabDiscussionTemplateCard({
  onOpenPlan,
}: {
  onOpenPlan?: () => void;
}) {
  return (
    <ChatCardShell
      tone="collab"
      icon={MessageCircle}
      title="เทมเพลตเริ่มคุย"
      meta="จัดแนวทาง"
      className="min-w-[16rem] max-w-[22rem]"
      footer={
        <div className="space-y-2">
          {onOpenPlan ? (
            <Button
              type="button"
              size="sm"
              className="w-full rounded-full bg-[hsl(var(--chat-collab))] text-white hover:opacity-90"
              onClick={onOpenPlan}
            >
              เปิดเอกสารแผนงาน
            </Button>
          ) : null}
          <ChatCardStatus>คุยตามหัวข้อในแชท แล้วสรุปใส่เอกสารแผน</ChatCardStatus>
        </div>
      }
    >
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground leading-snug">
          เริ่มคุยจากหัวข้อเหล่านี้ได้เลย
        </p>
        <ol className="space-y-1.5">
          {DISCUSSION_TOPICS.map((topic, i) => (
            <li key={topic} className="text-[12px] text-foreground leading-snug flex gap-2">
              <span className="tabular-nums text-[hsl(var(--chat-collab))] shrink-0 w-4 font-medium">
                {i + 1}.
              </span>
              <span>{topic}</span>
            </li>
          ))}
        </ol>
      </div>
    </ChatCardShell>
  );
}
