import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sharedDb, supabase } from "@/integrations/supabase/client";
import {
  buildCollabGroupExpandDeadlines,
  isCollabGroupExpandOpenStatus,
  prepareFreshPlanForGroup,
  prepareMigratedPlanForGroup,
  type CollabGroupExpandPlanMode,
  type CollabGroupExpandRequestRow,
  type CollabPlanDocument,
} from "@/lib/collabGroupExpand";
import type { CollabPlanDocument as Doc } from "@/lib/collabPlanDoc";

async function notifyMember(input: {
  toUserId: string;
  title: string;
  body: string;
  link: string;
  expandId: string;
  sourceConversationId: string;
}) {
  try {
    await supabase.rpc("notify_collab_group_expand_event" as never, {
      p_to_user_id: input.toUserId,
      p_title: input.title,
      p_body: input.body,
      p_link: input.link,
      p_expand_id: input.expandId,
      p_source_conversation_id: input.sourceConversationId,
    } as never);
  } catch {
    /* best-effort */
  }
}

async function clearPendingPlanChanges(conversationId: string) {
  try {
    await sharedDb
      .from("collab_plan_change_requests" as never)
      .update({ status: "approved", resolved_at: new Date().toISOString() } as never)
      .eq("conversation_id", conversationId)
      .eq("status", "pending");
    await sharedDb
      .from("collab_plans" as never)
      .update({ status: "draft", updated_at: new Date().toISOString() } as never)
      .eq("conversation_id", conversationId)
      .eq("status", "change_pending");
  } catch {
    /* optional */
  }
}

async function applyGroupExpand(input: {
  row: CollabGroupExpandRequestRow;
  sourceMemberIds: string[];
  responderId: string;
}): Promise<string> {
  const row = input.row;
  const snapshot = row.plan_snapshot as unknown as Doc;
  const lockedSet = new Set(input.sourceMemberIds);
  const invited = row.new_member_ids.filter((id) => !lockedSet.has(id));
  const allMemberIds = Array.from(new Set([...input.sourceMemberIds, ...invited]));

  const { data: groupId, error: createErr } = await supabase.rpc(
    "create_group_conversation" as never,
    {
      p_title: row.group_title.trim(),
      p_member_ids: allMemberIds.filter((id) => id !== input.responderId),
      p_group_tag: "collab",
    } as never,
  );
  if (createErr) throw createErr;
  const newConvId = groupId as string;

  const planFields =
    row.plan_mode === "fresh"
      ? prepareFreshPlanForGroup(newConvId)
      : prepareMigratedPlanForGroup({
          doc: snapshot,
          sourceMemberIds: input.sourceMemberIds,
          allMemberIds,
        });

  const { error: planErr } = await sharedDb.from("collab_plans" as never).upsert(
    {
      conversation_id: newConvId,
      status: planFields.status,
      current_step: planFields.currentStep,
      payload: planFields.payload,
      acks: planFields.acks,
      version: planFields.version,
      stages: {},
      updated_by: input.responderId,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "conversation_id" },
  );
  if (planErr) throw planErr;

  await clearPendingPlanChanges(row.source_conversation_id);

  await sharedDb.from("collab_plan_activity_log" as never).insert([
    {
      conversation_id: row.source_conversation_id,
      actor_id: input.responderId,
      action: "group_expand",
      detail: {
        expand_request_id: row.id,
        result_conversation_id: newConvId,
        plan_mode: row.plan_mode,
      },
    },
    {
      conversation_id: newConvId,
      actor_id: input.responderId,
      action: "group_expand_created",
      detail: {
        expand_request_id: row.id,
        source_conversation_id: row.source_conversation_id,
        plan_mode: row.plan_mode,
        member_count: allMemberIds.length,
      },
    },
  ] as never);

  return newConvId;
}

export function useActiveCollabGroupExpandRequest(sourceConversationId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["collab-group-expand-active", sourceConversationId],
    enabled: !!sourceConversationId,
    queryFn: async () => {
      try {
        await supabase.rpc("expire_collab_group_expand_requests" as never);
      } catch {
        /* ignore */
      }
      const { data, error } = await sharedDb
        .from("collab_group_expand_requests" as never)
        .select("*")
        .eq("source_conversation_id", sourceConversationId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        const code = (error as { code?: string }).code;
        if (code === "42P01" || code === "PGRST205") return null;
        throw error;
      }
      return (data as CollabGroupExpandRequestRow | null) ?? null;
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!sourceConversationId) return;
    const ch = supabase
      .channel(`collab-group-expand-${sourceConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "shared",
          table: "collab_group_expand_requests",
          filter: `source_conversation_id=eq.${sourceConversationId}`,
        },
        () => {
          void qc.invalidateQueries({
            queryKey: ["collab-group-expand-active", sourceConversationId],
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [sourceConversationId, qc]);

  return query;
}

export function useCollabGroupExpandById(expandRequestId: string | undefined) {
  return useQuery({
    queryKey: ["collab-group-expand-by-id", expandRequestId],
    enabled: !!expandRequestId,
    queryFn: async () => {
      const { data, error } = await sharedDb
        .from("collab_group_expand_requests" as never)
        .select("*")
        .eq("id", expandRequestId!)
        .maybeSingle();
      if (error) throw error;
      return (data as CollabGroupExpandRequestRow | null) ?? null;
    },
  });
}

export function useSubmitCollabGroupExpandRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      sourceConversationId: string;
      collabRequestId?: string | null;
      proposedBy: string;
      partnerUserId: string;
      groupTitle: string;
      newMemberIds: string[];
      planMode: CollabGroupExpandPlanMode;
      planDoc: CollabPlanDocument;
      sourceMemberIds: string[];
      ackPreview: Record<string, unknown>;
    }) => {
      const deadlines = buildCollabGroupExpandDeadlines();
      const invitedOnly = input.newMemberIds.filter(
        (id) => !input.sourceMemberIds.includes(id),
      );
      const { data, error } = await sharedDb
        .from("collab_group_expand_requests" as never)
        .insert({
          source_conversation_id: input.sourceConversationId,
          collab_request_id: input.collabRequestId ?? null,
          proposed_by: input.proposedBy,
          status: "pending",
          group_title: input.groupTitle.trim(),
          new_member_ids: invitedOnly,
          plan_mode: input.planMode,
          plan_snapshot: input.planDoc as unknown as Record<string, unknown>,
          source_plan_step: input.planDoc.currentStep,
          ack_preview: input.ackPreview,
          first_submitted_at: deadlines.first_submitted_at,
          edit_until_at: deadlines.edit_until_at,
          expires_at: deadlines.expires_at,
        } as never)
        .select("*")
        .single();
      if (error) throw error;
      const row = data as CollabGroupExpandRequestRow;
      await notifyMember({
        toUserId: input.partnerUserId,
        title: "มีคำขอสร้างกลุ่มคอลแลป",
        body: `ชวน ${invitedOnly.length} คนเข้ากลุ่ม「${row.group_title}」— รอยืนยันก่อนสร้าง`,
        link: `/chat/${input.sourceConversationId}`,
        expandId: row.id,
        sourceConversationId: input.sourceConversationId,
      });
      return row;
    },
    onSuccess: (_row, vars) => {
      void qc.invalidateQueries({
        queryKey: ["collab-group-expand-active", vars.sourceConversationId],
      });
    },
  });
}

export function useWithdrawCollabGroupExpandRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      row: CollabGroupExpandRequestRow;
      userId: string;
      partnerUserId: string;
    }) => {
      if (input.row.proposed_by !== input.userId) {
        throw new Error("ถอนได้เฉพาะผู้ส่งคำขอ");
      }
      if (!isCollabGroupExpandOpenStatus(input.row.status)) {
        throw new Error("คำขอนี้ตอบไปแล้ว");
      }
      const { data, error } = await sharedDb
        .from("collab_group_expand_requests" as never)
        .update({ status: "withdrawn", updated_at: new Date().toISOString() } as never)
        .eq("id", input.row.id)
        .eq("status", "pending")
        .select("*")
        .single();
      if (error) throw error;
      const updated = data as CollabGroupExpandRequestRow;
      await notifyMember({
        toUserId: input.partnerUserId,
        title: "ถอนคำขอสร้างกลุ่มแล้ว",
        body: "อีกฝ่ายถอนคำขอชวนสร้างกลุ่ม",
        link: `/chat/${updated.source_conversation_id}`,
        expandId: updated.id,
        sourceConversationId: updated.source_conversation_id,
      });
      return updated;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({
        queryKey: ["collab-group-expand-active", row.source_conversation_id],
      });
    },
  });
}

export function useRespondCollabGroupExpandRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      row: CollabGroupExpandRequestRow;
      userId: string;
      proposerUserId: string;
      sourceMemberIds: string[];
      action: "accept" | "reject";
      responseNote?: string | null;
      notifyUserIds?: string[];
    }) => {
      if (!isCollabGroupExpandOpenStatus(input.row.status)) {
        throw new Error("คำขอนี้ตอบไปแล้ว");
      }
      if (input.row.proposed_by === input.userId) {
        throw new Error("ผู้ส่งคำขอตอบเองไม่ได้");
      }

      if (input.action === "reject") {
        const { data, error } = await sharedDb
          .from("collab_group_expand_requests" as never)
          .update({
            status: "rejected",
            responded_by: input.userId,
            responded_at: new Date().toISOString(),
            response_note: input.responseNote?.trim() || null,
            updated_at: new Date().toISOString(),
          } as never)
          .eq("id", input.row.id)
          .eq("status", "pending")
          .select("*")
          .single();
        if (error) throw error;
        const updated = data as CollabGroupExpandRequestRow;
        await notifyMember({
          toUserId: input.proposerUserId,
          title: "ปฏิเสธการสร้างกลุ่ม",
          body: "คู่แชทไม่ยืนยัน — ยังแชทคู่ต่อได้",
          link: `/chat/${updated.source_conversation_id}`,
          expandId: updated.id,
          sourceConversationId: updated.source_conversation_id,
        });
        return updated;
      }

      const newConvId = await applyGroupExpand({
        row: input.row,
        sourceMemberIds: input.sourceMemberIds,
        responderId: input.userId,
      });

      const { data, error } = await sharedDb
        .from("collab_group_expand_requests" as never)
        .update({
          status: "approved",
          responded_by: input.userId,
          responded_at: new Date().toISOString(),
          result_conversation_id: newConvId,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", input.row.id)
        .eq("status", "pending")
        .select("*")
        .single();
      if (error) throw error;
      const updated = data as CollabGroupExpandRequestRow;

      const notifyIds = input.notifyUserIds ?? [input.proposerUserId];
      for (const uid of notifyIds) {
        await notifyMember({
          toUserId: uid,
          title: "สร้างกลุ่มคอลแลปแล้ว",
          body: `กลุ่ม「${updated.group_title}」พร้อมแล้ว — เปิดแผนเพื่อยืนยันขั้นปัจจุบัน`,
          link: `/chat/${newConvId}`,
          expandId: updated.id,
          sourceConversationId: updated.source_conversation_id,
        });
      }

      return { ...updated, result_conversation_id: newConvId };
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({
        queryKey: ["collab-group-expand-active", row.source_conversation_id],
      });
      if (row.result_conversation_id) {
        void qc.invalidateQueries({
          queryKey: ["collab-plan-doc", row.result_conversation_id],
        });
        void qc.invalidateQueries({ queryKey: ["conversations"] });
      }
    },
  });
}
