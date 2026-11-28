import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCollabAgreement } from "@/hooks/useCollabAgreement";
import { formatOfferDateShort } from "@/lib/chatOffer";
import { COLLAB_RIGHTS_PRESETS, rightsLabel, type CollabAgreement, type CollabRightsPreset } from "@/lib/collabAgreement";
import ChatSheet from "./ChatSheet";
import { useChatActions, type ChatRoom } from "./useChatStore";
import "../styles/chat-tools.css";

type Form = CollabAgreement & { delivText: string };
const toForm = (a: CollabAgreement): Form => ({ ...a, delivText: a.deliverables.join("\n") });

const lines = (s: string) =>
  s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 20);

/**
 * แผนคอลแลป (old CollabAgreementSheet, short): what we make, who does what, by when, credit and rights. Sending it
 * posts the plan card; each person confirms. Changing who does what or the rights asks everyone to confirm again
 * (useCollabAgreement, same rules and table as the old chat).
 */
export default function PlanSheet({ room, onClose, say }: { room: Pick<ChatRoom, "id" | "other">; onClose: () => void; say: (t: string) => void }) {
  const { user } = useAuth();
  const plan = useCollabAgreement(room.id);
  const chat = useChatActions();
  const a = plan.agreement;
  const [form, setForm] = useState<Form | null>(null);
  const [err, setErr] = useState("");
  // A plan nobody sent yet opens as the form.
  const editing: Form | null = form ?? (!plan.isLoading && !a.sentAt ? toForm(a) : null);
  const name = (id: string) => (id === user?.id ? "คุณ" : id === room.other.id ? room.other.name : "สมาชิก");
  // Me first, then the other person (and anyone else in an old group plan).
  const members = [...(plan.memberIds.length ? plan.memberIds : [user?.id ?? "", room.other.id].filter(Boolean))].sort((x, y) => Number(y === user?.id) - Number(x === user?.id));

  const startEdit = () => {
    setForm(toForm(a));
    setErr("");
  };
  const set = (patch: Partial<Form>) => setForm({ ...(editing ?? toForm(a)), ...patch });

  const save = async (send: boolean) => {
    const { delivText, ...rest } = editing ?? toForm(a);
    const next: CollabAgreement = { ...rest, deliverables: lines(delivText) };
    if (!next.what.trim()) {
      setErr("บอกก่อนนะว่าจะทำอะไรกัน");
      return;
    }
    setErr("");
    try {
      await plan.save({ ...next, what: next.what.trim().slice(0, 200) }, { send });
      // The plan card / the change note went in through the old hook: read the room again.
      chat.refreshRoom(room.id);
      setForm(null);
      say(send ? "ส่งแผนให้ยืนยันแล้ว" : "บันทึกแผนแล้ว");
      if (send || a.sentAt) onClose();
    } catch (e) {
      setErr(e instanceof Error && e.message ? e.message : "บันทึกไม่สำเร็จ ลองอีกครั้งนะ");
    }
  };
  const ack = async () => {
    setErr("");
    try {
      await plan.toggleAck();
      chat.refreshRoom(room.id);
      say(plan.myAcked ? "ถอนการยืนยันแล้ว" : "ยืนยันแผนแล้ว");
    } catch (e) {
      setErr(e instanceof Error && e.message ? e.message : "ทำไม่สำเร็จ ลองอีกครั้งนะ");
    }
  };

  const stateWord = plan.status === "agreed" ? "ตกลงกันแล้ว" : plan.status === "pending" ? `รอยืนยัน ${plan.ackCount}/${members.length}` : "ยังไม่ได้ส่งให้ยืนยัน";

  return (
    <ChatSheet label={{ id: "ct-p-h" }} onClose={onClose} wide>
      <div className="cs-doc-hd">
        <div>
          <p id="ct-p-h" className="cs-h">
            แผนคอลแลป
          </p>
          <p className="cs-sub">
            กับ {room.other.name} · {plan.isLoading ? "กำลังโหลด…" : stateWord}
          </p>
        </div>
        <button type="button" className="cs-x" aria-label="ปิด" title="ปิด" onClick={onClose}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {plan.isLoading ? (
        <p className="cs-state" role="status">
          กำลังโหลด…
        </p>
      ) : editing ? (
        <div className="ct-form">
          <label className="ct-f">
            <span>จะทำอะไรกัน</span>
            <input value={editing.what} maxLength={200} onChange={(e) => set({ what: e.target.value })} placeholder="เช่น ซีนร่วมกัน 1 เล่ม" />
          </label>
          <fieldset className="ct-f">
            <legend>ใครทำอะไร</legend>
            {members.map((id) => (
              <label key={id} className="ct-role">
                <span>{name(id)}</span>
                <input value={editing.roles[id] ?? ""} maxLength={200} onChange={(e) => set({ roles: { ...editing.roles, [id]: e.target.value } })} placeholder="เช่น ภาพประกอบ" />
              </label>
            ))}
          </fieldset>
          <label className="ct-f">
            <span>บรีฟ (ถ้ามี)</span>
            <textarea rows={3} maxLength={2000} value={editing.brief} onChange={(e) => set({ brief: e.target.value })} />
          </label>
          <div className="ct-two">
            <label className="ct-f">
              <span>เสร็จภายใน (ถ้ามี)</span>
              <input type="date" value={editing.dueAt ?? ""} onChange={(e) => set({ dueAt: e.target.value || null })} />
            </label>
            <label className="ct-f">
              <span>ชิ้นงานที่จะส่ง (บรรทัดละชิ้น)</span>
              <textarea rows={2} maxLength={1000} value={editing.delivText} onChange={(e) => set({ delivText: e.target.value })} />
            </label>
          </div>
          <fieldset className="ct-f">
            <legend>เครดิตและสิทธิ์</legend>
            <div className="cr-opts" role="radiogroup" aria-label="เครดิตและสิทธิ์">
              {COLLAB_RIGHTS_PRESETS.map((p) => (
                <label key={p.id} className="cr-opt" data-on={editing.rightsPreset === p.id || undefined}>
                  <input type="radio" name="ct-rights" checked={editing.rightsPreset === p.id} onChange={() => set({ rightsPreset: p.id as CollabRightsPreset })} />
                  <span>{p.label}</span>
                </label>
              ))}
            </div>
            {editing.rightsPreset === "custom" ? (
              <input aria-label="เครดิตและสิทธิ์แบบกำหนดเอง" value={editing.rightsNote} maxLength={300} onChange={(e) => set({ rightsNote: e.target.value })} />
            ) : null}
          </fieldset>
          <label className="ct-f">
            <span>โน้ต (ถ้ามี)</span>
            <textarea rows={2} maxLength={1000} value={editing.note} onChange={(e) => set({ note: e.target.value })} />
          </label>
          {a.sentAt ? <p className="ct-note">เปลี่ยนใครทำอะไร หรือเครดิต ทุกคนต้องยืนยันใหม่นะ</p> : null}
        </div>
      ) : (
        <div className="ct-plan">
          <dl>
            <dt>จะทำอะไรกัน</dt>
            <dd>{a.what || "—"}</dd>
            <dt>ใครทำอะไร</dt>
            <dd>
              {members.map((id) => (
                <span key={id} className="ct-plan-role">
                  <b>{name(id)}</b> {a.roles[id]?.trim() || "—"}
                </span>
              ))}
            </dd>
            {a.brief ? (
              <>
                <dt>บรีฟ</dt>
                <dd className="ct-pre">{a.brief}</dd>
              </>
            ) : null}
            {a.dueAt ? (
              <>
                <dt>เสร็จภายใน</dt>
                <dd>{formatOfferDateShort(a.dueAt)}</dd>
              </>
            ) : null}
            {a.deliverables.length ? (
              <>
                <dt>ชิ้นงานที่จะส่ง</dt>
                <dd>{a.deliverables.join(" · ")}</dd>
              </>
            ) : null}
            <dt>เครดิตและสิทธิ์</dt>
            <dd>{rightsLabel(a)}</dd>
            {a.note ? (
              <>
                <dt>โน้ต</dt>
                <dd className="ct-pre">{a.note}</dd>
              </>
            ) : null}
          </dl>
          <p className="ct-acks">
            {members.map((id) => (
              <span key={id} data-on={plan.acks[id] ? "" : undefined}>
                {plan.acks[id] ? "✓ " : ""}
                {name(id)}
              </span>
            ))}
          </p>
        </div>
      )}

      {err ? (
        <p role="alert" className="ct-err">
          {err}
        </p>
      ) : null}
      {plan.isLoading ? null : editing ? (
        <div className="cs-acts ct-acts">
          {a.sentAt ? (
            <button type="button" className="cs-cancel" onClick={() => setForm(null)}>
              ยกเลิก
            </button>
          ) : (
            <button type="button" className="cs-cancel" disabled={plan.busy} onClick={() => void save(false)}>
              บันทึกไว้ก่อน
            </button>
          )}
          <button type="button" className="ct-go" disabled={plan.busy} onClick={() => void save(!a.sentAt)}>
            {plan.busy ? "กำลังบันทึก…" : a.sentAt ? "บันทึก" : "ส่งให้ยืนยัน"}
          </button>
        </div>
      ) : (
        <div className="cs-acts ct-acts">
          <button type="button" className="cs-cancel" onClick={startEdit}>
            แก้แผน
          </button>
          <button type="button" className="ct-go" disabled={plan.busy} onClick={() => void ack()}>
            {plan.myAcked ? "ถอนการยืนยัน" : "ยืนยันแผนนี้"}
          </button>
        </div>
      )}
    </ChatSheet>
  );
}
