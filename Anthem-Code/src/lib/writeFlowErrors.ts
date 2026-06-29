/** Map Supabase / app errors to short Thai copy for write flows. */
export function mapWriteFlowError(err: unknown, fallback = "บันทึกไม่สำเร็จ"): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err !== null && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err ?? "");

  const m = raw.toLowerCase();

  if (m.includes("permission denied") || m.includes("42501") || m.includes("row-level security")) {
    return "สิทธิ์บัญชีนี้ยังทำรายการนี้ไม่ได้ — ลองเข้าสู่ระบบใหม่หรือติดต่อทีมงาน";
  }
  if (m.includes("jwt") || m.includes("not authenticated") || m.includes("unauth")) {
    return "กรุณาเข้าสู่ระบบก่อนทำรายการนี้";
  }
  if (m.includes("failed to fetch") || m.includes("network") || m.includes("load failed")) {
    return "เชื่อมต่อไม่สำเร็จ — ตรวจสัญญาณแล้วลองใหม่";
  }
  if (m.includes("duplicate") || m.includes("23505")) {
    return "คุณทำรายการนี้ไปแล้ว";
  }
  if (m.includes("ไม่สามารถส่งคอมเมนต์")) {
    return raw;
  }
  if (raw.trim()) return raw;
  return fallback;
}
