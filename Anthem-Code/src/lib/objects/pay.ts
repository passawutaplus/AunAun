import { supabase } from "@/integrations/supabase/client";
import { canChargeOnlineClient, DEFAULT_PAYMENT_FEATURE_FLAGS } from "@/lib/payments/flags";

export type ObjectChargeResult = {
  chargeId: string;
  qrCodeUri: string | null;
  amountSatang: number;
  expiresAt: string;
  paid: boolean;
  live: boolean;
};

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("ต้องเข้าสู่ระบบ");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export function objectPayEnabled(): boolean {
  return canChargeOnlineClient(DEFAULT_PAYMENT_FEATURE_FLAGS, "promptpay");
}

export async function createObjectCharge(orderId: string, title: string): Promise<ObjectChargeResult> {
  const res = await fetch("/api/object-charge", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ orderId, title }),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<ObjectChargeResult> & { error?: string };
  if (!res.ok) throw new Error(chargeErrorText(data.error));
  return {
    chargeId: String(data.chargeId ?? ""),
    qrCodeUri: data.qrCodeUri ?? null,
    amountSatang: Number(data.amountSatang ?? 0),
    expiresAt: String(data.expiresAt ?? ""),
    paid: data.paid === true,
    live: true,
  };
}

export async function syncObjectCharge(orderId: string, chargeId: string): Promise<ObjectChargeResult> {
  const res = await fetch("/api/object-charge", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      action: "sync",
      orderId,
      chargeId,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<ObjectChargeResult> & { error?: string };
  if (!res.ok) throw new Error(chargeErrorText(data.error));
  return {
    chargeId: String(data.chargeId ?? chargeId),
    qrCodeUri: data.qrCodeUri ?? null,
    amountSatang: Number(data.amountSatang ?? 0),
    expiresAt: String(data.expiresAt ?? ""),
    paid: data.paid === true,
    live: true,
  };
}

function chargeErrorText(code: string | undefined): string {
  if (code === "payso_not_integrated" || code === "provider_disabled" || code === "service_not_configured") {
    return "ยังเปิดรับเงิน Payso ไม่ได้บนระบบนี้";
  }
  if (code === "live_blocked_until_marketplace_approved") return "รอเปิดรับเงินจริงกับ Payso ก่อน";
  if (code === "already_paid") return "คำสั่งนี้จ่ายแล้ว";
  if (code === "invalid_amount") return "ยอดสั่งยังไม่ถูกบันทึก";
  if (code === "auth_required") return "ต้องเข้าสู่ระบบ";
  return code || "สร้างรายการจ่ายไม่สำเร็จ";
}
