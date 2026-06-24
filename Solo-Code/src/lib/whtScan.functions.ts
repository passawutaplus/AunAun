import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validateWhtThaiText, warnMissingThaiText } from "@/lib/thaiBahtText";
import { extractWhtWithGemini } from "@/lib/whtGeminiScan";
import { assertWhtStoragePath, prepareScanBytes, whtStorageBucket } from "@/lib/whtScanAsset";
import { parseThaiDate } from "@/lib/thaiDate";

const InputSchema = z.object({
  storagePath: z.string().min(3).max(512),
  mimeType: z.string().min(1).max(100),
});

const INCOME_ROW_TO_SECTION: Record<number, string> = {
  1: "40_1",
  2: "40_2",
  3: "40_3",
  4: "40_4",
  5: "40_8",
  6: "40_8",
};

function mapIncomeSection(row: number, aiSection: string): string {
  if (row >= 1 && row <= 6) return INCOME_ROW_TO_SECTION[row] ?? aiSection;
  return aiSection;
}

function validateTaxId(label: string, id: string): string | null {
  if (!id) return `${label}: ไม่พบเลขผู้เสียภาษี 13 หลัก`;
  if (id.length !== 13) return `${label}: เลขผู้เสียภาษีต้องมี 13 หลัก (พบ ${id.length} หลัก)`;
  return null;
}

function taxIdDigits(v: unknown): string {
  const raw = typeof v === "string" ? v.trim().replace(/\D/g, "") : "";
  return raw.slice(0, 13);
}

export const scanWhtCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const { userId, supabase } = context;
    assertWhtStoragePath(data.storagePath, userId);

    const { data: blob, error: dlErr } = await supabase.storage
      .from(whtStorageBucket())
      .download(data.storagePath);
    if (dlErr || !blob) {
      throw new Error("ไม่สามารถโหลดไฟล์จาก storage ได้");
    }

    const rawBytes = new Uint8Array(await blob.arrayBuffer());
    const { bytes, mimeType } = await prepareScanBytes(rawBytes, data.mimeType);
    const parsed = await extractWhtWithGemini(bytes, mimeType, apiKey);

    const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : 0);
    const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

    const grossAmount = num(parsed.grossAmount);
    const whtAmount = num(parsed.whtAmount);
    const whtAmountTextThai = str(parsed.whtAmountTextThai);
    const grossAmountTextThai = str(parsed.grossAmountTextThai);
    const incomeTableRow = num(parsed.incomeTableRow);

    let whtRate = num(parsed.whtRate);
    if (!whtRate && grossAmount > 0 && whtAmount > 0) {
      const raw = (whtAmount / grossAmount) * 100;
      const presets = [0.5, 1, 1.5, 2, 3, 5, 10, 15];
      whtRate = presets.reduce(
        (best, p) => (Math.abs(p - raw) < Math.abs(best - raw) ? p : best),
        presets[0],
      );
    }

    const payerTaxId = taxIdDigits(parsed.payerTaxId);
    const payeeTaxId = taxIdDigits(parsed.payeeTaxId);
    const incomeSection = mapIncomeSection(incomeTableRow, str(parsed.incomeSection));
    const issueDateRaw = str(parsed.issueDate);
    const issueDate = parseThaiDate(issueDateRaw) || issueDateRaw;

    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];

    const thaiWhtMismatch = validateWhtThaiText(whtAmount, whtAmountTextThai);
    if (thaiWhtMismatch) validationErrors.push(thaiWhtMismatch);

    const thaiWhtMissing = warnMissingThaiText(whtAmount, whtAmountTextThai);
    if (thaiWhtMissing) validationWarnings.push(thaiWhtMissing);

    if (grossAmountTextThai && grossAmount > 0) {
      const thaiGrossErr = validateWhtThaiText(grossAmount, grossAmountTextThai);
      if (thaiGrossErr) validationErrors.push(`จำนวนเงินที่จ่าย: ${thaiGrossErr}`);
    }

    const payerTaxErr = validateTaxId("ผู้จ่ายเงิน", payerTaxId);
    if (payerTaxErr) validationWarnings.push(payerTaxErr);

    const payeeTaxErr = validateTaxId("ผู้ถูกหักภาษี", payeeTaxId);
    if (payeeTaxErr) validationWarnings.push(payeeTaxErr);

    if (grossAmount <= 0) validationWarnings.push("ไม่พบยอดจำนวนเงินที่จ่าย — กรุณากรอกเอง");
    if (whtAmount <= 0) validationWarnings.push("ไม่พบยอดภาษีที่หัก — กรุณากรอกเอง");

    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(" · "));
    }

    let confidence = Math.max(0, Math.min(1, num(parsed.confidence)));
    if (validationWarnings.length > 0) {
      confidence = Math.min(confidence, 0.6);
    }

    return {
      payerName: str(parsed.payerName),
      payerTaxId,
      payeeName: str(parsed.payeeName),
      payeeTaxId,
      certificateNo: str(parsed.certificateNo),
      issueDate,
      incomeTableRow,
      incomeSection,
      grossAmount,
      grossAmountTextThai,
      whtRate,
      whtAmount,
      whtAmountTextThai,
      formType: str(parsed.formType),
      payerCondition: str(parsed.payerCondition),
      confidence,
      notes: [str(parsed.notes), ...validationWarnings].filter(Boolean).join(" · "),
      validationWarnings,
    };
  });

export type WhtScanResult = Awaited<ReturnType<typeof scanWhtCertificate>>;
