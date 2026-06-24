import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from "@google/generative-ai";
import { defaultVisionModel, normalizeGeminiModel } from "@/lib/geminiModels";
import { mapGeminiError } from "@/lib/geminiServer";

export const WHT_GEMINI_SYSTEM_PROMPT = `คุณคือ AI ที่อ่านข้อมูลจาก "หนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ)" ของกรมสรรพากร ประเทศไทย
แกะข้อมูลจากเอกสาร (PDF ดิจิทัล/สแกน/ถ่ายรูป) แล้วตอบเป็น JSON ตาม schema เท่านั้น

โครงสร้างเอกสารมาตรฐาน — อ่านตามลำดับและ map อย่างเคร่งครัด:

1) ผู้มีหน้าที่หักภาษี (Payer / ผู้จ่ายเงิน) — บล็อกด้านบนซ้าย
   - payerTaxId: เลข 13 หลัก (อาจมีขีด เช่น 0-1055-64055-49-6) → คืนเฉพาะตัวเลข
   - payerName: ชื่อเต็ม (เช่น บริษัท ดับบลิวพี เทรดดิ้ง อินเตอร์กรุ๊ป จำกัด (สำนักงานใหญ่))

2) ผู้ถูกหักภาษี (Payee) — บล็อกด้านบนขวา
   - payeeTaxId: เลข 13 หลัก (เช่น 1-1022-00155-22-8) → คืนเฉพาะตัวเลข
   - payeeName: (เช่น นาย ภาสวุฒิ แซ่ล้อ)

3) ตารางเงินได้ — 6 แถวมาตรฐาน
   - แถวที่มีจำนวนเงิน > 0: แถว 2 → incomeTableRow=2, incomeSection="40_2" | แถว 5 → 5, "40_8"
   - grossAmount: จำนวนเงินที่จ่าย (เช่น 20000) | whtAmount: ภาษีที่หัก (เช่น 600)

4) ข้อความภาษาไทย (สำคัญ — คัดลอกตามใบ)
   - whtAmountTextThai: เช่น "หกร้อยบาทถ้วน" ต้องตรงกับ whtAmount
   - grossAmountTextThai: เช่น "สองหมื่นบาทถ้วน"

5) วันที่ออก — ด้านล่าง → issueDate ค.ศ. YYYY-MM-DD (แปลง พ.ศ. ลบ 543, เดือนย่อไทย)

6) ฟิลด์เสริม: certificateNo, whtRate, formType, payerCondition, confidence (0-1), notes

กฎ: อ่านฉบับที่ 1 (หน้าแรก) เท่านั้น · รักษาอักขระไทยให้ครบ · ตอบ JSON เท่านั้น`;

const WHT_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    payerName: { type: SchemaType.STRING, description: "ชื่อผู้มีหน้าที่หักภาษี" },
    payerTaxId: {
      type: SchemaType.STRING,
      description: "เลขผู้เสียภาษีผู้จ่าย (13 หลัก ไม่มีขีด)",
    },
    payeeName: { type: SchemaType.STRING, description: "ชื่อผู้ถูกหักภาษี" },
    payeeTaxId: { type: SchemaType.STRING, description: "เลขผู้เสียภาษีผู้ถูกหัก (13 หลัก)" },
    certificateNo: { type: SchemaType.STRING, description: "เลขที่ใบ 50 ทวิ" },
    issueDate: { type: SchemaType.STRING, description: "วันที่ออก YYYY-MM-DD ค.ศ." },
    incomeTableRow: { type: SchemaType.INTEGER, description: "แถวตารางเงินได้ 1-6" },
    incomeSection: { type: SchemaType.STRING, description: "40_1 ถึง 40_8" },
    grossAmount: { type: SchemaType.NUMBER, description: "จำนวนเงินที่จ่าย (บาท)" },
    grossAmountTextThai: { type: SchemaType.STRING, description: "ข้อความไทยของ grossAmount" },
    whtRate: { type: SchemaType.NUMBER, description: "เปอร์เซ็นต์หัก ณ ที่จ่าย" },
    whtAmount: { type: SchemaType.NUMBER, description: "ภาษีที่หัก (บาท)" },
    whtAmountTextThai: {
      type: SchemaType.STRING,
      description: "ข้อความไทยของ whtAmount เช่น หกร้อยบาทถ้วน",
    },
    formType: { type: SchemaType.STRING, description: "pnd1a|pnd2|pnd3|pnd53|..." },
    payerCondition: { type: SchemaType.STRING, description: "withhold|pay_always|pay_once|other" },
    confidence: { type: SchemaType.NUMBER, description: "0-1" },
    notes: { type: SchemaType.STRING, description: "หมายเหตุ" },
  },
  required: [
    "payerName",
    "payerTaxId",
    "payeeName",
    "payeeTaxId",
    "grossAmount",
    "whtAmount",
    "whtAmountTextThai",
    "confidence",
  ],
};

function normalizeScanMime(mimeType: string): string {
  if (mimeType === "application/pdf") return "application/pdf";
  if (mimeType.startsWith("image/")) return mimeType.split(";")[0] || "image/jpeg";
  return mimeType;
}

function parseJsonResponse(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  const body = fenced ? fenced[1].trim() : trimmed;
  const parsed = JSON.parse(body) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("AI ตอบ JSON ไม่ถูกรูปแบบ");
  }
  return parsed as Record<string, unknown>;
}

/** Call Gemini vision model with inline PDF/image and return parsed extraction JSON. */
export async function extractWhtWithGemini(
  bytes: Uint8Array,
  mimeType: string,
  apiKey: string,
): Promise<Record<string, unknown>> {
  const modelId = normalizeGeminiModel(undefined, defaultVisionModel());
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelId,
    systemInstruction: WHT_GEMINI_SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: WHT_RESPONSE_SCHEMA,
    },
  });

  const scanMime = normalizeScanMime(mimeType);
  const inlineData = {
    inlineData: {
      mimeType: scanMime,
      data: Buffer.from(bytes).toString("base64"),
    },
  };

  try {
    const result = await model.generateContent([
      {
        text: "อ่านใบ 50 ทวิ ฉบับที่ 1 (หน้าแรก) แล้วส่ง JSON ตาม schema — ต้องอ่าน whtAmountTextThai จากข้อความภาษาไทยในใบ (เช่น หกร้อยบาทถ้วน) ให้ตรงกับ whtAmount",
      },
      inlineData,
    ]);

    const text = result.response.text();
    if (!text?.trim()) {
      throw new Error("Gemini ไม่ส่งข้อมูลกลับ — ลองใช้ไฟล์ที่ชัดขึ้น");
    }

    return parseJsonResponse(text);
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.startsWith("AI ") || err.message.startsWith("Gemini ไม่ส่ง"))
    ) {
      throw err;
    }
    throw mapGeminiError(err);
  }
}
