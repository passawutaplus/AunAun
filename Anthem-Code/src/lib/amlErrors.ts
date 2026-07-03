/** Map error message from RPC (prefixed with CODE:) to a friendly Thai message */
function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) {
    const msg = (e as { message: unknown }).message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  return typeof e === "string" ? e : "เกิดข้อผิดพลาด — ลองใหม่อีกครั้ง";
}

export const friendlyAmlError = (e: unknown): string => {
  const msg = errorMessage(e);
  if (msg.startsWith("AUTH:") || msg.includes("UNAUTHORIZED")) return "กรุณาเข้าสู่ระบบก่อน";
  if (msg.startsWith("ACCOUNT_FROZEN:")) return "บัญชีของคุณถูกระงับ — กรุณาติดต่อแอดมิน";
  if (msg.startsWith("RECIPIENT_FROZEN:")) return "ผู้รับถูกระงับบัญชี ส่งของขวัญไม่ได้";
  if (msg.startsWith("NEW_ACCOUNT:")) return "บัญชีใหม่ — กรุณารออย่างน้อย 1 ชั่วโมงก่อนส่งของขวัญ";
  if (msg.startsWith("HOLDING_PERIOD:")) return "ยอด Pixel ที่เพิ่งเติมยังไม่พร้อมใช้ส่งของขวัญ — ลองใหม่ภายหลัง";
  if (msg.startsWith("LIMIT_EXCEEDED:")) return msg.replace("LIMIT_EXCEEDED: ", "");
  if (msg.startsWith("VELOCITY:")) return "ส่งของขวัญถี่เกินไป — กรุณารอสักครู่";
  if (msg.startsWith("KYC_REQUIRED:")) return "ต้องยืนยันตัวตนก่อนถอนเงิน — ไปที่หน้า /verify";
  if (msg.startsWith("INSUFFICIENT_EARNED:")) return msg.replace("INSUFFICIENT_EARNED: ", "");
  if (msg.startsWith("INSUFFICIENT:")) return msg.replace("INSUFFICIENT: ", "");
  if (msg.includes("ALREADY_CLAIMED")) return "รับรางวัลภารกิจนี้แล้ว";
  if (msg.includes("WELCOME_CAP_REACHED")) return "รับครบโควต้า Welcome Bonus แล้ว";
  if (msg.includes("NOT_COMPLETE")) return "ยังทำภารกิจไม่ครบ — ทำให้เสร็จก่อนรับ px";
  if (msg.includes("ON CONFLICT")) return "ระบบกระเป๋า px กำลังอัปเดต — รีเฟรชแล้วลองใหม่";
  if (msg.startsWith("CAP_EXCEEDED:")) return msg.replace("CAP_EXCEEDED: ", "");
  if (msg.startsWith("INVALID:")) return msg.replace("INVALID: ", "");
  return msg;
};
