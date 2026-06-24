import { supabase } from "@/integrations/supabase/client";
import type { BriefClientInfo, BriefReference, DesignBrief } from "@/lib/briefSchema";
import { emptyBrief } from "@/lib/briefSchema";
import type { AiBriefExtractResult } from "@/lib/briefExtractTypes";

export type BriefFromExtractOptions = {
  userId: string;
  result: AiBriefExtractResult;
  noteText?: string;
  images?: BriefReference[];
  clientAssets?: BriefClientInfo;
  titleOverride?: string;
};

export function buildBriefInsertPayload(opts: BriefFromExtractOptions) {
  const { userId, result, noteText = "", images = [], clientAssets = {}, titleOverride } = opts;
  const base = emptyBrief();
  const title =
    titleOverride?.trim() ||
    result.client.brand?.trim() ||
    result.client.name?.trim() ||
    result.goal?.split("\n")[0]?.slice(0, 50)?.trim() ||
    "บรีฟใหม่";

  const scope_items = result.deliverables.map((d) => ({
    name: d.name,
    quantity: d.quantity,
    note: d.formats.length ? `ไฟล์: ${d.formats.join(", ")}` : undefined,
  }));

  const formatsSet = new Set<string>();
  result.deliverables.forEach((d) => d.formats.forEach((f) => formatsSet.add(f)));

  const notesParts: string[] = [];
  if (noteText.trim()) notesParts.push(`[Live Chat Note]\n${noteText.trim()}`);
  if (result.note) notesParts.push(`[หมายเหตุจาก AI]\n${result.note}`);
  if (result.reference) notesParts.push(`[Reference]\n${result.reference}`);

  return {
    user_id: userId,
    title,
    status: "draft" as const,
    client_info: {
      client_id: clientAssets.client_id,
      client_name: result.client.name || clientAssets.client_name || undefined,
      brand_name: result.client.brand || clientAssets.brand_name || undefined,
      contact_line: result.client.contact || clientAssets.contact_line || undefined,
      contact_email: clientAssets.contact_email,
      contact_phone: clientAssets.contact_phone,
      logo_url: clientAssets.logo_url,
      ci_image_url: clientAssets.ci_image_url,
      ci_palette: clientAssets.ci_palette,
      past_works: clientAssets.past_works,
    },
    project_overview: {
      ...base.project_overview,
      project_name: title,
      goal: result.goal || undefined,
      problem: result.proposition || undefined,
      proposition: result.proposition || undefined,
      element_design: result.element_design || undefined,
      style_name: result.style || undefined,
      scope_items: scope_items.length ? scope_items : undefined,
    },
    design_direction: {
      moods: [],
      inspiration: result.reference || undefined,
    },
    tech_specs: {
      formats: Array.from(formatsSet),
    },
    timeline_budget: {
      draft_date: result.timeline.start || undefined,
      deadline: result.timeline.deadline || undefined,
      budget: result.budget || undefined,
    },
    notes: notesParts.join("\n\n"),
    references: images,
  };
}

export function rowToDesignBrief(row: Record<string, unknown>): DesignBrief {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    project_id: (row.project_id as string | null) ?? null,
    share_token: row.share_token as string,
    title: row.title as string,
    status: row.status as DesignBrief["status"],
    client_info: (row.client_info as DesignBrief["client_info"]) ?? {},
    project_overview: (row.project_overview as DesignBrief["project_overview"]) ?? {},
    audience: (row.audience as DesignBrief["audience"]) ?? {},
    design_direction: (row.design_direction as DesignBrief["design_direction"]) ?? { moods: [] },
    tech_specs: (row.tech_specs as DesignBrief["tech_specs"]) ?? { formats: [] },
    timeline_budget: (row.timeline_budget as DesignBrief["timeline_budget"]) ?? {},
    notes: (row.notes as string) ?? "",
    references: (row.references as DesignBrief["references"]) ?? [],
    ai_analysis: row.ai_analysis as DesignBrief["ai_analysis"],
    confirmed_at: row.confirmed_at as string | null,
    confirmed_by_name: row.confirmed_by_name as string | null,
    confirmed_signature: row.confirmed_signature as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function saveBriefFromExtractResult(opts: BriefFromExtractOptions): Promise<DesignBrief> {
  const payload = buildBriefInsertPayload(opts);
  const { data, error } = await supabase
    .from("design_briefs")
    .insert(payload as never)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "บันทึกไม่สำเร็จ");
  return rowToDesignBrief(data as Record<string, unknown>);
}

/** Hand off saved brief → Quotations tab (same pattern as BriefsTab). */
export function handoffBriefToQuotation(b: DesignBrief) {
  const scopeItems = (b.project_overview.scope_items ?? []).filter((x) => x.name?.trim());
  const briefNoteLines: string[] = [];
  if (b.project_overview.goal) briefNoteLines.push(`เป้าหมาย: ${b.project_overview.goal}`);
  if (b.project_overview.problem) briefNoteLines.push(`โจทย์: ${b.project_overview.problem}`);
  if (b.timeline_budget.budget)
    briefNoteLines.push(`งบที่ลูกค้าให้: ${b.timeline_budget.budget}`);

  const handoff = {
    briefId: b.id,
    projectName: b.project_overview.project_name || b.title,
    clientName: b.client_info.client_name || "",
    clientPhone: b.client_info.contact_phone || "",
    clientEmail: b.client_info.contact_email || "",
    clientLineId: b.client_info.contact_line || "",
    startDate: b.timeline_budget.draft_date || undefined,
    endDate: b.timeline_budget.deadline || undefined,
    items: scopeItems.map((it) => ({
      name: it.name,
      description: it.note || undefined,
      quantity: Number(it.quantity) > 0 ? Number(it.quantity) : 1,
      unitPrice: 0,
    })),
    notes: briefNoteLines.join("\n"),
    briefUpdatedAt: b.updated_at,
  };
  sessionStorage.setItem("so1o.openQuotationFromBrief", JSON.stringify(handoff));
  window.location.href = "/dashboard?tab=finance&sub=quotations";
}
