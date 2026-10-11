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

export const CREATOR_SERVICES_MAX = 6;
export const CREATOR_SERVICES_GALLERY_MAX = 6;
export const CREATOR_SERVICES_REF_PROJECTS_MAX = 3;

export type CreatorServiceStatus = "Draft" | "Published";

/** Levels of one package (e.g. Basic / Standard / Premium) — each with its own price and scope. */
export type PackageTier = {
  name: string;
  summary: string;
  price_thb: number;
  duration_days: number;
  deliverables: string[];
  /** 0 = not stated */
  revisions: number;
  exclusions: string;
};
/** Paid extras on top of a package (e.g. rush delivery). */
export type PackageAddon = { label: string; price_thb: number };
export type PackageFaq = { q: string; a: string };

export const PACKAGE_TIERS_MAX = 3;
export const PACKAGE_ADDONS_MAX = 6;
export const PACKAGE_FAQ_MAX = 8;
/** Guard rails for the editor (THB / days). */
export const PACKAGE_PRICE_CEILING = 10_000_000;
export const PACKAGE_DAYS_CEILING = 365;

const clampMoney = (v: unknown) => Math.min(PACKAGE_PRICE_CEILING, Math.max(0, Math.round(Number(v) || 0)));

export function normalizeTiers(raw: unknown): PackageTier[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => {
      const o = (t ?? {}) as Record<string, unknown>;
      return {
        name: String(o.name ?? "").trim().slice(0, 40),
        summary: String(o.summary ?? "").trim().slice(0, 200),
        price_thb: clampMoney(o.price_thb),
        duration_days: Math.min(PACKAGE_DAYS_CEILING, Math.max(0, Math.round(Number(o.duration_days) || 0))),
        deliverables: Array.isArray(o.deliverables)
          ? o.deliverables.map((d) => String(d ?? "").trim()).filter(Boolean).slice(0, 10)
          : [],
        revisions: Math.min(99, Math.max(0, Math.round(Number(o.revisions) || 0))),
        exclusions: String(o.exclusions ?? "").trim().slice(0, 500),
      };
    })
    .filter((t) => t.name || t.price_thb > 0 || t.deliverables.length > 0)
    .slice(0, PACKAGE_TIERS_MAX);
}

/** Cheapest first — the first tier is the "starting" price shown on cards. */
export function sortTiers(tiers: PackageTier[]): PackageTier[] {
  return [...tiers].sort((a, b) => a.price_thb - b.price_thb);
}

/** Packages saved before tiers existed: one tier built from the old flat fields. */
export function tiersOf(svc: Pick<
  CreatorService,
  "tiers" | "price_min_thb" | "price_thb" | "duration_label" | "deliverables" | "revisions_label" | "exclusions_note"
>): PackageTier[] {
  if (svc.tiers?.length) return svc.tiers;
  return [
    {
      name: "Basic",
      summary: "",
      price_thb: Math.max(0, Math.round(svc.price_min_thb || svc.price_thb || 0)),
      duration_days: Number.parseInt(String(svc.duration_label ?? "").replace(/[^d]/g, ""), 10) || 0,
      deliverables: (svc.deliverables ?? []).filter((d) => d.trim() && d.trim() !== "—"),
      revisions: Number.parseInt(String(svc.revisions_label ?? "").replace(/[^d]/g, ""), 10) || 0,
      exclusions: svc.exclusions_note ?? "",
    },
  ];
}

/**
 * Tiers are the source of truth for pricing; the flat columns (used by the feed, filters and compare)
 * mirror them: price range = cheapest..dearest tier, scope = cheapest tier.
 */
export function applyTiersToInput(patch: CreatorServiceInput): CreatorServiceInput {
  const tiers = sortTiers(normalizeTiers(patch.tiers ?? []));
  if (!tiers.length) return patch;
  const first = tiers[0];
  const last = tiers[tiers.length - 1];
  return {
    ...patch,
    tiers,
    price_min_thb: first.price_thb,
    price_thb: last.price_thb,
    duration_label: first.duration_days ? String(first.duration_days) : "",
    deliverables: first.deliverables,
    revisions_label: first.revisions ? String(first.revisions) : "",
    exclusions_note: first.exclusions,
  };
}

/** Problems that block saving tiers (empty list = fine). */
export function tierProblems(tiers: PackageTier[], forPublish: boolean): string[] {
  const out: string[] = [];
  if (!tiers.length) {
    out.push("เพิ่มระดับแพ็กเกจอย่างน้อย 1 ระดับ");
    return out;
  }
  tiers.forEach((t, i) => {
    const n = t.name.trim() || `ระดับที่ ${i + 1}`;
    if (!t.name.trim()) out.push(`ตั้งชื่อระดับที่ ${i + 1}`);
    if (t.price_thb <= 0) out.push(`ใส่ราคาของ ${n}`);
    if (t.price_thb > PACKAGE_PRICE_CEILING) out.push(`ราคาของ ${n} สูงเกินกำหนด`);
    if (forPublish && t.duration_days <= 0) out.push(`ใส่จำนวนวันทำงานของ ${n}`);
    if (t.duration_days > PACKAGE_DAYS_CEILING) out.push(`ระยะเวลาของ ${n} ไม่เกิน ${PACKAGE_DAYS_CEILING} วัน`);
    if (!t.deliverables.some((d) => d.trim())) out.push(`ใส่สิ่งที่ส่งมอบของ ${n} อย่างน้อย 1 ข้อ`);
  });
  const prices = tiers.map((t) => t.price_thb).filter((p) => p > 0);
  if (new Set(prices).size !== prices.length) out.push("ราคาแต่ละระดับต้องไม่เท่ากัน");
  return out;
}

export function normalizeAddons(raw: unknown): PackageAddon[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((a) => {
      const o = (a ?? {}) as Record<string, unknown>;
      return { label: String(o.label ?? "").trim().slice(0, 80), price_thb: clampMoney(o.price_thb) };
    })
    .filter((a) => a.label)
    .slice(0, PACKAGE_ADDONS_MAX);
}

export function normalizeFaq(raw: unknown): PackageFaq[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f) => {
      const o = (f ?? {}) as Record<string, unknown>;
      return { q: String(o.q ?? "").trim().slice(0, 160), a: String(o.a ?? "").trim().slice(0, 600) };
    })
    .filter((f) => f.q && f.a)
    .slice(0, PACKAGE_FAQ_MAX);
}

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
  /** Optional exclusions (สิ่งที่ไม่รวม). */
  exclusions_note: string;
  cover_url: string | null;
  gallery_urls: string[];
  /** Same vocabulary as projects.category */
  category: string;
  tags: string[];
  /** Curated sample works from the creator's published portfolio */
  reference_project_ids: string[];
  status: CreatorServiceStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
  tiers: PackageTier[];
  addons: PackageAddon[];
  faq: PackageFaq[];
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
  exclusions_note?: string;
  cover_url?: string | null;
  gallery_urls?: string[];
  category?: string;
  tags?: string[];
  reference_project_ids?: string[];
  status?: CreatorServiceStatus;
  sort_order?: number;
  tiers?: PackageTier[];
  addons?: PackageAddon[];
  faq?: PackageFaq[];
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

function normalizeProjectIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of raw) {
    if (typeof id !== "string") continue;
    const v = id.trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= CREATOR_SERVICES_REF_PROJECTS_MAX) break;
  }
  return out;
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
    exclusions_note: String(row.exclusions_note ?? "").trim(),
    cover_url: typeof row.cover_url === "string" ? row.cover_url : null,
    gallery_urls: normalizeGallery(row.gallery_urls),
    category: String(row.category ?? "").trim(),
    tags: normalizeTags(row.tags),
    reference_project_ids: normalizeProjectIds(row.reference_project_ids),
    status: row.status === "Published" ? "Published" : "Draft",
    sort_order: Number(row.sort_order) || 0,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    tiers: normalizeTiers(row.tiers),
    addons: normalizeAddons(row.addons),
    faq: normalizeFaq(row.faq),
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

export function formatServiceRevisions(raw: string | null | undefined): string {
  const n = Number.parseInt(digitsOnly(raw), 10);
  if (!Number.isFinite(n) || n <= 0) return "";
  return `${n} รอบ`;
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
    mutationFn: async (raw: { id?: string; patch: CreatorServiceInput }) => {
      if (!ownerId) throw new Error("ต้องเข้าสู่ระบบ");
      const args = { ...raw, patch: applyTiersToInput(raw.patch) };
      const tierIssue = args.patch.tiers?.length ? tierProblems(args.patch.tiers, args.patch.status === "Published")[0] : null;
      if (tierIssue) throw new Error(tierIssue);
      const gallery = normalizeGallery(args.patch.gallery_urls ?? []);
      const max = Math.max(0, Math.round(args.patch.price_thb));
      const min = Math.max(0, Math.round(args.patch.price_min_thb ?? max));
      if (min > max) throw new Error("ราคาเริ่มต้นต้องไม่มากกว่าราคาสูงสุด");
      if (max > PACKAGE_PRICE_CEILING) throw new Error(`ราคาสูงสุดไม่เกิน ฿${PACKAGE_PRICE_CEILING.toLocaleString("th-TH")}`);
      const days = Number.parseInt(digitsOnly(args.patch.duration_label), 10);
      if (Number.isFinite(days) && days > PACKAGE_DAYS_CEILING) throw new Error(`ระยะเวลาไม่เกิน ${PACKAGE_DAYS_CEILING} วัน`);
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
        exclusions_note: String(args.patch.exclusions_note ?? "").trim().slice(0, 500),
        cover_url: args.patch.cover_url?.trim() || null,
        gallery_urls: gallery,
        category: String(args.patch.category ?? "").trim(),
        tags: normalizeTags(args.patch.tags ?? []),
        reference_project_ids: normalizeProjectIds(args.patch.reference_project_ids ?? []),
        status: args.patch.status ?? "Draft",
        tiers: normalizeTiers(args.patch.tiers ?? []),
        addons: normalizeAddons(args.patch.addons ?? []),
        faq: normalizeFaq(args.patch.faq ?? []),
        updated_at: new Date().toISOString(),
      };
      if (!payload.title) throw new Error("กรุณาใส่ชื่อบริการ");
      if (!payload.summary) throw new Error("กรุณาใส่รายละเอียด");
      if (!payload.deliverables.length) throw new Error("กรุณาใส่สิ่งที่ส่งมอบอย่างน้อย 1 ข้อ");
      if (max <= 0) throw new Error("กรุณาใส่ช่วงราคา");
      if (payload.status === "Published" && !payload.category) {
        throw new Error("เลือกหมวดหมู่ก่อนเผยแพร่");
      }
      if (payload.status === "Published" && !payload.reference_project_ids.length) {
        throw new Error("เลือกผลงานตัวอย่างอย่างน้อย 1 ชิ้นก่อนเผยแพร่");
      }
      if (args.id) {
        // Editing keeps the dashboard order — sort_order is only touched by the reorder action.
        const { data, error } = await fromCreatorServices()
          .update(args.patch.sort_order === undefined ? payload : { ...payload, sort_order: args.patch.sort_order })
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
        .insert({ ...payload, sort_order: args.patch.sort_order ?? count ?? 0 })
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
      void qc.invalidateQueries({ queryKey: ["package-feed"] });
      void qc.invalidateQueries({ queryKey: ["package-feed-listing-stats"] });
      void qc.invalidateQueries({ queryKey: ["creator-service-bookmarks-cards"] });
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
      void qc.invalidateQueries({ queryKey: ["similar-creator-services"] });
      void qc.invalidateQueries({ queryKey: ["package-feed"] });
      void qc.invalidateQueries({ queryKey: ["package-feed-listing-stats"] });
      void qc.invalidateQueries({ queryKey: ["creator-service-bookmarks-cards"] });
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
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return useQuery({
    queryKey: [
      "similar-creator-services",
      service?.id,
      service?.owner_id,
      service?.category,
      (service?.tags ?? []).join("|"),
      limit,
    ],
    enabled: !!service?.owner_id && uuidRe.test(service.owner_id),
    queryFn: async (): Promise<CreatorService[]> => {
      const seed = service!;
      const seedIdOk = uuidRe.test(seed.id);
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
        .neq("owner_id", seed.owner_id)
        .order("updated_at", { ascending: false })
        .limit(48);

      if (seedIdOk) q = q.neq("id", seed.id);
      if (categoryValues.length === 1) q = q.eq("category", categoryValues[0]!);
      else if (categoryValues.length > 1) q = q.in("category", categoryValues);

      const { data, error } = await q;
      if (error) throw error;

      let rows = asCreatorServiceRows(data).map(mapCreatorServiceRow);

      // Soft fallback when taxonomy is empty / no same-category peers.
      if (rows.length < limit) {
        let fallbackQ = fromCreatorServices()
          .select(CREATOR_SERVICES_SELECT)
          .eq("status", "Published")
          .neq("owner_id", seed.owner_id)
          .order("updated_at", { ascending: false })
          .limit(48);
        if (seedIdOk) fallbackQ = fallbackQ.neq("id", seed.id);
        const { data: fallback, error: fallbackError } = await fallbackQ;
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
