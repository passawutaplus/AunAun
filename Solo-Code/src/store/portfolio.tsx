import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { compressImageFile, dataUrlToBlob } from "@/lib/imageCompress";
import {
  DEFAULT_PORTFOLIO_VISIBILITY,
  parseSkillsPayload,
  slugFromDisplayName,
  validateSlug,
  type PortfolioAbout,
  type PortfolioExperienceItem,
  type PortfolioExternalLink,
  type PortfolioFeaturedItem,
  type PortfolioHero,
  type PortfolioPage,
  type PortfolioPublicPayload,
  type PortfolioResume,
  type PortfolioSkills,
  type PortfolioStatus,
  type PortfolioVisibility,
  portfolioAboutSchema,
  portfolioHeroSchema,
  portfolioResumeSchema,
  portfolioVisibilitySchema,
} from "@/lib/portfolioSchema";

const PORTFOLIO_KEY = (uid?: string) => ["portfolio_page", uid ?? "anon"] as const;

const MIGRATION_HINT =
  "ฐานข้อมูล Portfolio ยังไม่พร้อม — แจ้งทีมให้รัน migration (scripts/push-portfolio-migration.mjs)";

/** Table not yet in generated Database types until migration is applied. */
function portfolioTable() {
  return supabase.from("portfolio_pages" as never);
}

export function portfolioErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return "สร้าง Portfolio ไม่สำเร็จ";
}

function throwPortfolioError(err: unknown): never {
  const raw = portfolioErrorMessage(err);
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  if (
    code === "PGRST205" ||
    code === "42P01" ||
    /portfolio_pages/i.test(raw) ||
    /schema cache/i.test(raw)
  ) {
    throw new Error(MIGRATION_HINT);
  }
  throw new Error(raw);
}

interface Row {
  user_id: string;
  slug: string;
  status: PortfolioStatus;
  hero: unknown;
  about: unknown;
  skills: unknown;
  experience: unknown;
  featured_work: unknown;
  external_links: unknown;
  resume: unknown;
  visibility: unknown;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

function parseHero(raw: unknown): PortfolioHero {
  const parsed = portfolioHeroSchema.safeParse(raw);
  return parsed.success ? parsed.data : portfolioHeroSchema.parse({});
}

function parseAbout(raw: unknown): PortfolioAbout {
  const parsed = portfolioAboutSchema.safeParse(raw);
  return parsed.success ? parsed.data : portfolioAboutSchema.parse({});
}

function parseResume(raw: unknown): PortfolioResume {
  const parsed = portfolioResumeSchema.safeParse(raw);
  return parsed.success ? parsed.data : portfolioResumeSchema.parse({});
}

function parseVisibility(raw: unknown): PortfolioVisibility {
  const parsed = portfolioVisibilitySchema.safeParse(raw);
  return parsed.success ? parsed.data : { ...DEFAULT_PORTFOLIO_VISIBILITY };
}

function parseExperience(raw: unknown): PortfolioExperienceItem[] {
  if (!Array.isArray(raw)) return [];
  return raw as PortfolioExperienceItem[];
}

function parseFeatured(raw: unknown): PortfolioFeaturedItem[] {
  if (!Array.isArray(raw)) return [];
  return raw as PortfolioFeaturedItem[];
}

function parseLinks(raw: unknown): PortfolioExternalLink[] {
  if (!Array.isArray(raw)) return [];
  return raw as PortfolioExternalLink[];
}

function rowToPage(r: Row): PortfolioPage {
  return {
    userId: r.user_id,
    slug: r.slug,
    status: r.status,
    hero: parseHero(r.hero),
    about: parseAbout(r.about),
    skills: parseSkillsPayload(r.skills),
    experience: parseExperience(r.experience),
    featuredWork: parseFeatured(r.featured_work),
    externalLinks: parseLinks(r.external_links),
    resume: parseResume(r.resume),
    visibility: parseVisibility(r.visibility),
    publishedAt: r.published_at ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function pageToRow(page: PortfolioPage): Omit<Row, "created_at" | "updated_at"> {
  return {
    user_id: page.userId,
    slug: page.slug,
    status: page.status,
    hero: page.hero,
    about: page.about,
    skills: page.skills,
    experience: page.experience,
    featured_work: page.featuredWork,
    external_links: page.externalLinks,
    resume: page.resume,
    visibility: page.visibility,
    published_at: page.publishedAt ?? null,
  };
}

export type PortfolioPatch = {
  slug?: string;
  status?: PortfolioStatus;
  hero?: Partial<PortfolioHero>;
  about?: Partial<PortfolioAbout>;
  skills?: PortfolioSkills;
  experience?: PortfolioExperienceItem[];
  featuredWork?: PortfolioFeaturedItem[];
  externalLinks?: PortfolioExternalLink[];
  resume?: Partial<PortfolioResume>;
  visibility?: Partial<PortfolioVisibility>;
  publishedAt?: string | null;
};

export function publicPayloadToPage(payload: PortfolioPublicPayload): Omit<
  PortfolioPage,
  "userId" | "createdAt" | "updatedAt"
> & { status: PortfolioStatus } {
  return {
    slug: payload.slug,
    status: "published",
    hero: parseHero(payload.hero),
    about: parseAbout(payload.about),
    skills: parseSkillsPayload(payload.skills),
    experience: parseExperience(payload.experience),
    featuredWork: parseFeatured(payload.featured_work),
    externalLinks: parseLinks(payload.external_links),
    resume: parseResume(payload.resume),
    visibility: parseVisibility(payload.visibility),
    publishedAt: payload.published_at,
  };
}

export type PortfolioUploadKind = "avatar" | "resume" | "work";

export async function uploadPortfolioFile(
  userId: string,
  kind: PortfolioUploadKind,
  file: File,
): Promise<string> {
  let blob: Blob = file;
  let contentType = file.type;
  let ext = (file.name.split(".").pop() ?? "bin").toLowerCase();

  if (file.type.startsWith("image/") && file.type !== "image/svg+xml") {
    const dataUrl = await compressImageFile(file);
    blob = dataUrlToBlob(dataUrl);
    contentType = "image/jpeg";
    ext = "jpg";
  }

  const path = `${userId}/${kind}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("portfolio-media").upload(path, blob, {
    upsert: true,
    contentType,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("portfolio-media").getPublicUrl(path);
  return data.publicUrl;
}

export function usePortfolio() {
  const { user, profile } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();

  const page = useQuery({
    queryKey: PORTFOLIO_KEY(uid),
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await portfolioTable()
        .select("*")
        .eq("user_id", uid!)
        .maybeSingle();
      if (error) throwPortfolioError(error);
      return data ? rowToPage(data as unknown as Row) : null;
    },
  });

  const checkSlug = async (slug: string): Promise<boolean> => {
    const normalized = slug.toLowerCase().trim();
    const { data, error } = await portfolioTable()
      .select("user_id")
      .eq("slug", normalized)
      .maybeSingle();
    if (error) throwPortfolioError(error);
    if (!data) return true;
    return (data as { user_id: string }).user_id === uid;
  };

  const ensurePortfolio = useMutation({
    mutationFn: async () => {
      if (!uid) throw new Error("กรุณาเข้าสู่ระบบก่อน");
      const existing = page.data;
      if (existing) return existing;

      const displayName = profile?.display_name?.trim() || profile?.brand_name?.trim() || "Freelancer";
      let slug = slugFromDisplayName(displayName);
      const validation = validateSlug(slug);
      if (!validation.ok) slug = slugFromDisplayName(`user-${uid.slice(0, 8)}`);

      let available = await checkSlug(slug);
      if (!available) {
        slug = `${slug}-${uid.slice(0, 6)}`;
        available = await checkSlug(slug);
        if (!available) throw new Error("ไม่สามารถสร้าง slug ได้ กรุณาตั้งเอง");
      }

      const hero: PortfolioHero = {
        displayName,
        headline: profile?.tagline?.trim() ?? "",
        avatarUrl: profile?.logo_url?.trim() ?? "",
        location: "",
        availability: "available",
        email: user?.email ?? "",
        phone: profile?.phone?.trim() ?? "",
        lineId: "",
      };

      const row = {
        user_id: uid,
        slug,
        status: "draft" as const,
        hero,
        about: { bio: "" },
        skills: { tags: [], services: [] },
        experience: [],
        featured_work: [],
        external_links: [],
        resume: { fileUrl: "", fileName: "", label: "ดาวน์โหลด CV" },
        visibility: DEFAULT_PORTFOLIO_VISIBILITY,
      };

      const { data, error } = await portfolioTable().insert(row as never).select("*").single();
      if (error) throwPortfolioError(error);
      return rowToPage(data as unknown as Row);
    },
    onSuccess: (data) => {
      qc.setQueryData(PORTFOLIO_KEY(uid), data);
    },
  });

  const save = useMutation({
    mutationFn: async (patch: PortfolioPatch) => {
      if (!uid) throw new Error("Not signed in");
      const current = page.data ?? (await ensurePortfolio.mutateAsync());
      const next: PortfolioPage = {
        ...current,
        ...patch,
        hero: patch.hero ? { ...current.hero, ...patch.hero } : current.hero,
        about: patch.about ? { ...current.about, ...patch.about } : current.about,
        skills: patch.skills ?? current.skills,
        experience: patch.experience ?? current.experience,
        featuredWork: patch.featuredWork ?? current.featuredWork,
        externalLinks: patch.externalLinks ?? current.externalLinks,
        resume: patch.resume ? { ...current.resume, ...patch.resume } : current.resume,
        visibility: patch.visibility
          ? { ...current.visibility, ...patch.visibility }
          : current.visibility,
        publishedAt:
          patch.publishedAt !== undefined
            ? patch.publishedAt ?? undefined
            : current.publishedAt,
      };

      if (patch.slug && patch.slug !== current.slug) {
        const v = validateSlug(patch.slug);
        if (!v.ok) throw new Error(v.reason);
        const available = await checkSlug(v.slug);
        if (!available) throw new Error("slug นี้ถูกใช้แล้ว");
        next.slug = v.slug;
      }

      const { data, error } = await portfolioTable()
        .update(pageToRow(next) as never)
        .eq("user_id", uid)
        .select("*")
        .single();
      if (error) throwPortfolioError(error);
      return rowToPage(data as unknown as Row);
    },
    onSuccess: (data) => {
      qc.setQueryData(PORTFOLIO_KEY(uid), data);
    },
  });

  const setPublished = useMutation({
    mutationFn: async (published: boolean) => {
      if (!uid) throw new Error("Not signed in");
      const current = page.data ?? (await ensurePortfolio.mutateAsync());
      const patch: PortfolioPatch = {
        status: published ? "published" : "draft",
        publishedAt: published ? new Date().toISOString() : null,
      };
      if (published && !current.hero.displayName?.trim()) {
        throw new Error("กรุณาระบุชื่อที่แสดงก่อนเผยแพร่");
      }
      return save.mutateAsync(patch);
    },
    onSuccess: (data) => {
      qc.setQueryData(PORTFOLIO_KEY(uid), data);
    },
  });

  return {
    page: page.data ?? null,
    isLoading: page.isLoading,
    isError: page.isError,
    error: page.error,
    refetch: page.refetch,
    ensurePortfolio: ensurePortfolio.mutateAsync,
    isEnsuring: ensurePortfolio.isPending,
    save: save.mutateAsync,
    isSaving: save.isPending,
    setPublished: setPublished.mutateAsync,
    isPublishing: setPublished.isPending,
    checkSlug,
    uploadFile: (kind: PortfolioUploadKind, file: File) => {
      if (!uid) return Promise.reject(new Error("Not signed in"));
      return uploadPortfolioFile(uid, kind, file);
    },
  };
}
