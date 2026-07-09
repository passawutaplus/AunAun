import {
  Image,
  Images,
  Package,
  Braces,
  Palette,
  FileText,
  Eye,
  FolderOpen,
  Code2,
} from "lucide-react";
import type { LabsCategoryDef, LabsToolDef } from "@/lib/labs/types";

export const LABS_CATEGORIES: LabsCategoryDef[] = [
  {
    id: "visual",
    title: "ภาพ",
    titleEn: "Visual",
    description: "mockup และครีเอทีฟ",
    icon: Eye,
  },
  {
    id: "files",
    title: "ไฟล์",
    titleEn: "Files",
    description: "จัดการรูปและเอกสาร",
    icon: FolderOpen,
  },
  {
    id: "delivery",
    title: "ส่งมอบ",
    titleEn: "Delivery",
    description: "ชุดงานส่งลูกค้า",
    icon: Package,
  },
  {
    id: "developer",
    title: "ข้อมูล",
    titleEn: "Developer",
    description: "JSON / CSV และโค้ด",
    icon: Code2,
  },
];

export const LABS_TOOLS: LabsToolDef[] = [
  {
    id: "mockup-lab",
    title: "Mockup ภาพ",
    description: "ใส่กรอบก่อนส่งลูกค้า",
    category: "visual",
    route: "/labs/visual/mockup",
    icon: Image,
    status: "live",
    durationMin: 2,
    keywords: ["screenshot", "mockup", "portfolio", "social"],
  },
  {
    id: "creative",
    title: "Creative Labs",
    description: "สี · ฟอนต์ · ส่งเข้า Brief",
    category: "visual",
    route: "/labs/creative",
    icon: Palette,
    status: "live",
    durationMin: 5,
    keywords: ["color", "palette", "font", "typography"],
  },
  {
    id: "image-toolbox",
    title: "จัดการรูป",
    description: "ย่อ แปลง ลายน้ำ หลายไฟล์",
    category: "files",
    route: "/labs/files/image-toolbox",
    icon: Images,
    status: "live",
    durationMin: 3,
    keywords: ["resize", "compress", "convert", "batch"],
  },
  {
    id: "doc-lab",
    title: "Doc Lab",
    description: "รวม แยก PDF ก่อนส่ง",
    category: "files",
    route: "/labs/doc",
    icon: FileText,
    status: "live",
    durationMin: 2,
    keywords: ["pdf", "merge", "split", "document"],
  },
  {
    id: "delivery-pack",
    title: "ชุดส่งมอบ",
    description: "ZIP + README สำหรับลูกค้า",
    category: "delivery",
    route: "/labs/delivery/pack",
    icon: Package,
    status: "beta",
    durationMin: 3,
    keywords: ["delivery", "client", "zip", "handoff"],
  },
  {
    id: "json-csv-formatter",
    title: "JSON / CSV",
    description: "จัดรูปแบบ แปลง ตรวจข้อมูล",
    category: "developer",
    route: "/labs/developer/formatter",
    icon: Braces,
    status: "live",
    durationMin: 1,
    keywords: ["json", "csv", "format", "validate"],
  },
];

export function getToolsByCategory(categoryId: string): LabsToolDef[] {
  return LABS_TOOLS.filter((t) => t.category === categoryId);
}

export function findToolById(id: string): LabsToolDef | undefined {
  return LABS_TOOLS.find((t) => t.id === id);
}

export function findToolByRoute(pathname: string): LabsToolDef | undefined {
  const normalized = pathname.replace(/\/$/, "");
  return LABS_TOOLS.find((t) => normalized === t.route || normalized.startsWith(`${t.route}/`));
}

export function searchLabsTools(query: string): LabsToolDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return LABS_TOOLS;
  return LABS_TOOLS.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.keywords?.some((k) => k.includes(q)),
  );
}

export function formatToolDuration(min?: number): string {
  if (!min) return "~2 นาที";
  return min === 1 ? "~1 นาที" : `~${min} นาที`;
}
