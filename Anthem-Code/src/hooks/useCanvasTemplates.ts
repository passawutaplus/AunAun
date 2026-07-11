import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  blocksToTemplateModules,
  buildBlocksFromTemplateModules,
  CANVAS_TEMPLATE_MAX,
  CANVAS_TEMPLATE_SEEDS,
  getCanvasTemplateSeed,
  parseCanvasTemplateModules,
  type CanvasTemplateModule,
} from "@/lib/projectCanvasTemplates";
import type { ProjectContentBlock } from "@/lib/projectContentBlocks";
import { toast } from "sonner";

export type UserCanvasTemplate = {
  id: string;
  user_id: string;
  name: string;
  hint: string;
  source_key: string | null;
  modules: CanvasTemplateModule[];
  open_context: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  recommended?: boolean;
};

type DbRow = {
  id: string;
  user_id: string;
  name: string;
  hint: string;
  source_key: string | null;
  modules: unknown;
  open_context: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function templatesTable() {
  return supabase.from("project_canvas_templates" as never);
}

function mapRow(row: DbRow): UserCanvasTemplate {
  const seed = getCanvasTemplateSeed(row.source_key);
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    hint: row.hint ?? "",
    source_key: row.source_key,
    modules: parseCanvasTemplateModules(row.modules),
    open_context: Boolean(row.open_context),
    sort_order: row.sort_order ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    recommended: seed?.recommended,
  };
}

async function fetchTemplates(userId: string): Promise<UserCanvasTemplate[]> {
  const { data, error } = await templatesTable()
    .select("id, user_id, name, hint, source_key, modules, open_context, sort_order, created_at, updated_at")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  const rows = (data ?? []) as DbRow[];
  if (rows.length > 0) return rows.map(mapRow);

  // Seed system defaults once when the user has none.
  const seedRows = CANVAS_TEMPLATE_SEEDS.map((s, i) => ({
    user_id: userId,
    name: s.label,
    hint: s.hint,
    source_key: s.sourceKey,
    modules: s.modules,
    open_context: Boolean(s.openContext),
    sort_order: i,
  }));

  const { data: inserted, error: insertError } = await templatesTable()
    .insert(seedRows as never)
    .select("id, user_id, name, hint, source_key, modules, open_context, sort_order, created_at, updated_at");

  if (insertError) {
    // Concurrent first-load seed — re-read whatever landed.
    const { data: again, error: againErr } = await templatesTable()
      .select("id, user_id, name, hint, source_key, modules, open_context, sort_order, created_at, updated_at")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (againErr) throw insertError;
    const recovered = (again ?? []) as DbRow[];
    if (recovered.length) return recovered.map(mapRow);
    throw insertError;
  }
  return ((inserted ?? []) as DbRow[]).map(mapRow);
}

function isLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /canvas_templates_limit|max 5 templates/i.test(msg);
}

export function useCanvasTemplates() {
  const { user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();
  const queryKey = useMemo(() => ["project-canvas-templates", userId] as const, [userId]);

  const query = useQuery({
    queryKey,
    enabled: Boolean(userId),
    queryFn: () => fetchTemplates(userId!),
    staleTime: 60_000,
  });

  const templates = query.data ?? [];
  const atLimit = templates.length >= CANVAS_TEMPLATE_MAX;

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey });
  }, [qc, queryKey]);

  const createFromBlocks = useMutation({
    mutationFn: async (args: { name: string; hint?: string; blocks: ProjectContentBlock[]; openContext?: boolean }) => {
      if (!userId) throw new Error("ต้องเข้าสู่ระบบก่อน");
      const name = args.name.trim();
      if (!name) throw new Error("ใส่ชื่อเทมเพลต");
      const modules = blocksToTemplateModules(args.blocks);
      if (!modules.length) throw new Error("ยังไม่มีโมดูลบนแคนวาส");
      if (templates.length >= CANVAS_TEMPLATE_MAX) {
        throw new Error(`บันทึกได้สูงสุด ${CANVAS_TEMPLATE_MAX} เทมเพลต`);
      }
      const sort_order = templates.reduce((m, t) => Math.max(m, t.sort_order), -1) + 1;
      const { data, error } = await templatesTable()
        .insert({
          user_id: userId,
          name: name.slice(0, 80),
          hint: (args.hint ?? "").trim().slice(0, 160),
          source_key: null,
          modules,
          open_context: Boolean(args.openContext),
          sort_order,
        } as never)
        .select("id, user_id, name, hint, source_key, modules, open_context, sort_order, created_at, updated_at")
        .single();
      if (error) throw error;
      return mapRow(data as DbRow);
    },
    onSuccess: () => {
      invalidate();
      toast.success("บันทึกเทมเพลตแล้ว");
    },
    onError: (e) => {
      toast.error(isLimitError(e) ? `บันทึกได้สูงสุด ${CANVAS_TEMPLATE_MAX} เทมเพลต` : e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    },
  });

  const rename = useMutation({
    mutationFn: async (args: { id: string; name: string; hint?: string }) => {
      const name = args.name.trim();
      if (!name) throw new Error("ใส่ชื่อเทมเพลต");
      const patch: Record<string, unknown> = { name: name.slice(0, 80) };
      if (args.hint !== undefined) patch.hint = args.hint.trim().slice(0, 160);
      const { error } = await templatesTable().update(patch as never).eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("เปลี่ยนชื่อแล้ว");
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "เปลี่ยนชื่อไม่สำเร็จ");
    },
  });

  const updateModulesFromBlocks = useMutation({
    mutationFn: async (args: { id: string; blocks: ProjectContentBlock[]; openContext?: boolean }) => {
      const modules = blocksToTemplateModules(args.blocks);
      if (!modules.length) throw new Error("ยังไม่มีโมดูลบนแคนวาส");
      const patch: Record<string, unknown> = { modules };
      if (args.openContext !== undefined) patch.open_context = args.openContext;
      const { error } = await templatesTable().update(patch as never).eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("อัปเดตโครงเทมเพลตแล้ว");
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "อัปเดตไม่สำเร็จ");
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await templatesTable().delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("ลบเทมเพลตแล้ว");
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    },
  });

  const buildBlocks = useCallback((template: UserCanvasTemplate) => {
    return buildBlocksFromTemplateModules(template.modules);
  }, []);

  return {
    templates,
    isLoading: query.isLoading,
    isError: query.isError,
    atLimit,
    maxTemplates: CANVAS_TEMPLATE_MAX,
    createFromBlocks,
    rename,
    updateModulesFromBlocks,
    remove,
    buildBlocks,
    refetch: query.refetch,
  };
}
