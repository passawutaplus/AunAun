import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  buildCancelDeadlines,
  canEditHireCancelRequest,
  isHireCancelOpenStatus,
  summarizeCancelDiff,
  type HireCancelEventRow,
  type HireCancelInitiatedBy,
  type HireCancelMoneyTerms,
  type HireCancelRequestRow,
} from "@/lib/hireCancelRequest";

async function appendEvent(input: {
  cancelRequestId: string;
  actorId: string | null;
  eventType: string;
  snapshot: Record<string, unknown>;
  diffSummary?: string | null;
}) {
  const { error } = await supabase.from("hire_cancel_request_events").insert({
    cancel_request_id: input.cancelRequestId,
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
  cancelId: string;
  hireId: string;
}) {
  if (!input.toUserId) return;
  try {
    await supabase.rpc("notify_hire_cancel_event" as never, {
      p_to_user_id: input.toUserId,
      p_title: input.title,
      p_body: input.body,
      p_link: input.link,
      p_cancel_id: input.cancelId,
      p_hire_id: input.hireId,
    } as never);
  } catch {
    /* best-effort */
  }
}

async function markHireCancelled(hireId: string, reasonId: string | null, note: string | null) {
  const { error } = await supabase
    .from("hiring_requests")
    .update({
      status: "ยกเลิก",
      cancel_reason: reasonId,
      cancel_note: note,
    } as never)
    .eq("id", hireId);
  if (error) throw error;
}

export function useActiveHireCancelRequest(hiringRequestId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["hire-cancel-active", hiringRequestId],
    enabled: !!hiringRequestId,
    queryFn: async () => {
      // Lazy finalize expired
      try {
        await supabase.rpc("finalize_expired_hire_cancel_requests" as never);
      } catch {
        /* ignore */
      }
      const { data, error } = await supabase
        .from("hire_cancel_requests")
        .select("*")
        .eq("hiring_request_id", hiringRequestId!)
        .in("status", ["pending", "countered"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as HireCancelRequestRow | null) ?? null;
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!hiringRequestId) return;
    const ch = supabase
      .channel(`hire-cancel-${hiringRequestId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "anthem",
          table: "hire_cancel_requests",
          filter: `hiring_request_id=eq.${hiringRequestId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["hire-cancel-active", hiringRequestId] });
          void qc.invalidateQueries({ queryKey: ["hire-cancel-history", hiringRequestId] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [hiringRequestId, qc]);

  return query;
}

export function useHireCancelHistory(hiringRequestId: string | undefined) {
  return useQuery({
    queryKey: ["hire-cancel-history", hiringRequestId],
    enabled: !!hiringRequestId,
    queryFn: async () => {
      const { data: reqs, error: reqErr } = await supabase
        .from("hire_cancel_requests")
        .select("id")
        .eq("hiring_request_id", hiringRequestId!)
        .order("created_at", { ascending: false });
      if (reqErr) throw reqErr;
      const ids = (reqs ?? []).map((r) => r.id as string);
      if (!ids.length) return [] as HireCancelEventRow[];
      const { data, error } = await supabase
        .from("hire_cancel_request_events")
        .select("*")
        .in("cancel_request_id", ids)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as HireCancelEventRow[];
    },
  });
}

export function useHireCancelById(cancelRequestId: string | undefined) {
  return useQuery({
    queryKey: ["hire-cancel-by-id", cancelRequestId],
    enabled: !!cancelRequestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hire_cancel_requests")
        .select("*")
        .eq("id", cancelRequestId!)
        .maybeSingle();
      if (error) throw error;
      return (data as HireCancelRequestRow | null) ?? null;
    },
  });
}

export function useSubmitHireCancelRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      hiringRequestId: string;
      conversationId: string;
      initiatedBy: HireCancelInitiatedBy;
      initiatorId: string;
      otherUserId: string;
      reasonId: string;
      reasonNote?: string | null;
      moneyTerms: HireCancelMoneyTerms;
      evidenceUrls?: string[];
    }) => {
      const deadlines = buildCancelDeadlines();
      const { data, error } = await supabase
        .from("hire_cancel_requests")
        .insert({
          hiring_request_id: input.hiringRequestId,
          conversation_id: input.conversationId,
          initiated_by: input.initiatedBy,
          initiator_id: input.initiatorId,
          status: "pending",
          money_terms: input.moneyTerms,
          reason_id: input.reasonId,
          reason_note: input.reasonNote?.trim() || null,
          evidence_urls: input.evidenceUrls ?? [],
          first_submitted_at: deadlines.first_submitted_at,
          edit_until_at: deadlines.edit_until_at,
          respond_deadline_at: deadlines.respond_deadline_at,
        } as never)
        .select("*")
        .single();
      if (error) throw error;
      const row = data as HireCancelRequestRow;
      await appendEvent({
        cancelRequestId: row.id,
        actorId: input.initiatorId,
        eventType: "submitted",
        snapshot: {
          money_terms: row.money_terms,
          reason_id: row.reason_id,
          reason_note: row.reason_note,
          status: row.status,
        },
        diffSummary: "ส่งคำขอยกเลิกงาน",
      });
      await notifyOther({
        toUserId: input.otherUserId,
        title: "มีคำขอยกเลิกงาน",
        body: "อีกฝ่ายส่งคำขอยกเลิกงาน — ตอบภายใน 48 ชั่วโมง",
        link: `/chat/${input.conversationId}`,
        cancelId: row.id,
        hireId: input.hiringRequestId,
      });
      return row;
    },
    onSuccess: (_row, vars) => {
      void qc.invalidateQueries({ queryKey: ["hire-cancel-active", vars.hiringRequestId] });
      void qc.invalidateQueries({ queryKey: ["hire-cancel-history", vars.hiringRequestId] });
      void qc.invalidateQueries({ queryKey: ["hiring_requests"] });
    },
  });
}

export function useEditHireCancelRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      row: HireCancelRequestRow;
      userId: string;
      reasonId: string;
      reasonNote?: string | null;
      moneyTerms: HireCancelMoneyTerms;
      evidenceUrls?: string[];
      otherUserId: string;
      conversationId: string;
    }) => {
      if (!canEditHireCancelRequest(input.row, input.userId)) {
        throw new Error("หมดเวลาแก้ไขหรือถอนคำขอแล้ว (24 ชั่วโมงแรกเท่านั้น)");
      }
      const patch = {
        reason_id: input.reasonId,
        reason_note: input.reasonNote?.trim() || null,
        money_terms: input.moneyTerms,
        evidence_urls: input.evidenceUrls ?? input.row.evidence_urls ?? [],
        last_edited_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("hire_cancel_requests")
        .update(patch as never)
        .eq("id", input.row.id)
        .eq("status", input.row.status)
        .select("*")
        .single();
      if (error) throw error;
      const updated = data as HireCancelRequestRow;
      const diff = summarizeCancelDiff(input.row, updated);
      await appendEvent({
        cancelRequestId: updated.id,
        actorId: input.userId,
        eventType: "edited",
        snapshot: {
          money_terms: updated.money_terms,
          reason_id: updated.reason_id,
          reason_note: updated.reason_note,
          status: updated.status,
        },
        diffSummary: diff,
      });
      await notifyOther({
        toUserId: input.otherUserId,
        title: "มีการแก้ไขคำขอยกเลิกงาน",
        body: `${diff} — กำหนดพิจารณาเดิมยังไม่เปลี่ยน`,
        link: `/chat/${input.conversationId}`,
        cancelId: updated.id,
        hireId: updated.hiring_request_id,
      });
      return updated;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["hire-cancel-active", row.hiring_request_id] });
      void qc.invalidateQueries({ queryKey: ["hire-cancel-history", row.hiring_request_id] });
      void qc.invalidateQueries({ queryKey: ["hire-cancel-by-id", row.id] });
    },
  });
}

export function useWithdrawHireCancelRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      row: HireCancelRequestRow;
      userId: string;
      otherUserId: string;
      conversationId: string;
    }) => {
      if (!canEditHireCancelRequest(input.row, input.userId)) {
        throw new Error("หมดเวลาแก้ไขหรือถอนคำขอแล้ว (24 ชั่วโมงแรกเท่านั้น)");
      }
      const { data, error } = await supabase
        .from("hire_cancel_requests")
        .update({
          status: "withdrawn",
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", input.row.id)
        .in("status", ["pending", "countered"])
        .select("*")
        .single();
      if (error) throw error;
      const updated = data as HireCancelRequestRow;
      await appendEvent({
        cancelRequestId: updated.id,
        actorId: input.userId,
        eventType: "withdrawn",
        snapshot: { status: "withdrawn" },
        diffSummary: "ถอนคำขอยกเลิก — งานดำเนินต่อ",
      });
      await notifyOther({
        toUserId: input.otherUserId,
        title: "ถอนคำขอยกเลิกแล้ว",
        body: "อีกฝ่ายถอนคำขอยกเลิกงาน — งานดำเนินต่อได้ตามปกติ",
        link: `/chat/${input.conversationId}`,
        cancelId: updated.id,
        hireId: updated.hiring_request_id,
      });
      return updated;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["hire-cancel-active", row.hiring_request_id] });
      void qc.invalidateQueries({ queryKey: ["hire-cancel-history", row.hiring_request_id] });
      void qc.invalidateQueries({ queryKey: ["hire-cancel-by-id", row.id] });
    },
  });
}

export type HireCancelRespondAction =
  | "accept"
  | "reject"
  | "counter"
  | "compensation_50";

export function useRespondHireCancelRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      row: HireCancelRequestRow;
      userId: string;
      otherUserId: string;
      conversationId: string;
      action: HireCancelRespondAction;
      responseReasonId?: string | null;
      responseNote?: string | null;
      responseMoneyTerms?: HireCancelMoneyTerms | null;
      evidenceUrls?: string[];
    }) => {
      if (!isHireCancelOpenStatus(input.row.status)) {
        throw new Error("คำขอยกเลิกนี้ตอบไปแล้ว");
      }
      if (input.row.initiator_id === input.userId && input.row.status !== "countered") {
        throw new Error("ผู้ส่งคำขอตอบเองไม่ได้");
      }
      if (input.row.status === "countered" && input.row.initiator_id !== input.userId) {
        throw new Error("รอผู้ส่งคำขอตอบเงื่อนไข");
      }

      if (input.action === "accept") {
        const money =
          input.row.status === "countered" && input.row.response_money_terms
            ? input.row.response_money_terms
            : input.row.money_terms;
        const { data, error } = await supabase
          .from("hire_cancel_requests")
          .update({
            status: "approved",
            responder_id: input.userId,
            responded_at: new Date().toISOString(),
            response_money_terms: money,
            response_reason_id: input.responseReasonId ?? null,
            response_note: input.responseNote?.trim() || null,
            updated_at: new Date().toISOString(),
          } as never)
          .eq("id", input.row.id)
          .in("status", ["pending", "countered"])
          .select("*")
          .single();
        if (error) throw error;
        const updated = data as HireCancelRequestRow;
        await appendEvent({
          cancelRequestId: updated.id,
          actorId: input.userId,
          eventType: "accepted",
          snapshot: {
            status: "approved",
            money_terms: updated.money_terms,
            response_money_terms: updated.response_money_terms,
          },
          diffSummary: "ยอมรับยกเลิกตามเงื่อนไข",
        });
        await markHireCancelled(
          updated.hiring_request_id,
          updated.reason_id,
          updated.reason_note,
        );
        await notifyOther({
          toUserId: input.otherUserId,
          title: "อนุมัติการยกเลิกงานแล้ว",
          body: "อีกฝ่ายยอมรับการยกเลิกงานแล้ว",
          link: `/chat/${input.conversationId}`,
          cancelId: updated.id,
          hireId: updated.hiring_request_id,
        });
        return updated;
      }

      if (input.action === "reject") {
        const { data, error } = await supabase
          .from("hire_cancel_requests")
          .update({
            status: "rejected",
            responder_id: input.userId,
            responded_at: new Date().toISOString(),
            response_reason_id: input.responseReasonId ?? null,
            response_note: input.responseNote?.trim() || null,
            updated_at: new Date().toISOString(),
          } as never)
          .eq("id", input.row.id)
          .in("status", ["pending", "countered"])
          .select("*")
          .single();
        if (error) throw error;
        const updated = data as HireCancelRequestRow;
        await appendEvent({
          cancelRequestId: updated.id,
          actorId: input.userId,
          eventType: "rejected",
          snapshot: {
            status: "rejected",
            response_reason_id: updated.response_reason_id,
            response_note: updated.response_note,
          },
          diffSummary: "ปฏิเสธการยกเลิก — งานดำเนินต่อ",
        });
        await notifyOther({
          toUserId: input.otherUserId,
          title: "ปฏิเสธการยกเลิกงาน",
          body: "อีกฝ่ายปฏิเสธการยกเลิก — งานยังดำเนินต่อ คุยในแชทได้ตามปกติ",
          link: `/chat/${input.conversationId}`,
          cancelId: updated.id,
          hireId: updated.hiring_request_id,
        });
        return updated;
      }

      if (input.action === "compensation_50") {
        const urls = [
          ...(input.row.evidence_urls ?? []),
          ...(input.evidenceUrls ?? []),
        ];
        const { data, error } = await supabase
          .from("hire_cancel_requests")
          .update({
            status: "countered",
            money_terms: "compensation_50",
            response_money_terms: "compensation_50",
            responder_id: input.userId,
            response_reason_id: input.responseReasonId ?? null,
            response_note: input.responseNote?.trim() || null,
            evidence_urls: urls,
            updated_at: new Date().toISOString(),
          } as never)
          .eq("id", input.row.id)
          .eq("status", "pending")
          .select("*")
          .single();
        if (error) throw error;
        const updated = data as HireCancelRequestRow;
        await appendEvent({
          cancelRequestId: updated.id,
          actorId: input.userId,
          eventType: "compensation_requested",
          snapshot: {
            status: "countered",
            money_terms: "compensation_50",
            response_note: updated.response_note,
          },
          diffSummary: "ขอค่าชดเชย 50% (บันทึกข้อตกลงในระบบ)",
        });
        await notifyOther({
          toUserId: input.otherUserId,
          title: "ขอค่าชดเชย 50%",
          body: "อีกฝ่ายยอมยกเลิกได้หากตกลงค่าชดเชย 50% — ตอบในแชท",
          link: `/chat/${input.conversationId}`,
          cancelId: updated.id,
          hireId: updated.hiring_request_id,
        });
        return updated;
      }

      // counter: propose alternate money terms (full ↔ half)
      const counterTerms = input.responseMoneyTerms;
      if (!counterTerms || (counterTerms !== "full_refund" && counterTerms !== "half_refund")) {
        throw new Error("เลือกเงื่อนไขเงินคืนเต็มหรือ 50%");
      }
      const { data, error } = await supabase
        .from("hire_cancel_requests")
        .update({
          status: "countered",
          response_money_terms: counterTerms,
          money_terms: counterTerms,
          responder_id: input.userId,
          response_reason_id: input.responseReasonId ?? null,
          response_note: input.responseNote?.trim() || null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", input.row.id)
        .in("status", ["pending", "countered"])
        .select("*")
        .single();
      if (error) throw error;
      const updated = data as HireCancelRequestRow;
      await appendEvent({
        cancelRequestId: updated.id,
        actorId: input.userId,
        eventType: "countered",
        snapshot: {
          status: "countered",
          money_terms: updated.money_terms,
          response_money_terms: updated.response_money_terms,
        },
        diffSummary: `เสนอเงื่อนไขเงินกลับ: ${counterTerms === "full_refund" ? "คืนเต็ม" : "คืน 50%"}`,
      });
      await notifyOther({
        toUserId: input.otherUserId,
        title: "มีข้อเสนอเงื่อนไขเงินใหม่",
        body: "อีกฝ่ายเสนอเงื่อนไขเงินสำหรับการยกเลิก — ตอบในแชท",
        link: `/chat/${input.conversationId}`,
        cancelId: updated.id,
        hireId: updated.hiring_request_id,
      });
      return updated;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["hire-cancel-active", row.hiring_request_id] });
      void qc.invalidateQueries({ queryKey: ["hire-cancel-history", row.hiring_request_id] });
      void qc.invalidateQueries({ queryKey: ["hire-cancel-by-id", row.id] });
      void qc.invalidateQueries({ queryKey: ["hiring_requests"] });
      void qc.invalidateQueries({ queryKey: ["chat-hire-forward-src"] });
    },
  });
}

/** Mark hiring_requests.offer_accepted_at when client accepts an in-chat offer. */
export function useMarkHireOfferAccepted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (hiringRequestId: string) => {
      const { error } = await supabase
        .from("hiring_requests")
        .update({
          offer_accepted_at: new Date().toISOString(),
          status: "ตอบรับ",
        } as never)
        .eq("id", hiringRequestId)
        .is("offer_accepted_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["hiring_requests"] });
      void qc.invalidateQueries({ queryKey: ["chat-hire-forward-src"] });
    },
  });
}
