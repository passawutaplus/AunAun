import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { useCollabAgreement } from "@/hooks/useCollabAgreement";
import { COLLAB_REJECT_REASONS, type CollabRejectReasonId } from "@/lib/collabBrief";
import ChatSheet from "./ChatSheet";
import type { CollabCard } from "./chatFormat";
import { useCollabActions, useCollabRoom } from "./useCollab";
import type { ChatRoom } from "./useChatStore";
import "../styles/chat-tools.css";

const PlanSheet = lazy(() => import("./PlanSheet"));

type Room = Pick<ChatRoom, "id" | "other" | "kind" | "requestId">;
type Say = (t: string) => void;

const PeopleIcon = () => (
  <span aria-hidden="true" className="ch-doc-ic">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8.5" cy="9" r="3" />
      <circle cx="16" cy="9" r="3" />
      <path d="M3.5 19a5 5 0 0 1 10 0M11 19a5 5 0 0 1 9.5-1" />
    </svg>
  </span>
);

const err = (e: unknown) => (e instanceof Error && e.message ? e.message : "ทำไม่สำเร็จ ลองอีกครั้งนะ");

/**
 * Collab invite in a chat (old CollabInviteCard): how they want to work together, their words, the work it is about.
 * In its collab room the invited person answers here (ตกลงร่วมงาน / ยังไม่สะดวก); the one who invited can take it back.
 */
export function CollabInviteCard({ card, room, mine, say, onClose }: { card: CollabCard; room: Room; mine: boolean; say: Say; onClose?: () => void }) {
  const { requestId, state } = useCollabRoom(room);
  const collab = useCollabActions();
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState<CollabRejectReasonId>("busy_now");
  const [planOpen, setPlanOpen] = useState(false);

  const run = async (fn: () => Promise<void>, done: string) => {
    if (busy || !requestId) return;
    setBusy(true);
    try {
      await fn();
      say(done);
    } catch (e) {
      say(err(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="ch-docc ct-collab">
      <span className="ch-docc-top">
        <PeopleIcon />
        <span className="ch-wt">
          <span lang="en">Collab</span>
          <span>{mine ? `คุณชวน ${room.other.name} คอลแลป` : `${room.other.name} ชวนคุณคอลแลป`}</span>
          {card.type ? <span className="ch-cs">{card.type}</span> : null}
        </span>
      </span>
      {card.message ? <span className="ct-collab-msg">{card.message}</span> : null}
      {card.work ? (
        card.work.id ? (
          <Link to={`/showcase/${card.work.id}`} className="ct-collab-ref" onClick={onClose}>
            งานอ้างอิง · {card.work.title}
          </Link>
        ) : (
          <span className="ct-collab-ref">งานอ้างอิง · {card.work.title}</span>
        )
      ) : null}
      {state?.label ? (
        <span className="ch-docc-meta">
          <span className="ch-docc-st" data-tone={state.started ? "success" : state.canAnswer || state.canWithdraw ? "info" : "neutral"}>
            {state.label}
          </span>
        </span>
      ) : null}
      {state?.canAnswer ? (
        <span className="ct-collab-acts">
          <button type="button" className="ch-docc-btn" disabled={busy} onClick={() => void run(() => collab.accept(requestId!, room.id), "ตกลงแล้ว มาวางแผนกันเลย")}>
            ตกลงร่วมงาน
          </button>
          <button type="button" className="ct-line" disabled={busy} aria-haspopup="dialog" onClick={() => setDeclining(true)}>
            ยังไม่สะดวก
          </button>
        </span>
      ) : state?.canWithdraw ? (
        <button type="button" className="ct-line" disabled={busy} onClick={() => void run(() => collab.withdraw(requestId!, room.id), "ยกเลิกคำชวนแล้ว")}>
          ยกเลิกคำชวน
        </button>
      ) : state?.started ? (
        <button type="button" className="ch-docc-btn" aria-haspopup="dialog" onClick={() => setPlanOpen(true)}>
          ดูแผนคอลแลป
        </button>
      ) : null}

      {declining ? (
        <ChatSheet label={{ id: "ct-dc-h" }} onClose={() => setDeclining(false)}>
          <p id="ct-dc-h" className="cs-h">
            ยังไม่สะดวกเพราะ
          </p>
          <p className="cs-sub">เขาจะเห็นข้อความสุภาพในแชท คุยกันต่อได้ตามปกตินะ</p>
          <div className="cr-opts" role="radiogroup" aria-label="เหตุผล">
            {COLLAB_REJECT_REASONS.map((r) => (
              <label key={r.id} className="cr-opt" data-on={reason === r.id || undefined}>
                <input type="radio" name="ct-cdec" checked={reason === r.id} onChange={() => setReason(r.id)} />
                <span>{r.label}</span>
              </label>
            ))}
          </div>
          <div className="cs-acts">
            <button type="button" className="cs-cancel" onClick={() => setDeclining(false)}>
              กลับ
            </button>
            <button
              type="button"
              className="ct-go"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await collab.decline(requestId!, room.id, reason);
                  setDeclining(false);
                }, "ส่งคำตอบแล้ว")
              }
            >
              ส่งคำตอบ
            </button>
          </div>
        </ChatSheet>
      ) : null}
      {planOpen ? (
        <Suspense fallback={null}>
          <PlanSheet room={room} onClose={() => setPlanOpen(false)} say={say} />
        </Suspense>
      ) : null}
    </span>
  );
}

/** "🤝 แผนคอลแลป" posted when a plan is sent or changed: what it is and who confirmed; opens the plan. */
export function PlanCard({ room, say, compact = false }: { room: Room; say: Say; compact?: boolean }) {
  const plan = useCollabAgreement(room.id);
  const [open, setOpen] = useState(false);
  const word = plan.status === "agreed" ? "ตกลงกันแล้ว" : plan.status === "pending" ? `รอยืนยัน ${plan.ackCount}/${plan.memberIds.length || 2}` : "";
  const sheet = open ? (
    <Suspense fallback={null}>
      <PlanSheet room={room} onClose={() => setOpen(false)} say={say} />
    </Suspense>
  ) : null;
  if (compact)
    return (
      <>
        <button type="button" className="cd-bub cd-bub-link cd-doc" aria-haspopup="dialog" onClick={() => setOpen(true)}>
          {`แผนคอลแลป${plan.agreement.what ? ` · ${plan.agreement.what}` : ""}${word ? ` · ${word}` : ""}`}
        </button>
        {sheet}
      </>
    );
  return (
    <span className="ch-docc ct-collab">
      <span className="ch-docc-top">
        <PeopleIcon />
        <span className="ch-wt">
          <span lang="en">Collab plan</span>
          <span>{plan.agreement.what || "แผนคอลแลป"}</span>
        </span>
      </span>
      {word ? (
        <span className="ch-docc-meta">
          <span className="ch-docc-st" data-tone={plan.status === "agreed" ? "success" : "info"}>
            {word}
          </span>
        </span>
      ) : null}
      <button type="button" className="ch-docc-btn" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {plan.status === "pending" && !plan.myAcked ? "ดูและยืนยันแผน" : "ดูแผน"}
      </button>
      {sheet}
    </span>
  );
}

/** Top of a collab room: where the collab is, and the plan one tap away (old collab plan sidebar, short). */
export function CollabBar({ room, onPlan }: { room: Room; onPlan: () => void }) {
  const { state } = useCollabRoom(room);
  if (!state) return null;
  return (
    <div className="ct-bar" role="status">
      <span lang="en" className="ct-bar-k">
        Collab
      </span>
      <span className="ct-bar-t">{state.label}</span>
      {state.started ? (
        <button type="button" className="ct-bar-btn" aria-haspopup="dialog" onClick={onPlan}>
          แผนคอลแลป
        </button>
      ) : null}
    </div>
  );
}
