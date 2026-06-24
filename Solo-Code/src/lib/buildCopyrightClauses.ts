import type { ContractClause } from "@/lib/contractTemplates";
import {
  CHANNEL_OPTIONS,
  DELIVERABLE_LABELS,
  TERRITORY_LABELS,
  TERM_LABELS,
  TRANSFER_LABELS,
  WORK_TYPE_OPTIONS,
  type UsageRightsInput,
} from "@/lib/usageRightsSchema";

export function buildCopyrightClauses(
  rights: UsageRightsInput,
  revisionCount?: number,
): ContractClause[] {
  const work = WORK_TYPE_OPTIONS.find((w) => w.value === rights.workType)?.label ?? "งาน";
  const channels = rights.channels
    .map((c) => CHANNEL_OPTIONS.find((o) => o.value === c)?.label ?? c)
    .join(", ");
  const deliverables = rights.deliverables.map((d) => DELIVERABLE_LABELS[d]).join(", ");
  const territory =
    rights.territory === "custom" && rights.territoryCustom
      ? rights.territoryCustom
      : TERRITORY_LABELS[rights.territory];
  const licenseBody =
    rights.licenseType === "exclusive"
      ? `ผู้ว่าจ้างได้รับสิทธิใช้งานแบบเฉพาะ (Exclusive) สำหรับ${work} ในช่องทาง: ${channels} ภายใน${territory} ระยะเวลา${TERM_LABELS[rights.term]}`
      : `ผู้ว่าจ้างได้รับสิทธิใช้งานแบบไม่เฉพาะ (Non-Exclusive) สำหรับ${work} ในช่องทาง: ${channels} ภายใน${territory} ระยะเวลา${TERM_LABELS[rights.term]} — ผู้รับจ้างยังสามารถใช้ผลงานในรูปแบบอื่นหรือขายซ้ำให้บุคคลที่สามได้`;

  const transferBody =
    rights.transferOn === "never"
      ? "ลิขสิทธิ์ยังคงเป็นของผู้รับจ้าง — ผู้ว่าจ้างได้รับเพียงสิทธิใช้งานตามขอบเขตข้างต้น ไม่ได้รับการโอนกรรมสิทธิ์"
      : `การโอนลิขสิทธิ์/สิทธิใช้งานเต็มรูปแบบมีผลเมื่อ${TRANSFER_LABELS[rights.transferOn]}`;

  const rounds = revisionCount ?? rights.revisionRounds;
  const revisionFee = rights.extraRevisionFee
    ? ` ส่วนเกินกำหนดคิดค่าบริการ ฿${rights.extraRevisionFee.toLocaleString("th-TH")} ต่อรอบ`
    : " ส่วนเกินกำหนดคิดค่าบริการเพิ่มตามที่ตกลง";

  return [
    { id: "copyright", title: "ลิขสิทธิ์และสิทธิใช้งาน", body: `${licenseBody}. ${transferBody}` },
    {
      id: "deliverables",
      title: "ไฟล์ที่ส่งมอบ",
      body: `ส่งมอบไฟล์: ${deliverables} ผ่านช่องทางดิจิทัลที่ตกลง (เช่น Job Tracker หรือลิงก์ดาวน์โหลด)`,
    },
    {
      id: "revisions",
      title: "จำนวนรอบแก้ไข",
      body: `รวมการแก้ไขฟรี ${rounds} รอบ${revisionFee}`,
    },
    {
      id: "deposit",
      title: "มัดจำและการยกเลิก",
      body: "มัดจำตามใบเสนอราคาไม่คืนเมื่อผู้ว่าจ้างยกเลิกหลังเริ่มงานแล้ว",
    },
    {
      id: "wht",
      title: "ภาษีหัก ณ ที่จ่าย",
      body: "ผู้ว่าจ้างหักภาษี ณ ที่จ่ายตามกฎหมาย และออกหนังสือรับรอง 50 ทวิ ให้ผู้รับจ้าง",
    },
  ];
}

export function summarizeUsageRights(rights: UsageRightsInput): string[] {
  const work = WORK_TYPE_OPTIONS.find((w) => w.value === rights.workType)?.label ?? rights.workType;
  const channels = rights.channels
    .map((c) => CHANNEL_OPTIONS.find((o) => o.value === c)?.label ?? c)
    .join(", ");
  const deliverables = rights.deliverables.map((d) => DELIVERABLE_LABELS[d]).join(", ");
  const territory =
    rights.territory === "custom" && rights.territoryCustom
      ? rights.territoryCustom
      : TERRITORY_LABELS[rights.territory];

  return [
    `ประเภทงาน: ${work}`,
    `สิทธิ: ${rights.licenseType === "exclusive" ? "ใช้คนเดียว (Exclusive)" : "ใช้ได้ แต่ขายซ้ำได้ (Non-Exclusive)"}`,
    `ช่องทาง: ${channels}`,
    `ภูมิภาค: ${territory} · ระยะเวลา: ${TERM_LABELS[rights.term]}`,
    `โอนสิทธิ์: ${TRANSFER_LABELS[rights.transferOn]}`,
    `ไฟล์ส่งมอบ: ${deliverables}`,
    `แก้ไขฟรี: ${rights.revisionRounds} รอบ`,
  ];
}
