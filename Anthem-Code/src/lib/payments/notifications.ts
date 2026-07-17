/** Payment notification payloads for in-app / push wiring. */

export type PaymentNotifyEvent =
  | "payment_succeeded"
  | "payment_failed"
  | "funds_available"
  | "payout_succeeded"
  | "payout_failed"
  | "recipient_rejected"
  | "refund_completed"
  | "dispute_opened";

export type PaymentNotifyPayload = {
  event: PaymentNotifyEvent;
  userId: string;
  titleTh: string;
  bodyTh: string;
  href?: string;
  meta?: Record<string, string | number>;
};

const COPY: Record<PaymentNotifyEvent, { titleTh: string; bodyTh: string }> = {
  payment_succeeded: {
    titleTh: "ชำระเงินสำเร็จ",
    bodyTh: "ระบบได้รับชำระแล้ว เงินของฟรีแลนซ์จะอยู่ในสถานะรอตรวจสอบจนกว่างานจะได้รับการอนุมัติ",
  },
  payment_failed: {
    titleTh: "ชำระเงินไม่สำเร็จ",
    bodyTh: "การชำระเงินล้มเหลวหรือหมดอายุ — ลองใหม่หรือเปลี่ยนวิธีจ่าย",
  },
  funds_available: {
    titleTh: "เงินพร้อมถอน",
    bodyTh: "ลูกค้าอนุมัติงานแล้ว ยอดเข้าพร้อมถอนตามนโยบาย Aplus1",
  },
  payout_succeeded: {
    titleTh: "โอนเงินสำเร็จ",
    bodyTh: "ระบบโอนเข้าบัญชีที่ยืนยันแล้วเรียบร้อย",
  },
  payout_failed: {
    titleTh: "โอนเงินล้มเหลว",
    bodyTh: "การโอนไม่สำเร็จ ยอดถูกคืนเข้าพร้อมถอน — ตรวจสอบบัญชีธนาคาร",
  },
  recipient_rejected: {
    titleTh: "บัญชีรับเงินไม่ผ่าน",
    bodyTh: "บัญชีธนาคารยังไม่ผ่านการยืนยัน — อัปเดตข้อมูลก่อนถอน",
  },
  refund_completed: {
    titleTh: "คืนเงินแล้ว",
    bodyTh: "ดำเนินการคืนเงินตามเงื่อนไขที่ยกเลิกงานแล้ว",
  },
  dispute_opened: {
    titleTh: "มีข้อพิพาท",
    bodyTh: "ยอดถูกระงับชั่วคราวจนกว่าแอดมินจะตัดสิน",
  },
};

export function buildPaymentNotify(
  event: PaymentNotifyEvent,
  userId: string,
  meta?: PaymentNotifyPayload["meta"],
  href?: string,
): PaymentNotifyPayload {
  const copy = COPY[event];
  return {
    event,
    userId,
    titleTh: copy.titleTh,
    bodyTh: copy.bodyTh,
    href,
    meta,
  };
}
