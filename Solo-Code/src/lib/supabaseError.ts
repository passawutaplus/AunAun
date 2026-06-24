export function getSupabaseErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "";
}

export function throwIfSupabaseError(
  error: { message?: string } | null | undefined,
  fallback = "เกิดข้อผิดพลาดจากฐานข้อมูล",
): asserts error is null | undefined {
  if (error) {
    throw new Error(getSupabaseErrorMessage(error) || fallback);
  }
}

export function mapTicketSubmitErrorMessage(raw: string, fallback: string): string {
  const msg = raw.toLowerCase();
  if (msg.includes("ต้องเข้าสู่ระบบ")) {
    return "กรุณาเข้าสู่ระบบก่อนส่งฟีดแบ็ก";
  }
  if (msg.includes("schema cache") || (msg.includes("rating") && msg.includes("column"))) {
    return "ฐานข้อมูลยังอัปเดตไม่ครบ — รีโหลด schema cache ใน Supabase";
  }
  if (msg.includes("support_tickets") || msg.includes("could not find the table")) {
    return "ยังไม่มีตารางตั๋ว — รัน migration support_tickets";
  }
  if (msg.includes("row-level security") || msg.includes("violates row-level")) {
    return "สิทธิ์ไม่พอ — ลองออกจากระบบแล้วเข้าใหม่";
  }
  if (msg.includes("ticket_number")) {
    return "ระบบเลขตั๋วยังไม่พร้อม — ติดต่อแอดมินเพื่ออัปเดตฐานข้อมูล";
  }
  return raw || fallback;
}
