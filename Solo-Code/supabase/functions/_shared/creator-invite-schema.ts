import { z } from "npm:zod@3";

const text = (max: number) => z.string().trim().max(max).optional().default("");
const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https:\/\/[^\s]+\.[^\s]+$/i.test(v), "https_url");
/** Up to 3 https links, one per line (quick submit portfolio links). */
const httpsUrlLines = z
  .string()
  .trim()
  .max(1600)
  .refine((v) => {
    const lines = v
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return lines.length <= 3 && lines.every((l) => /^https:\/\/[^\s]+\.[^\s]+$/i.test(l));
  }, "https_urls");

export const ProjectSchema = z.object({
  slot: z.enum(["p1", "p2", "p3"]),
  title: text(120),
  description: text(1000),
  role: text(120),
  url: httpsUrl.optional().default(""),
  rights: z.boolean().optional().default(false),
  media: z.array(z.string().uuid()).max(8).optional().default([]),
});

export const SubmissionSchema = z.object({
  about: z
    .object({
      name: text(120),
      discipline: text(80),
      bio: text(300),
      city: text(120),
      email: z.string().trim().max(254).optional().default(""),
      links: text(500),
      avatar: z.string().uuid().nullable().optional().default(null),
      cover: z.string().uuid().nullable().optional().default(null),
    })
    .default({}),
  projects: z.array(ProjectSchema).max(3).optional().default([]),
  contact_pref: z.enum(["", "email", "instagram", "line", "other"]).optional().default(""),
  /** IG / LINE / other handle when contact_pref is not email */
  contact_handle: text(120),
  quick: z
    .object({ portfolio_url: httpsUrlLines.optional().default("") })
    .optional()
    .default({}),
});
export type Submission = z.infer<typeof SubmissionSchema>;

export { EMAIL_RE, validateForSubmit } from "./creator-invite-rules.ts";
