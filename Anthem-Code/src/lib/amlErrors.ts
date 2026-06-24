/** Map error message from RPC (prefixed with CODE:) to a friendly Thai message */
export const friendlyAmlError = (e: unknown): string => {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.startsWith("AUTH:")) return "กรุณาเข้าสู่ระบบก่อน";
  if (msg.startsWith("ACCOUNT_FROZEN:")) return "บัญชีของคุณถูกระงับ — กรุณาติดต่อแอดมิน";
  if (msg.startsWith("RECIPIENT_FROZEN:")) return "ผู้รับถูกระงับบัญชี ส่งของขวัญไม่ได้";
  if (msg.startsWith("NEW_ACCOUNT:")) return "บัญชีใหม่ — กรุณารออย่างน้อย 1 ชั่วโมงก่อนส่งของขวัญ";
  if (msg.startsWith("HOLDING_PERIOD:")) return "ยอด Pixel ที่เพิ่งเติมต้องรอ 24 ชม. ก่อนใช้ส่งของขวัญ";
  if (msg.startsWith("LIMIT_EXCEEDED:")) return msg.replace("LIMIT_EXCEEDED: ", "");
  if (msg.startsWith("VELOCITY:")) return "ส่งของขวัญถี่เกินไป — กรุณารอสักครู่";
  if (msg.startsWith("KYC_REQUIRED:")) return "ต้องยืนยันตัวตนก่อนถอนเงิน — ไปที่หน้า /verify";
  if (msg.startsWith("INSUFFICIENT_EARNED:")) return msg.replace("INSUFFICIENT_EARNED: ", "");
  if (msg.startsWith("INSUFFICIENT:")) return msg.replace("INSUFFICIENT: ", "");
  if (msg.startsWith("ALREADY_CLAIMED:")) return "รับรางวัลภารกิจนี้แล้ว";
  if (msg.startsWith("NOT_COMPLETE:")) return "ยังทำภารกิจไม่ครบ — ทำให้เสร็จก่อนรับ PX";
  if (msg.startsWith("CAP_EXCEEDED:")) return msg.replace("CAP_EXCEEDED: ", "");
  if (msg.startsWith("INVALID:")) return msg.replace("INVALID: ", "");
  return msg;
};
