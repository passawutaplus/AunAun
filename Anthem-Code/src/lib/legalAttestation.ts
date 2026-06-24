import { LEGAL_APP_NAME } from "@/lib/legalConfig";

/** หัวข้อคำแถลการยืนยันสิทธิ์ในผลงาน (ใช้ใน checkbox + หน้า /legal/ip) */
export const ATTESTATION_TITLE = "คำแถลการยืนยันสิทธิ์ในผลงาน";

/** ข้อความสั้นสำหรับ checkbox label */
export const ATTESTATION_SHORT =
  `ฉันยืนยันว่าผลงานนี้เป็นของฉัน หรือฉันได้รับอนุญาตให้เผยแพร่บน ${LEGAL_APP_NAME} แล้ว`;

/** รายการ bullet ในคำแถล (ใช้ร่วมกัน checkbox + หน้ากฎหมาย) */
export const ATTESTATION_BULLETS = [
  "เป็นผลงานที่ข้าพเจ้าสร้างขึ้นเอง หรือ",
  `ข้าพเจ้าได้รับอนุญาตอย่างถูกต้องจากเจ้าของลิขสิทธิ์ให้เผยแพร่บน ${LEGAL_APP_NAME} แล้ว`,
] as const;

/** ย่อหน้าสรุปผลทางกฎหมาย */
export const ATTESTATION_LEGAL_NOTE =
  "ข้าพเจ้าเข้าใจว่าการนำผลงานของผู้อื่นมาแสดงโดยไม่ได้รับอนุญาต ถือเป็นการละเมิดลิขสิทธิ์ อาจมีความรับผิดทางกฎหมาย และเทียบเท่าการนำทรัพย์สินของผู้อื่นมาใช้โดยไม่ชอบ";

/** anchor id บนหน้า /legal/ip */
export const ATTESTATION_ANCHOR_ID = "attestation";
