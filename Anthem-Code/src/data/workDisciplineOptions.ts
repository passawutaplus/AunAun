import type { ProjectCategory } from "@/data/projectTypes";
import { PROJECT_CATEGORIES } from "@/data/projectTypes";

/** Short chip labels for work discipline (สายงาน) — ids stay PROJECT_CATEGORIES. */
export const WORK_DISCIPLINE_LABELS: Record<ProjectCategory, string> = {
  "Graphic / Branding": "Graphic",
  "Illustration / Art": "Illustrator",
  Photography: "Photography",
  "Video / Film": "Video",
  "Motion / Animation": "Motion",
  "UI/UX": "UX/UI",
  "Web / App": "Web / App",
  "3D / CG / Game": "3D / Game",
  "Art Toy / Model": "Art Toy",
  "Architecture / Interior": "Architecture",
  "Product / Industrial": "Product",
  "Fashion / Textile": "Fashion",
  "Craft / Handmade": "Craft",
  "Advertising / Campaign": "Advertising",
  "Content / Social": "Content",
  "Writing / Storytelling": "Writing",
  "Music / Audio": "Music",
  "AI / Experimental": "AI",
};

export type WorkDisciplineId = ProjectCategory;

/** สายงาน chips for onboarding/settings — exclude AI (still a project category). */
export const WORK_DISCIPLINE_OPTIONS: { id: WorkDisciplineId; label: string }[] =
  PROJECT_CATEGORIES.filter((id) => id !== "AI / Experimental").map((id) => ({
    id,
    label: WORK_DISCIPLINE_LABELS[id],
  }));
