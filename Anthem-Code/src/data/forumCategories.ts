/** Client-side category labels + create-topic templates */

export type ForumCategorySlug = "help" | "bug" | "idea" | "feedback";

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

export const FORUM_CATEGORY_TONES: Record<ForumCategorySlug, ForumCategoryTone> = {
  help: {
    swatch: "bg-sky-500",
    icon: "text-sky-600 dark:text-sky-400",
    text: "text-sky-800 dark:text-sky-300",
    soft: "hover:bg-sky-50 dark:hover:bg-sky-950/40",
    softActive: "bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200",
  },
  bug: {
    swatch: "bg-rose-500",
    icon: "text-rose-600 dark:text-rose-400",
    text: "text-rose-800 dark:text-rose-300",
    soft: "hover:bg-rose-50 dark:hover:bg-rose-950/40",
    softActive: "bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200",
  },
  idea: {
    swatch: "bg-amber-500",
    icon: "text-amber-600 dark:text-amber-400",
    text: "text-amber-800 dark:text-amber-300",
    soft: "hover:bg-amber-50 dark:hover:bg-amber-950/40",
    softActive: "bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
  },
  feedback: {
    swatch: "bg-violet-500",
    icon: "text-violet-600 dark:text-violet-400",
    text: "text-violet-800 dark:text-violet-300",
    soft: "hover:bg-violet-50 dark:hover:bg-violet-950/40",
    softActive: "bg-violet-50 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200",
  },
};

export function forumCategoryTone(slug: string | undefined | null): ForumCategoryTone {
  if (slug && slug in FORUM_CATEGORY_TONES) {
    return FORUM_CATEGORY_TONES[slug as ForumCategorySlug];
  }
  return {
    swatch: "bg-primary/70",
    icon: "text-muted-foreground",
    text: "text-muted-foreground",
    soft: "hover:bg-muted",
    softActive: "bg-primary/10 text-primary",
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

export function isForumCategorySlug(v: string): v is ForumCategorySlug {
  return v === "help" || v === "bug" || v === "idea" || v === "feedback";
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
