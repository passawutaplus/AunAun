import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { sharedDb, supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCollabPlan } from "@/hooks/useCollabPlan";
import { useSendMessage } from "@/hooks/useChat";
import {
  COLLAB_AGREEMENT_PREFIX,
  agreementFromPayload,
  agreementStatus,
  diffAgreement,
  payloadWithAgreement,
  type CollabAgreement,
} from "@/lib/collabAgreement";

/**
 * Short collab plan on top of the collab_plans row (same table as the old pipeline).
 * Sending posts a card in chat; everyone confirms from the card. Changing roles / rights
 * resets confirmations, other edits just leave a note in the chat.
 */
export function useCollabAgreement(conversationId: string | undefined, enabled = true) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const plan = useCollabPlan(conversationId, enabled);
  const sendMessage = useSendMessage();
  const [busy, setBusy] = useState(false);

  const { doc, memberIds, planPersisted } = plan;
  const acks = useMemo(() => doc.acks.align ?? {}, [doc.acks]);
  const agreement = useMemo(
    () => agreementFromPayload(doc.payload, Object.keys(acks).length > 0),
    [doc.payload, acks],
  );
  const status = agreementStatus(doc, memberIds, agreement);
  const myAcked = !!(user?.id && acks[user.id]);
  // "ปิดคอลแลป (เสร็จแล้ว)" confirmations reuse the old pipeline's publish slot.
  const closeAcks = useMemo(() => doc.acks.publish ?? {}, [doc.acks]);
  const closeCount = memberIds.filter((id) => closeAcks[id]).length;
  const closed = memberIds.length > 0 && closeCount === memberIds.length;
  const myClosed = !!(user?.id && closeAcks[user.id]);
  const ackCount = memberIds.filter((id) => acks[id]).length;

  const invalidate = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["collab-plan-doc", conversationId] });
    await qc.invalidateQueries({ queryKey: ["collab-plan-versions", conversationId] });
    await qc.invalidateQueries({ queryKey: ["collab-agreement-latest-card", conversationId] });
  }, [qc, conversationId]);

  const write = useCallback(
    async (next: CollabAgreement, nextAcks: Record<string, string>, bumpVersion: boolean) => {
      if (!conversationId || !user?.id) return;
      const complete = memberIds.length > 0 && memberIds.every((id) => nextAcks[id]);
      const version = planPersisted ? (doc.version || 1) + (bumpVersion ? 1 : 0) : 1;
      const payload = payloadWithAgreement(doc.payload, next);
      const { error } = await sharedDb.from("collab_plans" as never).upsert(
        {
          conversation_id: conversationId,
          status: complete ? "step_locked" : "draft",
          current_step: "align",
          payload,
          acks: { ...doc.acks, align: nextAcks },
          version,
          stages: {},
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "conversation_id" },
      );
      if (error) throw error;
      if (bumpVersion) {
        // History is best effort — older databases may not have the table.
        await sharedDb
          .from("collab_plan_versions" as never)
          .upsert(
            {
              conversation_id: conversationId,
              version,
              payload,
              current_step: "align",
              status: complete ? "step_locked" : "draft",
              acks: { ...doc.acks, align: nextAcks },
              saved_by: user.id,
              saved_at: new Date().toISOString(),
            } as never,
            { onConflict: "conversation_id,version" },
          )
          .then(() => undefined, () => undefined);
      }
      return complete;
    },
    [conversationId, user?.id, memberIds, planPersisted, doc],
  );

  const system = useCallback(
    (content: string) => {
      if (!conversationId) return;
      sendMessage.mutate({ conversationId, content, messageType: "system" });
    },
    [conversationId, sendMessage],
  );

  /** Save edits. `send` = first "ส่งให้ยืนยัน" (posts the card and seeds tasks from roles). */
  const save = useCallback(
    async (next: CollabAgreement, opts: { send?: boolean; actorName?: string } = {}) => {
      if (!conversationId || !user?.id) return;
      setBusy(true);
      try {
        const now = new Date().toISOString();
        const me = { [user.id]: now };
        const first = !agreement.sentAt;

        if (opts.send || first) {
          if (!opts.send) {
            await write({ ...next, sentAt: null }, acks, true);
            return;
          }
          await write({ ...next, sentAt: now }, me, true);
          await sendMessage.mutateAsync({ conversationId, content: COLLAB_AGREEMENT_PREFIX });
          const rows = Object.entries(next.roles)
            .filter(([, v]) => v.trim())
            .map(([uid, v], i) => ({
              conversation_id: conversationId,
              title: v.trim().slice(0, 200),
              assignee_id: uid,
              position: Date.now() / 1000 + i,
            }));
          if (rows.length) {
            await (supabase as unknown as { from: (t: string) => { insert: (r: unknown) => Promise<unknown> } })
              .from("collab_tasks")
              .insert(rows);
            void qc.invalidateQueries({ queryKey: ["collab-tasks", conversationId] });
          }
          return;
        }

        const d = diffAgreement(agreement, next);
        if (!d.changed.length) return;
        if (d.needsReconfirm) {
          await write({ ...next, sentAt: agreement.sentAt }, me, true);
          system(`${opts.actorName ?? "มีคน"} แก้${d.labels.join(", ")} — ทุกคนต้องยืนยันแผนใหม่`);
          await sendMessage.mutateAsync({ conversationId, content: COLLAB_AGREEMENT_PREFIX });
        } else {
          await write({ ...next, sentAt: agreement.sentAt }, acks, true);
          system(`${opts.actorName ?? "มีคน"} แก้แผน: ${d.labels.join(", ")}`);
        }
      } finally {
        setBusy(false);
        await invalidate();
      }
    },
    [conversationId, user?.id, agreement, acks, write, sendMessage, system, qc, invalidate],
  );

  const toggleAck = useCallback(
    async (actorName?: string) => {
      if (!conversationId || !user?.id || !agreement.sentAt) return;
      setBusy(true);
      try {
        const next = { ...acks };
        if (next[user.id]) delete next[user.id];
        else next[user.id] = new Date().toISOString();
        const complete = await write(agreement, next, false);
        if (complete) system("ทุกคนตกลงแผนคอลแลปแล้ว ✓");
        else if (!next[user.id]) system(`${actorName ?? "มีคน"} ยกเลิกการตกลงแผน`);
      } finally {
        setBusy(false);
        await invalidate();
      }
    },
    [conversationId, user?.id, agreement, acks, write, system, invalidate],
  );

  /** Toggle my "งานเสร็จแล้ว ปิดคอลแลป" vote; when everyone agrees the collab request is marked completed. */
  const toggleClose = useCallback(
    async (actorName?: string) => {
      if (!conversationId || !user?.id) return;
      setBusy(true);
      try {
        const next = { ...closeAcks };
        if (next[user.id]) delete next[user.id];
        else next[user.id] = new Date().toISOString();
        const { error } = await sharedDb.from("collab_plans" as never).upsert(
          {
            conversation_id: conversationId,
            status: doc.status,
            current_step: "align",
            payload: payloadWithAgreement(doc.payload, agreement),
            acks: { ...doc.acks, publish: next },
            version: planPersisted ? doc.version || 1 : 1,
            stages: {},
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          } as never,
          { onConflict: "conversation_id" },
        );
        if (error) throw error;
        const all = memberIds.length > 0 && memberIds.every((id) => next[id]);
        if (all) {
          const { data: conv } = await sharedDb.from("conversations").select("request_id").eq("id", conversationId).maybeSingle();
          const requestId = (conv as { request_id?: string | null } | null)?.request_id;
          if (requestId) {
            await supabase.from("collab_requests").update({ status: "completed" } as never).eq("id", requestId);
          }
          system("ปิดคอลแลปแล้ว — งานเสร็จเรียบร้อย ขอบคุณที่ร่วมงานกัน");
        } else if (next[user.id]) {
          system(`${actorName ?? "มีคน"} ขอปิดคอลแลป (งานเสร็จแล้ว) — กดยืนยันในแผนคอลแลป`);
        }
      } finally {
        setBusy(false);
        await invalidate();
      }
    },
    [conversationId, user?.id, closeAcks, doc, agreement, planPersisted, memberIds, system, invalidate],
  );

  return {
    agreement,
    closeCount,
    closed,
    myClosed,
    toggleClose,
    status,
    memberIds,
    acks,
    ackCount,
    myAcked,
    busy,
    isLoading: plan.isLoading,
    versions: plan.versions,
    save,
    toggleAck,
  };
}
