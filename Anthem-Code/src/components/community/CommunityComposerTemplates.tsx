import { COMMUNITY_KIND_INFO } from "@/data/createActions";
import { toggleCommunityQaTag } from "@/lib/communityQaTag";
import { cn } from "@/lib/utils";

export type CommunityComposerTemplateId = "feedback" | "workflow" | "pricing";

type TemplateApply = {
  title?: string;
  body?: string;
  tags?: string[];
};

type Props = {
  onApply: (patch: TemplateApply) => void;
  className?: string;
};

const TEMPLATES: {
  id: CommunityComposerTemplateId;
  label: string;
  apply: () => TemplateApply;
}[] = [
  {
    id: "feedback",
    label: "ขอ feedback",
    apply: () => ({
      title: "",
      body: "งานนี้ทำเพื่อ…\nอยากได้ feedback เรื่อง:\n- composition\n- สี\n- hierarchy",
      tags: toggleCommunityQaTag(["ขอfeedback"]),
    }),
  },
  {
    id: "workflow",
    label: "แชร์ workflow",
    apply: () => ({
      title: "",
      body: "ขั้นตอนที่ใช้:\n1. \n2. \n3. \n\nเคล็ดลับ:",
      tags: ["workflow"],
    }),
  },
  {
    id: "pricing",
    label: "ถามเรื่องราคา",
    apply: () => ({
      title: COMMUNITY_KIND_INFO.question.titlePlaceholder,
      body: "งานประเภท… งบลูกค้าเสนอ…\nไม่แน่ใจว่าราคาเท่าไหร่เหมาะสม ช่วยแนะนำหน่อย",
      tags: toggleCommunityQaTag(["ถาม"]),
    }),
  },
];

export function CommunityComposerTemplates({ onApply, className }: Props) {
  return (
    <div className={cn("px-4 pb-2 flex flex-wrap gap-2", className)}>
      <span className="text-xs text-muted-foreground self-center mr-1">เริ่มจาก:</span>
      {TEMPLATES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onApply(t.apply())}
          className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs hover:border-primary/40 hover:bg-primary/5"
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
