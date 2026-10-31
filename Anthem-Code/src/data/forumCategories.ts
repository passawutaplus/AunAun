/** Client-side category labels + create-topic templates */

/** Member-creatable categories (not team announcements). */
export type ForumCategorySlug = "help" | "bug" | "idea" | "feedback";

export type ForumAllCategorySlug = ForumCategorySlug | "announcements";

export type ForumTemplateField = {
  key: string;
  label: string;
  placeholder: string;
  required?: boolean;
};

/** Tailwind tokens so each category reads as its own color lane */
export type ForumCategoryTone = {
  /** solid swatch (list row chip) */
  swatch: string;
  icon: string;
  text: string;
  soft: string;
  softActive: string;
};

/** Brand Book: lanes differ by a small swatch only; text and fills stay neutral. */
export const FORUM_CATEGORY_TONES: Record<ForumAllCategorySlug, ForumCategoryTone> = {
  announcements: {
    swatch: "bg-brand",
    icon: "text-brand",
    text: "text-foreground",
    soft: "hover:bg-secondary",
    softActive: "bg-secondary text-foreground",
  },
  help: {
    swatch: "bg-chat-hire",
    icon: "text-muted-foreground",
    text: "text-foreground",
    soft: "hover:bg-secondary",
    softActive: "bg-secondary text-foreground",
  },
  bug: {
    swatch: "bg-destructive",
    icon: "text-muted-foreground",
    text: "text-foreground",
    soft: "hover:bg-secondary",
    softActive: "bg-secondary text-foreground",
  },
  idea: {
    swatch: "bg-foreground/60",
    icon: "text-muted-foreground",
    text: "text-foreground",
    soft: "hover:bg-secondary",
    softActive: "bg-secondary text-foreground",
  },
  feedback: {
    swatch: "bg-chat-collab",
    icon: "text-muted-foreground",
    text: "text-foreground",
    soft: "hover:bg-secondary",
    softActive: "bg-secondary text-foreground",
  },
};

export function forumCategoryTone(slug: string | undefined | null): ForumCategoryTone {
  if (slug && slug in FORUM_CATEGORY_TONES) {
    return FORUM_CATEGORY_TONES[slug as ForumAllCategorySlug];
  }
  return {
    swatch: "bg-foreground/40",
    icon: "text-muted-foreground",
    text: "text-muted-foreground",
    soft: "hover:bg-secondary",
    softActive: "bg-secondary text-foreground",
  };
}

export const FORUM_CATEGORY_META: Record<
  ForumCategorySlug,
  { nameTh: string; description: string; template: ForumTemplateField[] }
> = {
  help: {
    nameTh: "ช่วยเหลือ",
    description: "สอบถามการใช้งานและขอความช่วยเหลือ",
    template: [
      { key: "goal", label: "คุณกำลังทำอะไรอยู่?", placeholder: "เช่น อยากอัปโหลดผลงานแต่ติดขั้นตอน…", required: true },
      { key: "tried", label: "ลองทำอะไรไปแล้วบ้าง?", placeholder: "ขั้นตอนที่ลองแล้ว", required: false },
      { key: "want", label: "อยากได้อะไรเป็นผลลัพธ์?", placeholder: "เช่น อยากให้บันทึกได้สำเร็จ", required: true },
    ],
  },
  bug: {
    nameTh: "แจ้งเหตุ",
    description: "รายงานบั๊กหรือระบบผิดปกติ",
    template: [
      { key: "steps", label: "ขั้นตอนทำซ้ำ", placeholder: "1) …\n2) …\n3) …", required: true },
      { key: "expected", label: "ผลที่คาดหวัง", placeholder: "ควรเกิดอะไรขึ้น", required: true },
      { key: "actual", label: "ผลที่เกิดขึ้นจริง", placeholder: "เกิดอะไรขึ้นแทน", required: true },
      { key: "env", label: "อุปกรณ์ / เบราว์เซอร์", placeholder: "เช่น Windows + Chrome, มือถือ iOS Safari", required: false },
    ],
  },
  idea: {
    nameTh: "เสนอไอเดีย",
    description: "ขอฟีเจอร์ใหม่หรือแนวทางพัฒนา",
    template: [
      { key: "request", label: "อยากได้อะไร?", placeholder: "อธิบายฟีเจอร์สั้น ๆ", required: true },
      { key: "why", label: "ทำไมถึงต้องการ?", placeholder: "ช่วยงานคุณยังไง", required: true },
      { key: "workaround", label: "workaround ตอนนี้", placeholder: "ตอนนี้แก้ยังไงชั่วคราว (ถ้ามี)", required: false },
    ],
  },
  feedback: {
    nameTh: "ฟีดแบ็ก",
    description: "ติชมสิ่งที่มีอยู่แล้วในระบบ",
    template: [
      { key: "where", label: "หน้า / ฟีเจอร์ไหน?", placeholder: "เช่น หน้าโปรไฟล์, แชท, ฟีด", required: true },
      { key: "feeling", label: "รู้สึกยังไง?", placeholder: "ติดขัด / สับสน / ชอบแต่…", required: true },
      { key: "suggest", label: "อยากให้เป็นยังไง?", placeholder: "แนวทางที่คิดว่าดีกว่า", required: false },
    ],
  },
};

export const FORUM_ANNOUNCEMENTS_META = {
  nameTh: "ประกาศจากทีม",
  description: "ข่าวอัปเดต โรดแมป และการบำรุงรักษาจากทีม SAMECOR",
} as const;

export function isForumCategorySlug(v: string): v is ForumCategorySlug {
  return v === "help" || v === "bug" || v === "idea" || v === "feedback";
}

export function isAnnouncementsSlug(v: string | undefined | null): boolean {
  return v === "announcements";
}

/** One continuous writing starter for a category (not split form sections). */
export function buildWritingPattern(slug: ForumCategorySlug): string {
  const fields = FORUM_CATEGORY_META[slug].template;
  return fields
    .map((f) => `${f.label}\n${f.placeholder}`)
    .join("\n\n");
}

export function buildBodyFromTemplate(
  slug: ForumCategorySlug,
  values: Record<string, string>,
): string {
  const fields = FORUM_CATEGORY_META[slug].template;
  return fields
    .map((f) => {
      const v = (values[f.key] ?? "").trim();
      if (!v) return null;
      return `## ${f.label}\n${v}`;
    })
    .filter(Boolean)
    .join("\n\n");
}
