import type { Category } from "@/data/projectTypes";
import { demoImageUrl } from "@/lib/demoImages";

export type FeedInterestId = Exclude<Category, "Explore">;

export type FeedInterestOption = {
  id: FeedInterestId;
  label: string;
  subtitle: string;
  imageUrl: string;
};

export const FEED_INTEREST_OPTIONS: FeedInterestOption[] = [
  {
    id: "Graphic",
    label: "Graphic / Branding",
    subtitle: "โลโก้ โปสเตอร์ ไอเดนทити",
    imageUrl: demoImageUrl(0),
  },
  {
    id: "Illustration",
    label: "Illustration",
    subtitle: "ภาพประกอบ คาแรกเตอร์ สไตล์งาน",
    imageUrl: demoImageUrl(2),
  },
  {
    id: "Photography",
    label: "Photography",
    subtitle: "ภาพถ่าย โปรดักต์ ไลฟ์สไตล์",
    imageUrl: demoImageUrl(4),
  },
  {
    id: "Video",
    label: "Video / Motion",
    subtitle: "วิดีโอ โมชั่น แอนิเมชัน",
    imageUrl: demoImageUrl(6),
  },
  {
    id: "Craft",
    label: "Craft / 3D",
    subtitle: "งานมือ 3D โมเดล เรンダer",
    imageUrl: demoImageUrl(8),
  },
  {
    id: "Web/UI",
    label: "UI / UX",
    subtitle: "เว็บ แอป ออกแบบประสบการณ์",
    imageUrl: demoImageUrl(12),
  },
  {
    id: "Content",
    label: "Content / Social",
    subtitle: "คอนเทนต์ โซเชียล ครีเอทีฟ",
    imageUrl: demoImageUrl(14),
  },
  {
    id: "Music/Audio",
    label: "Music / Audio",
    subtitle: "เสียง ดนตรี พอดแคสต์",
    imageUrl: demoImageUrl(16),
  },
];

export const FEED_INTEREST_IDS = FEED_INTEREST_OPTIONS.map((o) => o.id);
