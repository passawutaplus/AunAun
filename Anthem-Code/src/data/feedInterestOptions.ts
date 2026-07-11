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

const SUBTITLES: Record<ProjectCategory, string> = {
  "Graphic / Branding": "โลโก้ ไอเดนทิตี้ สิ่งพิมพ์",
  "Illustration / Art": "ภาพประกอบ ศิลปะ คาแรกเตอร์",
  Photography: "ภาพถ่าย โปรดักต์ ไลฟ์สไตล์",
  "Video / Film": "วิดีโอ ภาพยนตร์ สารคดี",
  "Motion / Animation": "โมชั่น แอนิเมชัน ตัวอักษรเคลื่อนไหว",
  "UI/UX": "ออกแบบประสบการณ์ หน้าจอ แอป",
  "Web / App": "เว็บไซต์ แอปพลิเคชัน ดิจิทัลโปรดักต์",
  "3D / CG / Game": "โมเดล 3D เกม เรンダer",
  "Art Toy / Model": "อาร์ตทอย ฟิกเกอร์ โมเดล",
  "Architecture / Interior": "สถาปัตยกรรม ตกแต่งภายใน",
  "Product / Industrial": "ออกแบบผลิตภัณฑ์ อุตสาหกรรม",
  "Fashion / Textile": "แฟชั่น สิ่งทอ พิมพ์ลาย",
  "Craft / Handmade": "งานมือ หัตถกรรม ของทำเอง",
  "Advertising / Campaign": "โฆษณา แคมเปญ ครีเอทีฟ",
  "Content / Social": "คอนเทนต์ โซเชียล มีเดีย",
  "Writing / Storytelling": "งานเขียน สตอรี่ บทความ",
  "Music / Audio": "ดนตรี เสียง พอดแคสต์",
  "AI / Experimental": "งาน AI ทดลอง เทคโนโลยีใหม่",
};

export const FEED_INTEREST_OPTIONS: FeedInterestOption[] = PROJECT_CATEGORIES.map((id, i) => ({
  id,
  label: id,
  subtitle: SUBTITLES[id],
  imageUrl: demoImageUrl(i * 2),
}));

export const FEED_INTEREST_IDS = FEED_INTEREST_OPTIONS.map((o) => o.id);
