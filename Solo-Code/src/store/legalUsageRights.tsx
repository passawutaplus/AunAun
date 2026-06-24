import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { throwIfSupabaseError } from "@/lib/supabaseError";
import {
  buildUsageRightsLabel,
  usageRightsSchema,
  type UsageRights,
  type UsageRightsInput,
} from "@/lib/usageRightsSchema";

interface RightsRow {
  id: string;
  user_id: string;
  quotation_id: string | null;
  label: string | null;
  work_type: string;
  license_type: string;
  channels: string[];
  territory: string;
  territory_custom: string | null;
  term: string;
  transfer_on: string;
  deliverables: string[];
  revision_rounds: number;
  extra_revision_fee: number | null;
  custom_clauses: unknown;
  created_at: string;
  updated_at: string;
}

function rowToRights(r: RightsRow): UsageRights {
  return {
    id: r.id,
    userId: r.user_id,
    quotationId: r.quotation_id,
    label: r.label ?? undefined,
    workType: r.work_type as UsageRights["workType"],
    licenseType: r.license_type as UsageRights["licenseType"],
    channels: r.channels as UsageRights["channels"],
    territory: r.territory as UsageRights["territory"],
    territoryCustom: r.territory_custom ?? undefined,
    term: r.term as UsageRights["term"],
    transferOn: r.transfer_on as UsageRights["transferOn"],
    deliverables: r.deliverables as UsageRights["deliverables"],
    revisionRounds: r.revision_rounds,
    extraRevisionFee: r.extra_revision_fee != null ? Number(r.extra_revision_fee) : undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function inputToRow(userId: string, input: UsageRightsInput, quotationId?: string | null) {
  const parsed = usageRightsSchema.parse(input);
  return {
    user_id: userId,
    quotation_id: quotationId ?? null,
    label: parsed.label ?? buildUsageRightsLabel(parsed),
    work_type: parsed.workType,
    license_type: parsed.licenseType,
    channels: parsed.channels,
    territory: parsed.territory,
    territory_custom: parsed.territoryCustom ?? null,
    term: parsed.term,
    transfer_on: parsed.transferOn,
    deliverables: parsed.deliverables,
    revision_rounds: parsed.revisionRounds,
    extra_revision_fee: parsed.extraRevisionFee ?? null,
  };
}

const KEY_MINE = (uid?: string) => ["legal_usage_rights", uid ?? "anon"] as const;
const KEY_ONE = (id: string) => ["legal_usage_rights_one", id] as const;

export function useLegalUsageRights() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: KEY_MINE(uid),
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("legal_usage_rights")
        .select("*")
        .eq("user_id", uid!)
        .order("updated_at", { ascending: false });
      throwIfSupabaseError(error);
      return (data as RightsRow[]).map(rowToRights);
    },
  });

  const save = useMutation({
    mutationFn: async ({
      input,
      quotationId,
      rightsId,
    }: {
      input: UsageRightsInput;
      quotationId?: string;
      rightsId?: string;
    }) => {
      if (!uid) throw new Error("ต้องเข้าสู่ระบบ");
      const row = inputToRow(uid, input, quotationId);

      if (rightsId) {
        const { data, error } = await (supabase as any)
          .from("legal_usage_rights")
          .update(row)
          .eq("id", rightsId)
          .eq("user_id", uid)
          .select("*")
          .single();
        throwIfSupabaseError(error);
        return rowToRights(data as RightsRow);
      }

      const { data, error } = await (supabase as any)
        .from("legal_usage_rights")
        .insert(row)
        .select("*")
        .single();
      throwIfSupabaseError(error);
      const saved = rowToRights(data as RightsRow);

      if (quotationId) {
        const { error: qErr } = await (supabase as any)
          .from("quotations")
          .update({ usage_rights_id: saved.id })
          .eq("id", quotationId)
          .eq("user_id", uid);
        throwIfSupabaseError(qErr);
      }

      return saved;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY_MINE(uid) });
      qc.invalidateQueries({ queryKey: ["quotations", uid] });
    },
  });

  return {
    presets: list.data ?? [],
    isLoading: list.isLoading,
    save: save.mutateAsync,
    refetch: list.refetch,
  };
}

export function useUsageRightsById(id: string | null | undefined) {
  return useQuery({
    queryKey: KEY_ONE(id ?? "none"),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("legal_usage_rights")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      throwIfSupabaseError(error);
      return data ? rowToRights(data as RightsRow) : null;
    },
  });
}

export function useLegalChecklist(checklistId: string) {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const key = ["legal_checklist", uid, checklistId] as const;

  const progress = useQuery({
    queryKey: key,
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("legal_checklist_progress")
        .select("checked_items")
        .eq("user_id", uid!)
        .eq("checklist_id", checklistId)
        .maybeSingle();
      throwIfSupabaseError(error);
      return (data?.checked_items ?? []) as string[];
    },
  });

  const toggle = useMutation({
    mutationFn: async (itemId: string) => {
      if (!uid) throw new Error("ต้องเข้าสู่ระบบ");
      const current = new Set(progress.data ?? []);
      if (current.has(itemId)) current.delete(itemId);
      else current.add(itemId);
      const checked = [...current];
      const { error } = await (supabase as any).from("legal_checklist_progress").upsert(
        {
          user_id: uid,
          checklist_id: checklistId,
          checked_items: checked,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,checklist_id" },
      );
      throwIfSupabaseError(error);
      return checked;
    },
    onSuccess: (checked) => qc.setQueryData(key, checked),
  });

  return {
    checked: progress.data ?? [],
    toggle: toggle.mutateAsync,
    isLoading: progress.isLoading,
  };
}

export function useLegalDocuments() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["legal_documents", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("legal_documents")
        .select("*")
        .eq("user_id", uid!)
        .order("created_at", { ascending: false })
        .limit(30);
      throwIfSupabaseError(error);
      return data as Array<{
        id: string;
        title: string;
        body: string;
        doc_type: string;
        quotation_id: string | null;
        created_at: string;
      }>;
    },
  });

  const save = useMutation({
    mutationFn: async (doc: {
      title: string;
      body: string;
      docType: "contract_draft" | "guardian_note" | "debt_reminder";
      quotationId?: string;
      meta?: Record<string, unknown>;
    }) => {
      if (!uid) throw new Error("ต้องเข้าสู่ระบบ");
      const { data, error } = await (supabase as any)
        .from("legal_documents")
        .insert({
          user_id: uid,
          title: doc.title,
          body: doc.body,
          doc_type: doc.docType,
          quotation_id: doc.quotationId ?? null,
          meta: doc.meta ?? {},
        })
        .select("*")
        .single();
      throwIfSupabaseError(error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["legal_documents", uid] }),
  });

  return { documents: list.data ?? [], save: save.mutateAsync };
}
