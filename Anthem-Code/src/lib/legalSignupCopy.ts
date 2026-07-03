import { LEGAL_APP_NAME } from "@/lib/legalConfig";

/** ข้อความ signup — draft รอทนาย/PDPA consultant ตรวจ (ดู docs/product/aplus1-legal-compliance-mvp-spec.md) */

export const SIGNUP_TERMS_LABEL =
  `ฉันอ่านและยอมรับข้อกำหนดการใช้งานของ ${LEGAL_APP_NAME} แล้ว โดยเข้าใจว่า ${LEGAL_APP_NAME} เป็นแพลตฟอร์มค้นพบผลงานและเริ่มบทสนทนาเรื่องโอกาส ไม่ใช่นายจ้าง ตัวแทนจัดหางาน หรือผู้รับประกันการจ้างงาน`;

export const SIGNUP_PRIVACY_LABEL =
  `ฉันรับทราบประกาศความเป็นส่วนตัวของ ${LEGAL_APP_NAME} และเข้าใจว่า ${LEGAL_APP_NAME} จะใช้ข้อมูลของฉันเพื่อให้บริการบัญชี โปรไฟล์ ผลงาน การติดต่อ และความปลอดภัยของแพลตฟอร์ม`;

export const SIGNUP_AGE_LABEL =
  "ฉันยืนยันว่าฉันมีอายุและสิทธิ์เพียงพอในการใช้บริการนี้ หรือได้รับความยินยอมจากผู้ปกครองตามที่กฎหมายกำหนด";

export const INQUIRY_PLATFORM_DISCLAIMER =
  `การคุยต่อจากผลงานนี้เป็นการติดต่อระหว่างผู้ใช้โดยตรง ${LEGAL_APP_NAME} ไม่ใช่คู่สัญญา นายจ้าง หรือตัวแทนจัดหางาน และไม่ได้รับประกันผลลัพธ์ของโอกาสนี้`;
