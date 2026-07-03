import { useCallback, useState, type ReactNode } from "react";
import SensitiveActionReauthDialog, {
  type ReauthRequest,
} from "@/components/legal/SensitiveActionReauthDialog";
import { isSensitiveActionVerified } from "@/lib/sensitiveActionAuth";
import { useAuth } from "@/hooks/useAuth";

/**
 * ยืนยันรหัสผ่าน (หรืออีเมลสำหรับ OAuth) ก่อน consent / PDPA / รายงาน
 * ถ้าไม่ login — ข้าม (guest actions ใช้ flow ของตัวเอง)
 */
export function useSensitiveActionReauth() {
  const { user } = useAuth();
  const [request, setRequest] = useState<ReauthRequest | null>(null);

  const ensureVerified = useCallback(
    (reason: string): Promise<void> => {
      if (!user) return Promise.resolve();
      if (isSensitiveActionVerified()) return Promise.resolve();

      return new Promise<void>((resolve, reject) => {
        setRequest({ reason, resolve, reject });
      });
    },
    [user],
  );

  const close = useCallback(() => setRequest(null), []);

  const reauthDialog: ReactNode = (
    <SensitiveActionReauthDialog request={request} onClose={close} />
  );

  return { ensureVerified, reauthDialog };
}
