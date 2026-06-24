/** Types + static lists only — no mock images (safe for type-only imports). */

export type Category =
  | "Explore"
  | "Graphic"
  | "Illustration"
  | "Craft"
  | "Web/UI"
  | "Content"
  | "Photography"
  | "Video"
  | "Music/Audio";

export type SpecialFilter = "Following" | "Newest" | "Collections" | "Top 1";
export type FeedFilter = Category | SpecialFilter;

export type ProjectStatus = "Published" | "Draft" | "Private";
export type HiringStatus = "ที่ต้องตอบ" | "ใหม่" | "ติดต่อแล้ว" | "ปิดแล้ว";

export interface Project {
  id: string;
  title: string;
  image: string;
  gallery?: string[];
  category: Category;
  owner: string;
  ownerId?: string;
  ownerAvatar: string;
  likes: number;
  views: number;
  comments: number;
  bookmarked: boolean;
  status: ProjectStatus;
  publishedDate: string;
  tools?: string[];
  tags?: string[];
  description?: string;
  price?: string;
  allowHire?: boolean;
  allowCollab?: boolean;
  licenseType?: string;
}

export interface HiringRequest {
  id: string;
  clientName: string;
  clientAvatar: string;
  status: HiringStatus;
  referenceProject: string;
  message: string;
  email: string;
  date: string;
}

export const categories: Category[] = [
  "Explore",
  "Graphic",
  "Illustration",
  "Photography",
  "Video",
  "Craft",
  "Web/UI",
  "Content",
  "Music/Audio", // ไว้ท้าย — แพลตฟอร์มเน้นงานภาพ/วิดีโอก่อน
];

export const specialFilters: SpecialFilter[] = ["Following", "Newest", "Collections", "Top 1"];
export const feedFilters: FeedFilter[] = [
  "Explore",
  ...specialFilters,
  ...categories.filter((c) => c !== "Explore"),
];
