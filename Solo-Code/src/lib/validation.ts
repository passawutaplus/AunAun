import { z } from "zod";
import { sanitizeText } from "./security";

/** Reusable primitives */
const text = (max: number, label = "ข้อความ") =>
  z
    .string()
    .trim()
    .min(1, `${label}ห้ามว่าง`)
    .max(max, `${label}ยาวเกิน ${max} ตัวอักษร`)
    .transform((v) => sanitizeText(v, max));

const money = z
  .union([z.string(), z.number()])
  .transform((v) => Number(String(v).replace(/[, ]/g, "")))
  .pipe(z.number().finite().min(0, "ต้องเป็นจำนวนบวก").max(1e9, "จำนวนเกินช่วงที่อนุญาต"));

const dayOfMonth = z
  .union([z.string(), z.number()])
  .transform((v) => Number(v))
  .pipe(z.number().int().min(1, "วันที่ 1-31").max(31, "วันที่ 1-31"));

/** Subscription form */
export const subSchema = z.object({
  name: text(80, "ชื่อบริการ"),
  amount: money,
  category: z.string().min(1).max(40),
  billingDay: dayOfMonth,
  paymentMethodId: z.string().min(1, "เลือกช่องทางจ่าย").max(40),
  status: z.enum(["active", "paused", "cancelled"]).optional().default("active"),
  priceMode: z.enum(["monthly", "installment"]).optional().default("monthly"),
  fullPrice: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === undefined || v === "" ? undefined : Number(v))),
  installmentMonths: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === undefined || v === "" ? undefined : Number(v))),
  installmentsPaid: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === undefined || v === "" ? 0 : Number(v))),
});

/** Income form */
export const incomeSchema = z.object({
  client: text(120, "ชื่อลูกค้า"),
  gross: money,
  month: z.string().regex(/^\d{4}-\d{2}$/, "รูปแบบเดือนไม่ถูกต้อง"),
  incomeType: z
    .enum(["freelance", "professional", "online_sales", "commission", "rental", "other"])
    .default("freelance"),
  whtRate: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v))
    .pipe(z.number().min(0, "อัตราต้อง 0-15%").max(15, "อัตราต้อง 0-15%"))
    .default(3),
  certificateNo: z.string().trim().max(60, "เลขใบ 50 ทวิ ยาวเกินกำหนด").optional().default(""),
  certificateReceived: z.boolean().optional().default(false),
  note: z.string().trim().max(200, "หมายเหตุยาวเกินกำหนด").optional().default(""),
});

/** Expense form */
export const expenseSchema = z.object({
  description: text(160, "รายการ"),
  amount: money,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง"),
});

/** Payment method */
const optionalDay = z
  .union([z.string(), z.number(), z.literal("")])
  .optional()
  .transform((v) => (v === undefined || v === "" ? undefined : Number(v)))
  .pipe(z.number().int().min(1, "วันที่ 1-31").max(31, "วันที่ 1-31").optional());

export const paymentMethodSchema = z.object({
  label: text(60, "ชื่อช่องทาง"),
  type: z.enum(["credit", "debit", "wallet", "cash"]),
  last4: z
    .string()
    .trim()
    .regex(/^\d{0,4}$/, "เลขท้ายต้องเป็นตัวเลขไม่เกิน 4 หลัก")
    .optional()
    .default(""),
  statementDay: optionalDay,
  dueDay: optionalDay,
});

export type SubInput = z.infer<typeof subSchema>;
export type IncomeInput = z.infer<typeof incomeSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;

/** Helper: parse + toast on error. Returns null on failure. */
import { toast } from "sonner";
export function parseOrToast<T>(schema: z.ZodSchema<T>, value: unknown): T | null {
  const r = schema.safeParse(value);
  if (!r.success) {
    toast.error(r.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
    return null;
  }
  return r.data;
}
