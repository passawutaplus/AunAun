import { z } from "zod";
import { LICENSE_TYPES } from "@/lib/licenses";

export const thaiPhoneRegex = /^(0[6-9]\d{8}|\+66[6-9]\d{8})$/;

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

export type HireRequestInput = z.infer<typeof hireRequestSchema>;

export const experienceItemSchema = z.object({
  title: z.string().trim().min(1, "กรอกตำแหน่ง").max(80),
  company: z.string().trim().max(80).optional().default(""),
  period: z.string().trim().max(60).optional().default(""),
  description: z.string().trim().max(400).optional().default(""),
});
export type ExperienceItem = z.infer<typeof experienceItemSchema>;

export const profileFaqItemSchema = z.object({
  question: z.string().trim().min(1, "กรอกคำถาม").max(120),
  answer: z.string().trim().min(1, "กรอกคำตอบ").max(500),
});
export type ProfileFaqItem = z.infer<typeof profileFaqItemSchema>;

const communityQuestionTopicSchema = z.enum([
  "feedback",
  "technique",
  "tools",
  "career",
  "client",
  "inspiration",
  "other",
]);

export const communityPostSchema = z
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

export type CommunityPostInput = z.infer<typeof communityPostSchema>;

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
  skills: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  experience: z.array(experienceItemSchema).max(20).default([]),
  profileFaq: z.array(profileFaqItemSchema).max(10).default([]),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const projectSchema = z.object({
  title: z.string().trim().min(3, "อย่างน้อย 3 ตัวอักษร").max(120),
  subtitle: z.string().trim().max(180).optional().default(""),
  description: z.string().trim().max(5000).optional().default(""),
  category: z.string().trim().min(1, "เลือกหมวดงาน"),
  cover_url: z.string().trim().url("ต้องอัปโหลดภาพปก").or(z.literal("")),
  gallery_urls: z.array(z.string().url()).max(20, "ไม่เกิน 20 ภาพ").default([]),
  tools: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  tags: z.array(z.string().trim().min(1).max(30)).max(15).default([]),
  price_thb: z.number().int().min(0).max(10_000_000).nullable().optional(),
  status: z.enum(["Published", "Draft", "Private"]),
  allow_hire: z.boolean().default(true),
  allow_collab: z.boolean().default(true),
  studio_id: z.string().uuid().nullable().optional(),
  credited_user_ids: z.array(z.string().uuid()).max(20).default([]),
  license_type: z.enum(LICENSE_TYPES).default("all_rights"),
  license_note: z.string().trim().max(500).optional().default(""),
  has_third_party_assets: z.boolean().default(false),
  third_party_note: z.string().trim().max(300).optional().default(""),
  copyright_holder: z.string().trim().max(120).optional().default(""),
  rights_attested_at: z.string().datetime().nullable().optional(),
  rights_attestation_version: z.string().trim().max(32).nullable().optional(),
});

export type ProjectInput = z.infer<typeof projectSchema>;

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
});
