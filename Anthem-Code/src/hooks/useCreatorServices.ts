import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CREATOR_SERVICES_SELECT,
  asCreatorServiceRow,
  asCreatorServiceRows,
  fromCreatorServices,
  type CreatorServiceRow,
} from "@/lib/creatorServicesDb";
import { pickSimilarCreatorServices } from "@/lib/similarCreatorServices";
import {
  getCategoryParent,
  parentIdForProjectCategory,
  stripCategorySubTags,
} from "@/data/categoryTaxonomy";
import { categoryDbFilterValues, normalizeProjectCategory } from "@/data/projectTypes";

export const CREATOR_SERVICES_MAX = 5;
export const CREATOR_SERVICES_GALLERY_MAX = 6;

export type CreatorServiceStatus = "Draft" | "Published";

export type CreatorService = {
  id: string;
  owner_id: string;
  title: string;
  /** Max price (THB). */
  price_thb: number;
  /** Min price (THB). */
  price_min_thb: number;
  summary: string;
  deliverables: string[];
  /** Duration in days as plain number string, e.g. "14". */
  duration_label: string;
  concepts_label: string;
  revisions_label: string;
  cover_url: string | null;
  gallery_urls: string[];
  /** Same vocabulary as projects.category */
  category: string;
  tags: string[];
  status: CreatorServiceStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type CreatorServiceInput = {
  title: string;
  price_thb: number;
  price_min_thb?: number;
  summary: string;
  deliverables: string[];
  duration_label?: string;
  concepts_label?: string;
  revisions_label?: string;
  cover_url?: string | null;
  gallery_urls?: string[];
  category?: string;
  tags?: string[];
  status?: CreatorServiceStatus;
  sort_order?: number;
};

function normalizeGallery(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((u): u is string => typeof u === "string" && !!u.trim())
    .slice(0, CREATOR_SERVICES_GALLERY_MAX);
}

function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is string => typeof t === "string" && !!t.trim())
    .map((t) => t.trim())
    .slice(0, 20);
}

function digitsOnly(raw: string | null | undefined): string {
  return String(raw ?? "").replace(/[^\d]/g, "");
}

export function mapCreatorServiceRow(row: CreatorServiceRow): CreatorService {
  const max = Number(row.price_thb) || 0;
  const minRaw = Number(row.price_min_thb);
  const min = Number.isFinite(minRaw) && minRaw > 0 ? minRaw : max;
  return {
    id: String(row.id),
    owner_id: String(row.owner_id),
    title: String(row.title ?? ""),
    price_thb: max,
    price_min_thb: Math.min(min, max),
    summary: String(row.summary ?? ""),
    deliverables: Array.isArray(row.deliverables)
      ? row.deliverables.filter((d): d is string => typeof d === "string")
      : [],
    duration_label: String(row.duration_label ?? ""),
    concepts_label: String(row.concepts_label ?? ""),
    revisions_label: String(row.revisions_label ?? ""),
    cover_url: typeof row.cover_url === "string" ? row.cover_url : null,
    gallery_urls: normalizeGallery(row.gallery_urls),
    category: String(row.category ?? "").trim(),
    tags: normalizeTags(row.tags),
    status: row.status === "Published" ? "Published" : "Draft",
    sort_order: Number(row.sort_order) || 0,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function formatServicePrice(thb: number): string {
  return `฿${thb.toLocaleString("th-TH")}`;
}

export function formatServicePriceRange(min: number, max: number): string {
  const a = Math.max(0, Math.round(min));
  const b = Math.max(0, Math.round(max));
  if (a <= 0 && b <= 0) return formatServicePrice(0);
  if (a <= 0 || a === b) return formatServicePrice(b || a);
  if (b <= 0) return formatServicePrice(a);
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return `${formatServicePrice(lo)} – ${formatServicePrice(hi)}`;
}

export function formatServiceDurationDays(raw: string | null | undefined): string {
  const n = Number.parseInt(digitsOnly(raw), 10);
  if (!Number.isFinite(n) || n <= 0) return "";
  return `${n} วัน`;
}

/** Cover first, then gallery — for cards / chat previews. */
export function servicePreviewUrls(
  svc: Pick<CreatorService, "cover_url" | "gallery_urls">,
): string[] {
  const out: string[] = [];
  if (svc.cover_url?.trim()) out.push(svc.cover_url.trim());
  for (const u of svc.gallery_urls) {
    if (u.trim() && !out.includes(u.trim())) out.push(u.trim());
  }
  return out;
}

export function useCreatorServices(ownerId: string | undefined, opts?: { includeDrafts?: boolean }) {
  const includeDrafts = opts?.includeDrafts === true;
  return useQuery({
    queryKey: ["creator-services", ownerId, includeDrafts ? "all" : "published"],
    enabled: !!ownerId,
    queryFn: async (): Promise<CreatorService[]> => {
      let q = fromCreatorServices()
        .select(CREATOR_SERVICES_SELECT)
        .eq("owner_id", ownerId!)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (!includeDrafts) q = q.eq("status", "Published");
      const { data, error } = await q;
      if (error) throw error;
      return asCreatorServiceRows(data).map(mapCreatorServiceRow);
    },
  });
}

export function useCreatorService(serviceId: string | undefined) {
  return useQuery({
    queryKey: ["creator-service", serviceId],
    enabled: !!serviceId,
    queryFn: async (): Promise<CreatorService | null> => {
      const { data, error } = await fromCreatorServices()
        .select(CREATOR_SERVICES_SELECT)
        .eq("id", serviceId!)
        .maybeSingle();
      if (error) throw error;
      const row = asCreatorServiceRow(data);
      return row ? mapCreatorServiceRow(row) : null;
    },
  });
}

export function useUpsertCreatorService(ownerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id?: string; patch: CreatorServiceInput }) => {
      if (!ownerId) throw new Error("ต้องเข้าสู่ระบบ");
      const gallery = normalizeGallery(args.patch.gallery_urls ?? []);
      let max = Math.max(0, Math.round(args.patch.price_thb));
      let min = Math.max(0, Math.round(args.patch.price_min_thb ?? max));
      if (min > max) [min, max] = [max, min];
      const payload = {
        owner_id: ownerId,
        title: args.patch.title.trim(),
        price_thb: max,
        price_min_thb: min,
        summary: args.patch.summary.trim(),
        deliverables: (args.patch.deliverables ?? []).map((d) => d.trim()).filter(Boolean),
        duration_label: digitsOnly(args.patch.duration_label),
        concepts_label: digitsOnly(args.patch.concepts_label),
        revisions_label: digitsOnly(args.patch.revisions_label),
        cover_url: args.patch.cover_url?.trim() || null,
        gallery_urls: gallery,
        category: String(args.patch.category ?? "").trim(),
        tags: normalizeTags(args.patch.tags ?? []),
        status: args.patch.status ?? "Draft",
        sort_order: args.patch.sort_order ?? 0,
        updated_at: new Date().toISOString(),
      };
      if (!payload.title) throw new Error("กรุณาใส่ชื่อบริการ");
      if (!payload.summary) throw new Error("กรุณาใส่รายละเอียด");
      if (!payload.deliverables.length) throw new Error("กรุณาใส่สิ่งได้อย่างน้อย 1 ข้อ");
      if (max <= 0) throw new Error("กรุณาใส่ช่วงราคา");
      if (payload.status === "Published" && !payload.category) {
        throw new Error("เลือกหมวดหมู่ก่อนเผยแพร่");
      }
      if (args.id) {
        const { data, error } = await fromCreatorServices()
          .update(payload)
          .eq("id", args.id)
          .eq("owner_id", ownerId)
          .select(CREATOR_SERVICES_SELECT)
          .single();
        if (error) throw error;
        const row = asCreatorServiceRow(data);
        if (!row) throw new Error("บันทึกไม่สำเร็จ");
        return mapCreatorServiceRow(row);
      }

      const { count } = await fromCreatorServices()
        .select("*", { count: "exact", head: true })
        .eq("owner_id", ownerId);
      if ((count ?? 0) >= CREATOR_SERVICES_MAX) {
        throw new Error(`ลงได้สูงสุด ${CREATOR_SERVICES_MAX} บริการ`);
      }

      const { data, error } = await fromCreatorServices()
        .insert(payload)
        .select(CREATOR_SERVICES_SELECT)
        .single();
      if (error) {
        if (String(error.message).includes("SERVICE_LIMIT")) {
          throw new Error(`ลงได้สูงสุด ${CREATOR_SERVICES_MAX} บริการ`);
        }
        throw error;
      }
      const row = asCreatorServiceRow(data);
      if (!row) throw new Error("บันทึกไม่สำเร็จ");
      return mapCreatorServiceRow(row);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["creator-services", ownerId] });
      void qc.invalidateQueries({ queryKey: ["similar-creator-services"] });
      if (vars.id) void qc.invalidateQueries({ queryKey: ["creator-service", vars.id] });
    },
  });
}

export function useDeleteCreatorService(ownerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!ownerId) throw new Error("ต้องเข้าสู่ระบบ");
      const { error } = await fromCreatorServices()
        .delete()
        .eq("id", id)
        .eq("owner_id", ownerId);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: ["creator-services", ownerId] });
      void qc.invalidateQueries({ queryKey: ["creator-service", id] });
    },
  });
}

/** Persist display order after swap / drag on the packages dashboard. */
export function useReorderCreatorServices(ownerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      if (!ownerId) throw new Error("ต้องเข้าสู่ระบบ");
      const now = new Date().toISOString();
      await Promise.all(
        orderedIds.map(async (id, index) => {
          const { error } = await fromCreatorServices()
            .update({ sort_order: index, updated_at: now })
            .eq("id", id)
            .eq("owner_id", ownerId);
          if (error) throw error;
        }),
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["creator-services", ownerId] });
    },
  });
}

export function useSimilarCreatorServices(
  service: Pick<CreatorService, "id" | "owner_id" | "category" | "tags"> | null | undefined,
  limit = 4,
) {
  return useQuery({
    queryKey: [
      "similar-creator-services",
      service?.id,
      service?.category,
      (service?.tags ?? []).join("|"),
      limit,
    ],
    enabled: !!service?.id,
    queryFn: async (): Promise<CreatorService[]> => {
      const seed = service!;
      const norm = normalizeProjectCategory(seed.category) ?? seed.category;
      const parentId = parentIdForProjectCategory(norm);
      const parent = parentId ? getCategoryParent(parentId) : null;
      const categoryValues = parent
        ? Array.from(new Set(parent.leaves.flatMap((leaf) => categoryDbFilterValues(leaf))))
        : norm
          ? categoryDbFilterValues(norm as never)
          : [];

      let q = fromCreatorServices()
        .select(CREATOR_SERVICES_SELECT)
        .eq("status", "Published")
        .neq("id", seed.id)
        .neq("owner_id", seed.owner_id)
        .order("updated_at", { ascending: false })
        .limit(48);

      if (categoryValues.length === 1) q = q.eq("category", categoryValues[0]!);
      else if (categoryValues.length > 1) q = q.in("category", categoryValues);

      const { data, error } = await q;
      if (error) throw error;

      let rows = asCreatorServiceRows(data).map(mapCreatorServiceRow);

      // Soft fallback when taxonomy is empty / no same-category peers.
      if (rows.length < limit) {
        const { data: fallback, error: fallbackError } = await fromCreatorServices()
          .select(CREATOR_SERVICES_SELECT)
          .eq("status", "Published")
          .neq("id", seed.id)
          .neq("owner_id", seed.owner_id)
          .order("updated_at", { ascending: false })
          .limit(48);
        if (fallbackError) throw fallbackError;
        const seen = new Set(rows.map((r) => r.id));
        for (const row of asCreatorServiceRows(fallback).map(mapCreatorServiceRow)) {
          if (seen.has(row.id)) continue;
          rows.push(row);
          seen.add(row.id);
        }
      }

      const tagSeed = stripCategorySubTags(seed.tags);
      return pickSimilarCreatorServices(rows, seed, limit, tagSeed);
    },
  });
}
