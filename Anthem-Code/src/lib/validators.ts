import { z } from "zod";
import { LICENSE_TYPES } from "@/lib/licenses";
import {
  COMMUNITY_MEDIA_MAX_IMAGES,
  COMMUNITY_MEDIA_MAX_ITEMS,
  COMMUNITY_MEDIA_MAX_VIDEOS,
} from "@/lib/communityLimits";
import { PROJECT_ASSET_FILE_MAX_BYTES } from "@/lib/projectAssets";

export const communityMediaAspectSchema = z.enum([
  "square",
  "portrait",
  "portrait916",
  "landscape",
  "landscape54",
]);
export type CommunityMediaAspectInput = z.infer<typeof communityMediaAspectSchema>;

function refineCommunityMedia(
  val: { galleryUrls: string[]; videoUrls: string[] },
  ctx: z.RefinementCtx,
) {
  if (val.galleryUrls.length > COMMUNITY_MEDIA_MAX_IMAGES) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `รูปไม่เกิน ${COMMUNITY_MEDIA_MAX_IMAGES} ภาพ/โพสต์`,
      path: ["galleryUrls"],
    });
  }
  if (val.videoUrls.length > COMMUNITY_MEDIA_MAX_VIDEOS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `วิดีโอไม่เกิน ${COMMUNITY_MEDIA_MAX_VIDEOS} คลิป/โพสต์`,
      path: ["videoUrls"],
    });
  }
  if (val.galleryUrls.length + val.videoUrls.length > COMMUNITY_MEDIA_MAX_ITEMS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `สื่อรวมไม่เกิน ${COMMUNITY_MEDIA_MAX_ITEMS} ไฟล์/โพสต์ (รูป+วิดีโอ)`,
      path: ["galleryUrls"],
    });
  }
}

export const thaiPhoneRegex = /^(0[6-9]\d{8}|\+66[6-9]\d{8})$/;

/** Minimal contact info for instant hire chat (prefilled from profile). */
export const hireRequestQuickSchema = z.object({
  clientName: z.string().trim().min(1, "กรุณากรอกชื่อ").max(100),
  email: z.string().trim().email("อีเมลไม่ถูกต้อง").max(255),
});

export const hireRequestSchema = z.object({
  clientName: z.string().trim().min(1, "กรุณากรอกชื่อ").max(100),
  email: z.string().trim().email("อีเมลไม่ถูกต้อง").max(255),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || thaiPhoneRegex.test(v), "เบอร์โทรไทยไม่ถูกต้อง"),
  budgetAmount: z
    .union([z.number().int().nonnegative().max(10_000_000), z.nan()])
    .optional(),
  deadline: z.string().trim().max(50).optional(),
  message: z.string().trim().max(1000).optional(),
});

/** Optional brief fields on the hire invite form. */
export const hireInviteBriefSchema = z.object({
  jobType: z.string().trim().max(50).optional(),
  details: z.string().trim().max(1000).optional(),
  budgetAmount: z.number().int().positive().max(10_000_000).optional(),
  deadline: z.string().trim().max(50).optional(),
});

export type HireRequestInput = z.infer<typeof hireRequestSchema>;
export type HireRequestQuickInput = z.infer<typeof hireRequestQuickSchema>;

export const experienceItemSchema = z.object({
  title: z.string().trim().min(1, "กรอกตำแหน่ง").max(80),
  company: z.string().trim().max(80).optional().default(""),
  period: z.string().trim().max(60).optional().default(""),
  description: z.string().trim().max(400).optional().default(""),
});
export type ExperienceItem = z.infer<typeof experienceItemSchema>;

const communityQuestionTopicSchema = z.enum([
  "feedback",
  "technique",
  "tools",
  "career",
  "client",
  "inspiration",
  "other",
]);

export const communityPostSchema = z.object({
  title: z.string().trim().max(120).optional().default(""),
  body: z.string().trim().min(10, "อย่างน้อย 10 ตัวอักษร").max(3000),
  tags: z.array(z.string().trim().min(1).max(40)).max(8).optional().default([]),
  tools: z.array(z.string().trim().min(1).max(40)).max(8).optional().default([]),
  mentionedProjectIds: z.array(z.string().uuid()).max(3).optional().default([]),
  taggedUserIds: z.array(z.string().uuid()).max(5).optional().default([]),
  mediaAspect: communityMediaAspectSchema.optional().default("square"),
  galleryUrls: z.array(z.string().url()).max(COMMUNITY_MEDIA_MAX_IMAGES).optional().default([]),
  videoUrls: z.array(z.string().url()).max(COMMUNITY_MEDIA_MAX_VIDEOS).optional().default([]),
}).superRefine(refineCommunityMedia);

export type CommunityPostInput = z.infer<typeof communityPostSchema>;

export const communityPostDraftSchema = z.object({
  title: z.string().trim().max(120).optional().default(""),
  body: z.string().trim().max(3000).optional().default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(8).optional().default([]),
  tools: z.array(z.string().trim().min(1).max(40)).max(8).optional().default([]),
  mentionedProjectIds: z.array(z.string().uuid()).max(3).optional().default([]),
  taggedUserIds: z.array(z.string().uuid()).max(5).optional().default([]),
  mediaAspect: communityMediaAspectSchema.optional().default("square"),
  galleryUrls: z.array(z.string().url()).max(COMMUNITY_MEDIA_MAX_IMAGES).optional().default([]),
  videoUrls: z.array(z.string().url()).max(COMMUNITY_MEDIA_MAX_VIDEOS).optional().default([]),
}).superRefine(refineCommunityMedia);

export type CommunityPostDraftInput = z.infer<typeof communityPostDraftSchema>;

/** @deprecated Legacy shape — kept for admin/import paths that still pass postKind. */
export const communityPostLegacySchema = z
  .object({
    postKind: z.enum(["tip", "question"]),
    title: z.string().trim().min(3, "อย่างน้อย 3 ตัวอักษร").max(120),
    body: z.string().trim().min(10, "อย่างน้อย 10 ตัวอักษร").max(3000),
    category: z.string().trim().min(1, "เลือกหมวด"),
    tags: z.array(z.string().trim().min(1).max(40)).max(8).optional().default([]),
    galleryUrls: z.array(z.string().url()).max(20).optional().default([]),
    videoUrls: z.array(z.string().url()).max(3).optional().default([]),
    questionTopic: communityQuestionTopicSchema.nullable().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.postKind === "question" && !val.questionTopic) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "เลือกประเภทคำถาม",
        path: ["questionTopic"],
      });
    }
  });

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, "กรุณากรอกชื่อ").max(60),
  username: z
    .string()
    .trim()
    .min(2, "อย่างน้อย 2 ตัวอักษร")
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/, "ใช้ได้เฉพาะ a-z, 0-9, _ และ ."),
  bio: z.string().trim().max(500).optional().default(""),
  role: z.string().trim().max(60).optional().default(""),
  location: z.string().trim().max(80).optional().default(""),
  email: z.string().trim().email("อีเมลไม่ถูกต้อง").max(255),
  phone: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((v) => !v || thaiPhoneRegex.test(v), "เบอร์โทรไทยไม่ถูกต้อง"),
  website: z
    .string()
    .trim()
    .url("URL ไม่ถูกต้อง")
    .max(255)
    .refine((v) => /^https?:\/\//i.test(v), "ต้องขึ้นต้นด้วย http:// หรือ https://")
    .optional()
    .or(z.literal("")),
  lineId: z.string().trim().max(50).optional().default(""),
  facebook: z
    .string()
    .trim()
    .max(200)
    .refine(
      (v) => !v || /^https?:\/\//i.test(v) || /^[a-zA-Z0-9.\-_]+$/.test(v),
      "ใส่ URL https:// หรือชื่อผู้ใช้เท่านั้น"
    )
    .optional()
    .default(""),
  instagram: z.string().trim().max(50).optional().default(""),

  notifyEmail: z.boolean().default(true),
  notifyHire: z.boolean().default(true),
  notifyJobMatch: z.boolean().default(true),
  preferredCategories: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  preferredEmploymentTypes: z.array(z.string().trim().min(1).max(20)).max(10).default([]),
  opportunityStatus: z.enum(["open_to_opportunities", "soft_open", "not_available"]).default("open_to_opportunities"),
  opportunityTypes: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  skills: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  experience: z.array(experienceItemSchema).max(20).default([]),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const projectSchema = z.object({
  title: z.string().trim().min(3, "อย่างน้อย 3 ตัวอักษร").max(120),
  subtitle: z.string().trim().max(180).optional().default(""),
  description: z.string().trim().max(5000).optional().default(""),
  category: z.string().trim().min(1, "เลือกหมวดงาน"),
  cover_url: z.string().trim().url("ต้องอัปโหลดภาพปก").or(z.literal("")),
  gallery_urls: z.array(z.string().url()).max(20, "ไม่เกิน 20 ภาพ").default([]),
  video_urls: z.array(z.string().url()).max(5, "ไม่เกิน 5 วิดีโอ").default([]),
  tools: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  tags: z.array(z.string().trim().min(1).max(30)).max(15).default([]),
  price_thb: z.number().int().min(0).max(10_000_000).nullable().optional(),
  status: z.enum(["Published", "Draft", "Private"]),
  allow_hire: z.boolean().default(true),
  allow_collab: z.boolean().default(true),
  studio_id: z.string().uuid().nullable().optional(),
  credited_user_ids: z.array(z.string().uuid()).max(20).default([]),
  linked_community_post_ids: z.array(z.string().uuid()).max(5).default([]),
  collab_user_ids: z.array(z.string().uuid()).max(5).default([]),
  license_type: z.enum(LICENSE_TYPES).default("all_rights"),
  license_note: z.string().trim().max(500).optional().default(""),
  has_third_party_assets: z.boolean().default(false),
  third_party_note: z.string().trim().max(300).optional().default(""),
  copyright_holder: z.string().trim().max(120).optional().default(""),
  rights_attested_at: z.string().datetime().nullable().optional(),
  rights_attestation_version: z.string().trim().max(32).nullable().optional(),
  brief: z.string().trim().max(1500).optional().default(""),
  creator_role: z.string().trim().max(80).optional().default(""),
  process_note: z.string().trim().max(2000).optional().default(""),
  deliverables: z.string().trim().max(200).optional().default(""),
  duration_label: z.string().trim().max(60).optional().default(""),
  outcome_note: z.string().trim().max(1500).optional().default(""),
  opportunity_types: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  opportunity_note: z.string().trim().max(500).optional().default(""),
  external_links: z
    .array(
      z.object({
        label: z.string().trim().max(80).optional().default(""),
        url: z.string().trim().url("URL ไม่ถูกต้อง"),
      }),
    )
    .max(10)
    .default([]),
  project_assets: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        kind: z.enum(["link", "file"]),
        label: z.string().trim().max(80),
        url: z.string().trim().url().optional(),
        storage_path: z.string().trim().max(500).optional(),
        file_name: z.string().trim().max(200).optional(),
        mime_type: z.string().trim().max(120).optional(),
        size_bytes: z.number().int().min(0).max(PROJECT_ASSET_FILE_MAX_BYTES).optional(),
        scan_status: z.enum(["pending", "clean", "blocked"]).default("pending"),
        scan_reason: z.string().trim().max(200).nullable().optional(),
        scanned_at: z.string().datetime().nullable().optional(),
      }),
    )
    .max(10)
    .default([]),
});

export type ProjectInput = z.infer<typeof projectSchema>;

/** Relaxed validation for autosave / draft saves (title may be empty). */
export const projectDraftSchema = projectSchema.extend({
  title: z.string().trim().max(120).optional().default(""),
});

export type ProjectDraftInput = z.infer<typeof projectDraftSchema>;

/** Extra publish-time checks beyond base projectSchema */
export function validateProjectPublish(input: ProjectInput): string | null {
  if (input.status !== "Published") return null;
  if (!input.rights_attested_at) {
    return "กรุณายืนยันสิทธิ์ในผลงานก่อนเผยแพร่";
  }
  if (input.has_third_party_assets && !input.third_party_note?.trim()) {
    return "กรุณาระบุแหล่งที่มาของ asset จากที่อื่น";
  }
  if (input.license_type === "custom" && !input.license_note?.trim()) {
    return "กรุณากรอกเงื่อนไขการใช้งานเมื่อเลือก 'กำหนดเอง'";
  }
  return null;
}

export const commentSchema = z.object({
  content: z.string().trim().min(1, "พิมพ์ข้อความก่อนส่ง").max(800, "ไม่เกิน 800 ตัวอักษร"),
  imageUrls: z.array(z.string().url()).max(2).optional().default([]),
});
