import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { sharedDb, supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  canEditPlanContent,
  collabPlanDemoShortcutsEnabled,
  emptyCollabPlanDocument,
  emptyPlanPayload,
  memberIdsFromConversation,
  nextStepId,
  normalizeCollabPlanDocument,
  normalizeCollabPlanState,
  normalizeCollabPlanVersionSnapshot,
  prevStepId,
  stepAcksComplete,
  type CollabPlanDocument,
  type CollabPlanPayload,
  type CollabPlanState,
  type CollabPlanVersionSnapshot,
  type CollabPipelineStageId,
} from "@/lib/collabPlanDoc";
import type { Conversation } from "@/hooks/useChat";

type ChangeRequestRow = {
  id: string;
  conversation_id: string;
  requested_by: string;
  step: string;
  reason: string | null;
  status: string;
  approvals: Record<string, string>;
  created_at: string;
};

type LogRow = {
  id: string;
  conversation_id: string;
  actor_id: string | null;
  action: string;
  detail: Record<string, unknown>;
  created_at: string;
};

type PlanTarget = Conversation | string | null | undefined;

function resolveConversationId(target: PlanTarget): string | undefined {
  if (!target) return undefined;
  return typeof target === "string" ? target : target.id;
}

async function fetchMemberIds(target: Conversation | string): Promise<string[]> {
  const conversationId = typeof target === "string" ? target : target.id;

  const { data: members } = await sharedDb
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId);
  const fromMembers = (members ?? [])
    .map((r) => (r as { user_id: string }).user_id)
    .filter(Boolean);
  if (fromMembers.length >= 2) return Array.from(new Set(fromMembers));

  if (typeof target !== "string") {
    const fromConv = memberIdsFromConversation(target);
    if (fromConv.length) return fromConv;
  }

  const { data: conv } = await sharedDb
    .from("conversations")
    .select("client_id, freelancer_id, conversation_type, studio_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (conv) {
    const fromRow = memberIdsFromConversation(conv as Conversation);
    if (fromRow.length) return fromRow;
  }
  return fromMembers.length ? Array.from(new Set(fromMembers)) : [];
}

async function fetchPlan(conversationId: string): Promise<{
  doc: CollabPlanDocument;
  persisted: boolean;
}> {
  const { data, error } = await sharedDb
    .from("collab_plans" as never)
    .select(
      "conversation_id, stages, status, current_step, payload, acks, version, updated_at, updated_by",
    )
    .eq("conversation_id", conversationId)
    .maybeSingle();
  if (error) throw error;
  return {
    doc: normalizeCollabPlanDocument(
      conversationId,
      (data as Record<string, unknown> | null) ?? null,
    ),
    persisted: !!data,
  };
}

async function writeVersionSnapshot(
  conversationId: string,
  snapshot: {
    version: number;
    payload: CollabPlanPayload;
    currentStep: CollabPipelineStageId;
    status: CollabPlanDocument["status"];
    acks: CollabPlanDocument["acks"];
    savedBy: string;
  },
) {
  const { error } = await sharedDb.from("collab_plan_versions" as never).upsert(
    {
      conversation_id: conversationId,
      version: snapshot.version,
      payload: snapshot.payload,
      current_step: snapshot.currentStep,
      status: snapshot.status,
      acks: snapshot.acks,
      saved_by: snapshot.savedBy,
      saved_at: new Date().toISOString(),
    } as never,
    { onConflict: "conversation_id,version" },
  );
  if (error) throw error;
}

async function writeLog(
  conversationId: string,
  actorId: string,
  action: string,
  detail: Record<string, unknown> = {},
) {
  await sharedDb.from("collab_plan_activity_log" as never).insert({
    conversation_id: conversationId,
    actor_id: actorId,
    action,
    detail,
  } as never);
}

export function useCollabPlan(target: PlanTarget, enabled = true) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const conversationId = resolveConversationId(target);
  const queryKey = ["collab-plan-doc", conversationId];

  const [draft, setDraft] = useState<CollabPlanPayload | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [postEditCard, setPostEditCard] = useState(false);

  const planQuery = useQuery({
    queryKey,
    enabled: !!conversationId && enabled,
    queryFn: () => fetchPlan(conversationId!),
    staleTime: 5_000,
  });

  const membersQuery = useQuery({
    queryKey: ["collab-plan-members", conversationId],
    enabled: !!conversationId && enabled,
    queryFn: () => fetchMemberIds(typeof target === "string" || !target ? conversationId! : target),
    staleTime: 30_000,
  });

  const changeQuery = useQuery({
    queryKey: ["collab-plan-change", conversationId],
    enabled: !!conversationId && enabled,
    queryFn: async () => {
      const { data, error } = await sharedDb
        .from("collab_plan_change_requests" as never)
        .select("*")
        .eq("conversation_id", conversationId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as ChangeRequestRow | null) ?? null;
    },
  });

  const logQuery = useQuery({
    queryKey: ["collab-plan-log", conversationId],
    enabled: !!conversationId && enabled,
    queryFn: async () => {
      const { data, error } = await sharedDb
        .from("collab_plan_activity_log" as never)
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return (data as LogRow[]) ?? [];
    },
  });

  const versionsQuery = useQuery({
    queryKey: ["collab-plan-versions", conversationId],
    enabled: !!conversationId && enabled,
    staleTime: 10_000,
    queryFn: async (): Promise<CollabPlanVersionSnapshot[]> => {
      const { data, error } = await sharedDb
        .from("collab_plan_versions" as never)
        .select(
          "version, payload, current_step, status, acks, saved_by, saved_at",
        )
        .eq("conversation_id", conversationId!)
        .order("version", { ascending: false });
      if (error) {
        const code = (error as { code?: string }).code;
        if (code === "42P01" || code === "PGRST205") return [];
        throw error;
      }
      return (data ?? []).map((row) =>
        normalizeCollabPlanVersionSnapshot(row as Record<string, unknown>),
      );
    },
  });

  const doc = planQuery.data?.doc ?? emptyCollabPlanDocument(conversationId || "");
  const planPersisted = planQuery.data?.persisted ?? false;
  const memberIds = membersQuery.data ?? [];
  const payload = draft ?? doc.payload;
  const versions = versionsQuery.data ?? [];

  /** Compat for older panels expecting stages.done/note */
  const state: CollabPlanState = useMemo(
    () =>
      normalizeCollabPlanState({
        status: doc.status,
        current_step: doc.currentStep,
        payload: doc.payload,
        acks: doc.acks,
        updated_at: doc.updatedAt,
        updated_by: doc.updatedBy,
      }),
    [doc],
  );

  useEffect(() => {
    if (!planQuery.data) return;
    if (!dirty) setDraft(planQuery.data.doc.payload);
  }, [planQuery.data, dirty]);

  useEffect(() => {
    if (!conversationId || !enabled) return;
    const channel = supabase
      .channel(`collab-plan-doc-${conversationId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "shared",
          table: "collab_plans",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "shared",
          table: "collab_plan_change_requests",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["collab-plan-change", conversationId] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, enabled, qc, queryKey]);

  const editable = canEditPlanContent(doc) && !changeQuery.data;

  const updatePayload = useCallback(
    (updater: (prev: CollabPlanPayload) => CollabPlanPayload) => {
      if (!editable) return;
      setDraft((prev) => updater(prev ?? emptyPlanPayload()));
      setDirty(true);
    },
    [editable],
  );

  const save = useCallback(async (payloadOverride?: CollabPlanPayload) => {
    const toSave = payloadOverride ?? draft;
    if (!conversationId || !user?.id || !toSave) return { postedEdit: false };
    if (!editable) {
      setSaveError("แผนถูกล็อก — ต้องขออนุมัติแก้ไขจากทุกคนก่อน");
      return { postedEdit: false };
    }
    setSaving(true);
    setSaveError(null);
    try {
      // Content change invalidates current-step acks until everyone re-confirms
      const nextAcks =
        dirty && Object.keys(doc.acks[doc.currentStep] ?? {}).length
          ? { ...doc.acks, [doc.currentStep]: {} }
          : doc.acks;
      const nextVersion = planPersisted ? (doc.version || 1) + 1 : 1;
      const { error } = await sharedDb.from("collab_plans" as never).upsert(
        {
          conversation_id: conversationId,
          status: "draft",
          current_step: doc.currentStep,
          payload: toSave,
          acks: nextAcks,
          version: nextVersion,
          stages: {},
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "conversation_id" },
      );
      if (error) throw error;
      try {
        await writeVersionSnapshot(conversationId, {
          version: nextVersion,
          payload: toSave,
          currentStep: doc.currentStep,
          status: "draft",
          acks: nextAcks,
          savedBy: user.id,
        });
      } catch {
        /* snapshot table may not be migrated yet */
      }
      await writeLog(conversationId, user.id, "save", {
        version: nextVersion,
        step: doc.currentStep,
      });
      const shouldPostEdit = postEditCard && dirty;
      setPostEditCard(false);
      setDraft(toSave);
      setDirty(false);
      await qc.invalidateQueries({ queryKey });
      await qc.invalidateQueries({ queryKey: ["collab-plan-log", conversationId] });
      await qc.invalidateQueries({ queryKey: ["collab-plan-versions", conversationId] });
      return { postedEdit: shouldPostEdit };
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
      throw e;
    } finally {
      setSaving(false);
    }
  }, [conversationId, user?.id, draft, editable, doc, dirty, planPersisted, postEditCard, qc, queryKey]);

  /** Persist progress/social updates without clearing step acks. */
  const saveQuiet = useCallback(async (payloadOverride: CollabPlanPayload) => {
    if (!conversationId || !user?.id || !editable) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { error } = await sharedDb.from("collab_plans" as never).upsert(
        {
          conversation_id: conversationId,
          status: doc.status === "change_pending" ? "change_pending" : "draft",
          current_step: doc.currentStep,
          payload: payloadOverride,
          acks: doc.acks,
          version: doc.version || 1,
          stages: {},
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "conversation_id" },
      );
      if (error) throw error;
      setDraft(payloadOverride);
      setDirty(false);
      await qc.invalidateQueries({ queryKey });
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }, [conversationId, user?.id, editable, doc, qc, queryKey]);

  const toggleAck = useCallback(async () => {
    if (!conversationId || !user?.id) return null;
    if (doc.status === "step_locked" || doc.status === "change_pending") {
      throw new Error("ขั้นนี้ล็อกแล้ว — ต้องขออนุมัติแก้ไขก่อน");
    }
    if (dirty) {
      throw new Error("บันทึกแผนก่อน แล้วค่อยติ๊กยืนยัน");
    }
    const step = doc.currentStep;
    const map = { ...(doc.acks[step] ?? {}) };
    const wasAcked = !!map[user.id];
    if (wasAcked) delete map[user.id];
    else map[user.id] = new Date().toISOString();
    const nextAcks = { ...doc.acks, [step]: map };
    const complete = stepAcksComplete(nextAcks, step, memberIds);
    const nextStatus = complete ? "step_locked" : "draft";

    const { error } = await sharedDb.from("collab_plans" as never).upsert(
      {
        conversation_id: conversationId,
        status: nextStatus,
        current_step: step,
        payload: draft ?? doc.payload,
        acks: nextAcks,
        version: doc.version,
        stages: {},
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "conversation_id" },
    );
    if (error) throw error;
    await writeLog(conversationId, user.id, wasAcked ? "unack" : "ack", {
      step,
      complete,
    });
    await qc.invalidateQueries({ queryKey });
    await qc.invalidateQueries({ queryKey: ["collab-plan-log", conversationId] });
    return { complete, step, acked: !wasAcked };
  }, [conversationId, user?.id, doc, memberIds, draft, dirty, qc, queryKey]);

  const advanceStep = useCallback(async () => {
    if (!conversationId || !user?.id) return;
    if (doc.status !== "step_locked" || !stepAcksComplete(doc.acks, doc.currentStep, memberIds)) {
      throw new Error("ต้องให้สมาชิกทุกคนติ๊กยืนยันก่อน");
    }
    const next = nextStepId(doc.currentStep);
    if (!next) return;
    const { error } = await sharedDb.from("collab_plans" as never).upsert(
      {
        conversation_id: conversationId,
        status: "draft",
        current_step: next,
        payload: draft ?? doc.payload,
        acks: doc.acks,
        version: doc.version,
        stages: {},
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "conversation_id" },
    );
    if (error) throw error;
    await writeLog(conversationId, user.id, "advance", {
      from: doc.currentStep,
      to: next,
    });
    setDirty(false);
    await qc.invalidateQueries({ queryKey });
  }, [conversationId, user?.id, doc, memberIds, draft, qc, queryKey]);

  /** Dev/demo: skip ack requirement and go to the next pipeline step. */
  const advanceStepDemo = useCallback(async () => {
    if (!collabPlanDemoShortcutsEnabled()) {
      throw new Error("ต้องให้สมาชิกทุกคนติ๊กยืนยันก่อนไปขั้นถัดไป");
    }
    if (!conversationId || !user?.id) return;
    if (doc.status === "change_pending") {
      throw new Error("มีคำขอแก้ไขค้างอยู่ — อนุมัติหรือยกเลิกก่อน");
    }
    const next = nextStepId(doc.currentStep);
    if (!next) return;
    const payloadToSave = draft ?? doc.payload;
    const { error } = await sharedDb.from("collab_plans" as never).upsert(
      {
        conversation_id: conversationId,
        status: "draft",
        current_step: next,
        payload: payloadToSave,
        acks: doc.acks,
        version: doc.version,
        stages: {},
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "conversation_id" },
    );
    if (error) throw error;
    await writeLog(conversationId, user.id, "advance", {
      from: doc.currentStep,
      to: next,
      demo: true,
    });
    setDirty(false);
    await qc.invalidateQueries({ queryKey });
  }, [conversationId, user?.id, doc, draft, qc, queryKey]);

  /** Dev/demo: go back to the previous pipeline step. */
  const retreatStepDemo = useCallback(async () => {
    if (!collabPlanDemoShortcutsEnabled()) {
      throw new Error("ย้อนขั้นได้เฉพาะโหมด demo");
    }
    if (!conversationId || !user?.id) return;
    if (doc.status === "change_pending") {
      throw new Error("มีคำขอแก้ไขค้างอยู่ — อนุมัติหรือยกเลิกก่อน");
    }
    const prev = prevStepId(doc.currentStep);
    if (!prev) return;
    const payloadToSave = draft ?? doc.payload;
    const { error } = await sharedDb.from("collab_plans" as never).upsert(
      {
        conversation_id: conversationId,
        status: "draft",
        current_step: prev,
        payload: payloadToSave,
        acks: doc.acks,
        version: doc.version,
        stages: {},
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "conversation_id" },
    );
    if (error) throw error;
    await writeLog(conversationId, user.id, "advance", {
      from: doc.currentStep,
      to: prev,
      demo: true,
      direction: "back",
    });
    setDirty(false);
    await qc.invalidateQueries({ queryKey });
  }, [conversationId, user?.id, doc, draft, qc, queryKey]);

  const requestChange = useCallback(
    async (reason: string, targetStep?: CollabPipelineStageId) => {
      if (!conversationId || !user?.id) return null;
      if (changeQuery.data) {
        throw new Error("มีคำขอแก้ไขค้างอยู่แล้ว");
      }
      // Locked current step, or later steps requesting edit of agreed align plan
      const step =
        targetStep ??
        (doc.status === "step_locked" ? doc.currentStep : "align");
      const pastAlign = doc.currentStep !== "align";
      if (doc.status !== "step_locked" && !(pastAlign && step === "align")) {
        throw new Error("ยังไม่ล็อก — แก้รายละเอียดได้เลยโดยไม่ต้องขอ");
      }
      const { data, error } = await sharedDb
        .from("collab_plan_change_requests" as never)
        .insert({
          conversation_id: conversationId,
          requested_by: user.id,
          step,
          reason: reason.trim() || null,
          status: "pending",
          approvals: { [user.id]: new Date().toISOString() },
        } as never)
        .select("*")
        .single();
      if (error) throw error;
      await sharedDb
        .from("collab_plans" as never)
        .update({
          status: "change_pending",
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        } as never)
        .eq("conversation_id", conversationId);
      await writeLog(conversationId, user.id, "change_request", {
        reason,
        step,
      });
      await qc.invalidateQueries({ queryKey: ["collab-plan-change", conversationId] });
      await qc.invalidateQueries({ queryKey });
      return data as ChangeRequestRow;
    },
    [conversationId, user?.id, doc, changeQuery.data, qc, queryKey],
  );

  const approveChange = useCallback(
    async (requestId?: string) => {
      if (!conversationId || !user?.id) return { approved: false };
      let row = changeQuery.data;
      if (requestId && (!row || row.id !== requestId)) {
        const { data } = await sharedDb
          .from("collab_plan_change_requests" as never)
          .select("*")
          .eq("id", requestId)
          .maybeSingle();
        row = (data as ChangeRequestRow | null) ?? null;
      }
      if (!row || row.status !== "pending") return { approved: false };

      const approvals = { ...(row.approvals || {}), [user.id]: new Date().toISOString() };
      const approved = memberIds.every((id) => !!approvals[id]);
      const { error } = await sharedDb
        .from("collab_plan_change_requests" as never)
        .update({
          approvals,
          status: approved ? "approved" : "pending",
          resolved_at: approved ? new Date().toISOString() : null,
        } as never)
        .eq("id", row.id);
      if (error) throw error;

      if (approved) {
        const unlockStep = (row.step as CollabPipelineStageId) || doc.currentStep;
        // Editing agreed plan from a later step → return to align for re-confirm
        const backToAlign = unlockStep === "align" && doc.currentStep !== "align";
        const nextAcks = { ...doc.acks, [unlockStep]: {} };
        await sharedDb
          .from("collab_plans" as never)
          .update({
            status: "draft",
            current_step: backToAlign ? "align" : doc.currentStep,
            acks: nextAcks,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          } as never)
          .eq("conversation_id", conversationId);
        setPostEditCard(true);
        await writeLog(conversationId, user.id, "change_approved", {
          step: unlockStep,
          backToAlign,
        });
      } else {
        await writeLog(conversationId, user.id, "change_approve", { step: doc.currentStep });
      }
      await qc.invalidateQueries({ queryKey: ["collab-plan-change", conversationId] });
      await qc.invalidateQueries({ queryKey });
      await qc.invalidateQueries({ queryKey: ["collab-plan-log", conversationId] });
      return { approved };
    },
    [conversationId, user?.id, changeQuery.data, memberIds, doc, qc, queryKey],
  );

  /** Dev/demo: mark every member as approved and unlock editing immediately. */
  const approveChangeDemo = useCallback(async () => {
    if (!collabPlanDemoShortcutsEnabled()) {
      throw new Error("อนุมัติแทนทุกคนได้เฉพาะโหมด demo");
    }
    if (!conversationId || !user?.id) return { approved: false };
    const row = changeQuery.data;
    if (!row || row.status !== "pending") {
      throw new Error("ไม่มีคำขอแก้ไขที่รออนุมัติ");
    }
    const now = new Date().toISOString();
    const approvals: Record<string, string> = { ...(row.approvals || {}) };
    for (const id of memberIds) {
      approvals[id] = now;
    }
    const { error } = await sharedDb
      .from("collab_plan_change_requests" as never)
      .update({
        approvals,
        status: "approved",
        resolved_at: now,
      } as never)
      .eq("id", row.id);
    if (error) throw error;

    const unlockStep = (row.step as CollabPipelineStageId) || doc.currentStep;
    const backToAlign = unlockStep === "align" && doc.currentStep !== "align";
    const nextAcks = { ...doc.acks, [unlockStep]: {} };
    await sharedDb
      .from("collab_plans" as never)
      .update({
        status: "draft",
        current_step: backToAlign ? "align" : doc.currentStep,
        acks: nextAcks,
        updated_at: now,
        updated_by: user.id,
      } as never)
      .eq("conversation_id", conversationId);
    setPostEditCard(true);
    await writeLog(conversationId, user.id, "change_approved", {
      step: unlockStep,
      backToAlign,
      demo: true,
    });
    await qc.invalidateQueries({ queryKey: ["collab-plan-change", conversationId] });
    await qc.invalidateQueries({ queryKey });
    await qc.invalidateQueries({ queryKey: ["collab-plan-log", conversationId] });
    return { approved: true };
  }, [conversationId, user?.id, changeQuery.data, memberIds, doc, qc, queryKey]);

  const myAcked = !!(user?.id && doc.acks[doc.currentStep]?.[user.id]);
  const myChangeApproved = !!(
    user?.id &&
    changeQuery.data?.approvals &&
    changeQuery.data.approvals[user.id]
  );

  const ackProgress = useMemo(() => {
    const map = doc.acks[doc.currentStep] ?? {};
    const missing = memberIds.filter((id) => !map[id]);
    return {
      done: memberIds.length - missing.length,
      total: memberIds.length,
      missing,
    };
  }, [doc.acks, doc.currentStep, memberIds]);

  return {
    doc,
    planPersisted,
    state,
    payload,
    memberIds,
    pendingChange: changeQuery.data,
    logs: logQuery.data ?? [],
    versions,
    isLoading: planQuery.isLoading || membersQuery.isLoading,
    versionsLoading: versionsQuery.isLoading,
    saving,
    saveError,
    dirty,
    editable,
    myAcked,
    myChangeApproved,
    ackProgress,
    updatePayload,
    save,
    saveQuiet,
    toggleAck,
    advanceStep,
    advanceStepDemo,
    retreatStepDemo,
    requestChange,
    approveChange,
    approveChangeDemo,
    refetch: planQuery.refetch,
  };
}
