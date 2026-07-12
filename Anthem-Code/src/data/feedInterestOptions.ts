import type { ProjectCategory } from "@/data/projectTypes";
import { PROJECT_CATEGORIES } from "@/data/projectTypes";
import { demoImageUrl } from "@/lib/demoImages";

export type FeedInterestId = ProjectCategory;

export type FeedInterestOption = {
  id: FeedInterestId;
  label: string;
  subtitle: string;
  imageUrl: string;
};

/** Display copy — ids stay aligned with PROJECT_CATEGORIES / feed filters. */
const COPY: Record<ProjectCategory, { label: string; subtitle: string }> = {
  "Graphic / Branding": {
    label: "Graphic / Branding",
    subtitle: "โลโก้ แบรนด์ สิ่งพิมพ์ กราฟิก",
  },
  "Illustration / Art": {
    label: "Illustration / Art",
    subtitle: "ภาพประกอบ ศิลปะ คาแรกเตอร์",
  },
  Photography: {
    label: "Photography",
    subtitle: "ภาพถ่าย โปรดักต์ ไลฟ์สไตล์",
  },
  "Video / Film": {
    label: "Video / Film",
    subtitle: "วิดีโอ ภาพยนตร์ สารคดี",
  },
  "Motion / Animation": {
    label: "Motion / Animation",
    subtitle: "โมชั่น กราฟิกเคลื่อนไหว แอนิเมชัน",
  },
  "UI/UX": {
    label: "UI/UX",
    subtitle: "ออกแบบ UI UX แอป และเว็บ",
  },
  "Web / App": {
    label: "Web / App",
    subtitle: "เว็บไซต์ แอป ดิจิทัลโปรดักต์",
  },
  "3D / CG / Game": {
    label: "3D / CG / Game",
    subtitle: "โมเดล 3D ซีจี เกม",
  },
  "Art Toy / Model": {
    label: "Art Toy / Model",
    subtitle: "อาร์ตทอย ฟิกเกอร์ โมเดล",
  },
  "Architecture / Interior": {
    label: "Architecture / Interior",
    subtitle: "สถาปัตยกรรม ตกแต่งภายใน",
  },
  "Product / Industrial": {
    label: "Product / Industrial",
    subtitle: "ออกแบบผลิตภัณฑ์ อุตสาหกรรม",
  },
  "Fashion / Textile": {
    label: "Fashion / Textile",
    subtitle: "แฟชั่น สิ่งทอ พิมพ์ลาย",
  },
  "Craft / Handmade": {
    label: "Craft / Handmade",
    subtitle: "งานฝีมือ หัตถกรรม ของทำเอง",
  },
  "Advertising / Campaign": {
    label: "Advertising / Campaign",
    subtitle: "โฆษณา แคมเปญ ครีเอทีฟ",
  },
  "Content / Social": {
    label: "Content / Social",
    subtitle: "คอนเทนต์ โซเชียล มีเดีย",
  },
  "Writing / Storytelling": {
    label: "Writing / Storytelling",
    subtitle: "งานเขียน สตอรี่ บทความ",
  },
  "Music / Audio": {
    label: "Music / Audio",
    subtitle: "ดนตรี เสียง พอดแคสต์",
  },
  "AI / Experimental": {
    label: "AI / Experimental",
    subtitle: "งาน AI ทดลอง เทคโนโลยีใหม่",
  },
};

export const FEED_INTEREST_OPTIONS: FeedInterestOption[] = PROJECT_CATEGORIES.map((id, i) => ({
  id,
  label: COPY[id].label,
  subtitle: COPY[id].subtitle,
  imageUrl: demoImageUrl(i * 2),
}));

export const FEED_INTEREST_IDS = FEED_INTEREST_OPTIONS.map((o) => o.id);
