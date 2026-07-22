import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sharedDb, supabase } from "@/integrations/supabase/client";
import {
  buildCollabEndDeadlines,
  canEditCollabEndRequest,
  isCollabEndApprovedStatus,
  isCollabEndInstantExit,
  isCollabEndOpenStatus,
  type CollabEndCreditMode,
  type CollabEndCreditOutcome,
  type CollabEndEventRow,
  type CollabEndHandoffTerms,
  type CollabEndRequestRow,
  type CollabEndTier,
} from "@/lib/collabEndRequest";

async function appendEvent(input: {
  endRequestId: string;
  actorId: string | null;
  eventType: string;
  snapshot: Record<string, unknown>;
  diffSummary?: string | null;
}) {
  const { error } = await sharedDb.from("collab_end_request_events" as never).insert({
    end_request_id: input.endRequestId,
    actor_id: input.actorId,
    event_type: input.eventType,
    snapshot: input.snapshot,
    diff_summary: input.diffSummary ?? null,
  } as never);
  if (error) throw error;
}

async function notifyOther(input: {
  toUserId: string | null | undefined;
  title: string;
  body: string;
  link: string;
  endId: string;
  collabId: string;
}) {
  if (!input.toUserId) return;
  try {
    await supabase.rpc("notify_collab_end_event" as never, {
      p_to_user_id: input.toUserId,
      p_title: input.title,
      p_body: input.body,
      p_link: input.link,
      p_end_id: input.endId,
      p_collab_id: input.collabId,
    } as never);
  } catch {
    /* best-effort */
  }
}

async function markCollabCancelled(
  collabRequestId: string,
  reasonId: string | null,
  note: string | null,
) {
  const { error } = await supabase
    .from("collab_requests")
    .update({
      status: "cancelled",
      cancel_reason: reasonId,
      cancel_note: note,
    } as never)
    .eq("id", collabRequestId);
  if (error) throw error;
}

async function logPlanEnded(conversationId: string, actorId: string | null, detail: Record<string, unknown>) {
  try {
    await sharedDb.from("collab_plan_activity_log" as never).insert({
      conversation_id: conversationId,
      actor_id: actorId,
      action: "collab_ended",
      detail,
    } as never);
  } catch {
    /* optional */
  }
}

async function applyCollabEndApproved(input: {
  row: CollabEndRequestRow;
  actorId: string | null;
  instant?: boolean;
  responseCreditOutcome?: CollabEndCreditOutcome | null;
  responseCreditNote?: string | null;
}): Promise<CollabEndRequestRow> {
  const now = new Date().toISOString();
  const instant = !!input.instant;
  const creditRequested = input.row.credit_mode === "credit_requested";
  let creditOutcome: CollabEndCreditOutcome | null = input.responseCreditOutcome ?? null;
  let creditNote = input.responseCreditNote?.trim() || null;

  if (instant) {
    creditOutcome = null;
    creditNote = null;
  } else if (creditRequested && !creditOutcome) {
    creditOutcome = "deny_credit";
  }

  const { data, error } = await sharedDb
    .from("collab_end_requests" as never)
    .update({
      status: "approved",
      responder_id: instant ? null : input.actorId,
      responded_at: now,
      response_credit_outcome: creditOutcome,
      response_credit_note: creditNote,
      updated_at: now,
    } as never)
    .eq("id", input.row.id)
    .eq("status", "pending")
    .select("*")
    .single();
  if (error) throw error;
  const updated = data as CollabEndRequestRow;

  await markCollabCancelled(
    updated.collab_request_id,
    updated.reason_id,
    updated.reason_note,
  );
  await logPlanEnded(updated.conversation_id, input.actorId, {
    end_request_id: updated.id,
    handoff_terms: updated.handoff_terms,
    plan_step: updated.plan_step,
    credit_mode: updated.credit_mode,
    credit_request_text: updated.credit_request_text,
    portfolio_requested: updated.portfolio_requested,
    style_requested: updated.style_requested,
    response_credit_outcome: updated.response_credit_outcome,
    response_credit_note: updated.response_credit_note,
    plan_rights_snapshot: updated.plan_rights_snapshot,
    progress_count_initiator: updated.progress_count_initiator,
    instant_exit: instant,
  });

  return updated;
}

export function useActiveCollabEndRequest(collabRequestId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["collab-end-active", collabRequestId],
    enabled: !!collabRequestId,
    queryFn: async () => {
      try {
        await supabase.rpc("finalize_expired_collab_end_requests" as never);
      } catch {
        /* ignore */
      }
      const { data, error } = await sharedDb
        .from("collab_end_requests" as never)
        .select("*")
        .eq("collab_request_id", collabRequestId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        const code = (error as { code?: string }).code;
        if (code === "42P01" || code === "PGRST205") return null;
        throw error;
      }
      return (data as CollabEndRequestRow | null) ?? null;
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!collabRequestId) return;
    const ch = supabase
      .channel(`collab-end-${collabRequestId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "shared",
          table: "collab_end_requests",
          filter: `collab_request_id=eq.${collabRequestId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["collab-end-active", collabRequestId] });
          void qc.invalidateQueries({ queryKey: ["collab-end-history", collabRequestId] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [collabRequestId, qc]);

  return query;
}

export function useCollabEndById(endRequestId: string | undefined) {
  return useQuery({
    queryKey: ["collab-end-by-id", endRequestId],
    enabled: !!endRequestId,
    queryFn: async () => {
      const { data, error } = await sharedDb
        .from("collab_end_requests" as never)
        .select("*")
        .eq("id", endRequestId!)
        .maybeSingle();
      if (error) throw error;
      return (data as CollabEndRequestRow | null) ?? null;
    },
  });
}

export function useCollabEndHistory(collabRequestId: string | undefined) {
  return useQuery({
    queryKey: ["collab-end-history", collabRequestId],
    enabled: !!collabRequestId,
    queryFn: async () => {
      const { data: reqs, error: reqErr } = await sharedDb
        .from("collab_end_requests" as never)
        .select("id")
        .eq("collab_request_id", collabRequestId!)
        .order("created_at", { ascending: false });
      if (reqErr) throw reqErr;
      const ids = (reqs ?? []).map((r) => (r as { id: string }).id);
      if (!ids.length) return [] as CollabEndEventRow[];
      const { data, error } = await sharedDb
        .from("collab_end_request_events" as never)
        .select("*")
        .in("end_request_id", ids)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CollabEndEventRow[];
    },
  });
}

export function useSubmitCollabEndRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      collabRequestId: string;
      conversationId: string;
      initiatorId: string;
      otherUserId: string;
      tier: CollabEndTier;
      reasonId: string;
      reasonNote?: string | null;
      planStep?: string | null;
      planRightsSnapshot?: string | null;
      progressCountInitiator?: number | null;
    }) => {
      const deadlines = buildCollabEndDeadlines();
      const creditMode: CollabEndCreditMode = "no_credit";
      const handoffTerms: CollabEndHandoffTerms = "joint_archive";
      const instantExit = true;

      const { data, error } = await sharedDb
        .from("collab_end_requests" as never)
        .insert({
          collab_request_id: input.collabRequestId,
          conversation_id: input.conversationId,
          initiator_id: input.initiatorId,
          status: "pending",
          tier: input.tier,
          handoff_terms: handoffTerms,
          reason_id: input.reasonId,
          reason_note: input.reasonNote?.trim() || null,
          plan_step: input.planStep ?? null,
          credit_mode: creditMode,
          credit_request_text: null,
          portfolio_requested: false,
          style_requested: false,
          plan_rights_snapshot: input.planRightsSnapshot?.trim() || null,
          progress_count_initiator:
            typeof input.progressCountInitiator === "number"
              ? input.progressCountInitiator
              : null,
          first_submitted_at: deadlines.first_submitted_at,
          edit_until_at: deadlines.edit_until_at,
          respond_deadline_at: deadlines.respond_deadline_at,
        } as never)
        .select("*")
        .single();
      if (error) throw error;
      let row = data as CollabEndRequestRow;

      row = await applyCollabEndApproved({
        row,
        actorId: input.initiatorId,
        instant: true,
      });
      await appendEvent({
        endRequestId: row.id,
        actorId: input.initiatorId,
        eventType: "accepted",
        snapshot: {
          status: "approved",
          handoff_terms: row.handoff_terms,
          instant_exit: true,
          waived_rights: true,
        },
        diffSummary: "ถอนตัว — สละสิทธิ์และเครดิตทั้งหมด",
      });
      await notifyOther({
        toUserId: input.otherUserId,
        title: "อีกฝ่ายถอนตัวจากคอลแลป",
        body: "สละสิทธิ์และเครดิตแล้ว — คุณทำต่อได้ · ให้เครดิตได้ตามต้องการ (ไม่บังคับ)",
        link: `/chat/${input.conversationId}`,
        endId: row.id,
        collabId: input.collabRequestId,
      });
      return { row, instant: true as const };
    },
    onSuccess: (result, vars) => {
      void qc.invalidateQueries({ queryKey: ["collab-end-active", vars.collabRequestId] });
      void qc.invalidateQueries({ queryKey: ["collab-end-history", vars.collabRequestId] });
      void qc.invalidateQueries({ queryKey: ["collab-requests"] });
      void qc.invalidateQueries({ queryKey: ["chat-collab-meta", vars.collabRequestId] });
      void qc.invalidateQueries({ queryKey: ["collab-plan-log", vars.conversationId] });
    },
  });
}

export function useEditCollabEndRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      row: CollabEndRequestRow;
      userId: string;
      reasonId: string;
      reasonNote?: string | null;
      otherUserId: string;
      planRightsSnapshot?: string | null;
      progressCountInitiator?: number | null;
    }) => {
      if (!canEditCollabEndRequest(input.row, input.userId)) {
        throw new Error("หมดเวลาแก้ไขหรือถอนคำขอแล้ว (24 ชั่วโมงแรกเท่านั้น)");
      }
      const { data, error } = await sharedDb
        .from("collab_end_requests" as never)
        .update({
          reason_id: input.reasonId,
          reason_note: input.reasonNote?.trim() || null,
          handoff_terms: "joint_archive" as CollabEndHandoffTerms,
          credit_mode: "no_credit" as CollabEndCreditMode,
          credit_request_text: null,
          portfolio_requested: false,
          style_requested: false,
          plan_rights_snapshot: input.planRightsSnapshot?.trim() || null,
          progress_count_initiator:
            typeof input.progressCountInitiator === "number"
              ? input.progressCountInitiator
              : null,
          last_edited_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", input.row.id)
        .eq("status", "pending")
        .select("*")
        .single();
      if (error) throw error;
      const updated = data as CollabEndRequestRow;
      await appendEvent({
        endRequestId: updated.id,
        actorId: input.userId,
        eventType: "edited",
        snapshot: {
          handoff_terms: updated.handoff_terms,
          reason_id: updated.reason_id,
        },
        diffSummary: "แก้ไขเหตุผลถอนตัว",
      });
      await notifyOther({
        toUserId: input.otherUserId,
        title: "มีการแก้ไขเหตุผลถอนตัว",
        body: "อีกฝ่ายแก้ไขเหตุผลที่แจ้งตอนถอนตัว",
        link: `/chat/${updated.conversation_id}`,
        endId: updated.id,
        collabId: updated.collab_request_id,
      });
      return updated;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["collab-end-active", row.collab_request_id] });
      void qc.invalidateQueries({ queryKey: ["collab-end-history", row.collab_request_id] });
    },
  });
}

export function useWithdrawCollabEndRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      row: CollabEndRequestRow;
      userId: string;
      otherUserId: string;
    }) => {
      if (!canEditCollabEndRequest(input.row, input.userId)) {
        throw new Error("หมดเวลาถอนคำขอแล้ว");
      }
      const { data, error } = await sharedDb
        .from("collab_end_requests" as never)
        .update({
          status: "withdrawn",
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", input.row.id)
        .eq("status", "pending")
        .select("*")
        .single();
      if (error) throw error;
      const updated = data as CollabEndRequestRow;
      await appendEvent({
        endRequestId: updated.id,
        actorId: input.userId,
        eventType: "withdrawn",
        snapshot: { status: "withdrawn" },
        diffSummary: "ถอนคำขอยุติคอลแลป",
      });
      await notifyOther({
        toUserId: input.otherUserId,
        title: "ถอนคำขอยุติคอลแลปแล้ว",
        body: "อีกฝ่ายถอนคำขอยุติ — ทำต่อได้ตามเดิม",
        link: `/chat/${updated.conversation_id}`,
        endId: updated.id,
        collabId: updated.collab_request_id,
      });
      return updated;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["collab-end-active", row.collab_request_id] });
      void qc.invalidateQueries({ queryKey: ["collab-end-history", row.collab_request_id] });
    },
  });
}

export function useRespondCollabEndRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      row: CollabEndRequestRow;
      userId: string;
      otherUserId: string;
      action: "accept" | "reject";
      responseReasonId?: string | null;
      responseNote?: string | null;
      responseCreditOutcome?: CollabEndCreditOutcome | null;
      responseCreditNote?: string | null;
    }) => {
      if (!isCollabEndOpenStatus(input.row.status)) {
        throw new Error("คำขอยุตินี้ตอบไปแล้ว");
      }
      if (input.row.initiator_id === input.userId) {
        throw new Error("ผู้ส่งคำขอตอบเองไม่ได้");
      }

      if (input.action === "accept") {
        const creditRequested = input.row.credit_mode === "credit_requested";
        let creditOutcome: CollabEndCreditOutcome | null = null;
        let creditNote: string | null = null;
        if (creditRequested) {
          creditOutcome = input.responseCreditOutcome ?? "deny_credit";
          creditNote = input.responseCreditNote?.trim() || null;
          if (creditOutcome === "grant_partial" && !creditNote) {
            throw new Error("ระบุหมายเหตุเมื่อให้เครดิตบางส่วน");
          }
        }

        const updated = await applyCollabEndApproved({
          row: input.row,
          actorId: input.userId,
          responseCreditOutcome: creditOutcome,
          responseCreditNote: creditNote,
        });
        await appendEvent({
          endRequestId: updated.id,
          actorId: input.userId,
          eventType: "accepted",
          snapshot: {
            status: "approved",
            handoff_terms: updated.handoff_terms,
            response_credit_outcome: updated.response_credit_outcome,
          },
          diffSummary: creditRequested
            ? `ยอมรับการยุติ — เครดิต: ${updated.response_credit_outcome ?? "deny_credit"}`
            : "ยอมรับการยุติคอลแลป",
        });
        await notifyOther({
          toUserId: input.otherUserId,
          title: "ยุติคอลแลปแล้ว",
          body: creditRequested
            ? "อีกฝ่ายยืนยันการยุติ — บันทึกเครดิต/สิทธิ์แล้ว"
            : "อีกฝ่ายยืนยันการยุติ — ไม่นับเป็นจบงาน",
          link: `/chat/${updated.conversation_id}`,
          endId: updated.id,
          collabId: updated.collab_request_id,
        });
        return updated;
      }

      const { data, error } = await sharedDb
        .from("collab_end_requests" as never)
        .update({
          status: "rejected",
          responder_id: input.userId,
          responded_at: new Date().toISOString(),
          response_reason_id: input.responseReasonId ?? null,
          response_note: input.responseNote?.trim() || null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", input.row.id)
        .eq("status", "pending")
        .select("*")
        .single();
      if (error) throw error;
      const updated = data as CollabEndRequestRow;
      await appendEvent({
        endRequestId: updated.id,
        actorId: input.userId,
        eventType: "rejected",
        snapshot: { status: "rejected" },
        diffSummary: "ปฏิเสธการยุติคอลแลป",
      });
      await notifyOther({
        toUserId: input.otherUserId,
        title: "ปฏิเสธการยุติคอลแลป",
        body: "อีกฝ่ายยังอยากทำต่อ — คุยต่อในแชทได้",
        link: `/chat/${updated.conversation_id}`,
        endId: updated.id,
        collabId: updated.collab_request_id,
      });
      return updated;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["collab-end-active", row.collab_request_id] });
      void qc.invalidateQueries({ queryKey: ["collab-end-history", row.collab_request_id] });
      void qc.invalidateQueries({ queryKey: ["collab-requests"] });
      void qc.invalidateQueries({ queryKey: ["chat-collab-meta", row.collab_request_id] });
      void qc.invalidateQueries({ queryKey: ["chat-collab-meta-panel", row.collab_request_id] });
      void qc.invalidateQueries({ queryKey: ["collab-plan-log", row.conversation_id] });
    },
  });
}

export function useGrantVoluntaryCollabEndCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      row: CollabEndRequestRow;
      userId: string;
      otherUserId: string;
      outcome: CollabEndCreditOutcome;
      note?: string | null;
    }) => {
      if (input.row.initiator_id === input.userId) {
        throw new Error("ผู้ถอนตัวให้เครดิตเองไม่ได้");
      }
      if (!isCollabEndApprovedStatus(input.row.status)) {
        throw new Error("คำขอนี้ยุติไปแล้ว");
      }
      if (!isCollabEndInstantExit(input.row)) {
        throw new Error("ให้เครดิตสมัครใจได้เฉพาะกรณีถอนตัวแบบสละสิทธิ์");
      }
      if (input.row.response_credit_outcome) {
        throw new Error("ให้เครดิตไปแล้ว");
      }
      if (input.outcome === "deny_credit") {
        throw new Error("เลือกรูปแบบการให้เครดิต");
      }
      const creditNote = input.note?.trim() || null;
      if (input.outcome === "grant_partial" && !creditNote) {
        throw new Error("ระบุหมายเหตุเมื่อให้เครดิตบางส่วน");
      }

      const now = new Date().toISOString();
      const { data, error } = await sharedDb
        .from("collab_end_requests" as never)
        .update({
          responder_id: input.userId,
          responded_at: now,
          response_credit_outcome: input.outcome,
          response_credit_note: creditNote,
          updated_at: now,
        } as never)
        .eq("id", input.row.id)
        .eq("status", "approved")
        .is("response_credit_outcome", null)
        .select("*")
        .single();
      if (error) throw error;
      const updated = data as CollabEndRequestRow;

      await appendEvent({
        endRequestId: updated.id,
        actorId: input.userId,
        eventType: "edited",
        snapshot: {
          response_credit_outcome: updated.response_credit_outcome,
          voluntary: true,
        },
        diffSummary: `ให้เครดิต (ไม่บังคับ): ${updated.response_credit_outcome}`,
      });
      await notifyOther({
        toUserId: input.otherUserId,
        title: "อีกฝ่ายให้เครดิต/สิทธิ์",
        body: "บันทึกไว้ตอนลงผลงาน — ไม่ใช่สิทธิ์ที่คุณขอตอนถอนตัว",
        link: `/chat/${updated.conversation_id}`,
        endId: updated.id,
        collabId: updated.collab_request_id,
      });
      return updated;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["collab-end-by-id", row.id] });
      void qc.invalidateQueries({ queryKey: ["collab-end-active", row.collab_request_id] });
      void qc.invalidateQueries({ queryKey: ["collab-end-history", row.collab_request_id] });
      void qc.invalidateQueries({ queryKey: ["collab-plan-log", row.conversation_id] });
    },
  });
}
