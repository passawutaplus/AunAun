import { z } from "zod";

export const TICKET_STATUSES = [
  "new",
  "in_progress",
  "qa",
  "resolved",
  "closed",
  "wont_fix",
] as const;

export const TICKET_PRIORITIES = ["critical", "high", "medium", "low"] as const;

export const TICKET_CATEGORIES = ["bug", "improvement", "question", "other"] as const;

export const TICKET_SOURCES = [
  "feedback_button",
  "support_hub",
  "admin_manual",
  "error_page",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];
export type TicketSource = (typeof TICKET_SOURCES)[number];

export const STATUS_LABELS: Record<TicketStatus, string> = {
  new: "รับแจ้งแล้ว",
  in_progress: "กำลังแก้",
  qa: "รอตรวจ",
  resolved: "แก้แล้ว",
  closed: "ปิดงาน",
  wont_fix: "ไม่ดำเนินการ",
};

export const STATUS_COLORS: Record<TicketStatus, string> = {
  new: "bg-slate-100 text-slate-700 border-slate-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  qa: "bg-purple-100 text-purple-800 border-purple-200",
  resolved: "bg-green-100 text-green-800 border-green-200",
  closed: "bg-gray-100 text-gray-600 border-gray-200",
  wont_fix: "bg-red-50 text-red-700 border-red-200",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  critical: "ด่วนที่สุด",
  high: "สูง",
  medium: "ปานกลาง",
  low: "ต่ำ",
};

export const PRIORITY_DOT: Record<TicketPriority, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-400",
  low: "bg-slate-300",
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  bug: "บั๊ก",
  improvement: "ปรับปรุง",
  question: "คำถาม",
  other: "อื่นๆ",
};

export const CATEGORY_OPTIONS = [
  { value: "bug" as const, label: "🐛 บั๊ก" },
  { value: "improvement" as const, label: "🚀 ปรับปรุง" },
  { value: "question" as const, label: "❓ คำถาม" },
  { value: "other" as const, label: "📌 อื่นๆ" },
];

export const KANBAN_COLUMNS: TicketStatus[] = ["new", "in_progress", "qa", "resolved", "closed"];

export const createTicketSchema = z.object({
  title: z.string().trim().min(3, "พิมพ์อย่างน้อย 3 ตัวอักษร").max(120),
  description: z.string().trim().max(2000).optional(),
  category: z.enum(TICKET_CATEGORIES),
  source: z.enum(TICKET_SOURCES).default("support_hub"),
  sourceFeature: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  betaFeedbackId: z.string().uuid().optional(),
});

export const SOURCE_LABELS: Record<TicketSource, string> = {
  feedback_button: "Give Feedback",
  support_hub: "Support Hub",
  admin_manual: "Admin",
  error_page: "Error Page",
};

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
