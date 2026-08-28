import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useEnsureSensitiveAction } from "@/components/legal/SensitiveActionReauthProvider";
import {
  WithdrawPinEditorDialog,
  type WithdrawPinEditorMode,
} from "@/components/settings/WithdrawPinEditorDialog";
import { hasWithdrawPin, withdrawPinOwnerKey } from "@/lib/payments/withdrawPin";

type Props = {
  user: User;
};

/** Account settings: set, change, or recover the 6-digit withdraw PIN. */
export function WithdrawPinSettingsSection({ user }: Props) {
  const [searchParams] = useSearchParams();
  const ensureVerified = useEnsureSensitiveAction();
  const ownerKey = withdrawPinOwnerKey(user.id);
  const [pinSet, setPinSet] = useState(() => hasWithdrawPin(ownerKey));
  const [editor, setEditor] = useState<WithdrawPinEditorMode | null>(null);
  const [recoverBusy, setRecoverBusy] = useState(false);
  const recoverOnce = useRef(false);

  useEffect(() => {
    setPinSet(hasWithdrawPin(ownerKey));
  }, [ownerKey]);

  const refreshPin = () => setPinSet(hasWithdrawPin(ownerKey));

  const startRecover = async () => {
    setRecoverBusy(true);
    try {
      await ensureVerified("ยืนยันว่าเป็นเจ้าของบัญชีก่อนตั้ง PIN ถอนเงินใหม่", { force: true });
      setEditor("recover");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (!msg.includes("ยกเลิก")) {
        toast.error(msg || "ยืนยันไม่สำเร็จ — ยังใช้ PIN เดิมอยู่");
      }
    } finally {
      setRecoverBusy(false);
    }
  };

  useEffect(() => {
    if (searchParams.get("recover") !== "pin" || recoverOnce.current) return;
    recoverOnce.current = true;
    const next = new URLSearchParams(searchParams);
    next.delete("recover");
    const qs = next.toString();
    const hash = window.location.hash || "#account";
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${hash}`);
    void startRecover();
    // recover query is consumed once; startRecover uses latest ensureVerified via this mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <section id="settings-pin" className="scroll-mt-24 rounded-2xl glass-panel p-6 space-y-4">
      <div className="flex items-center gap-2">
        <KeyRound className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">PIN ถอนเงิน</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        รหัส 6 ตัวสำหรับยืนยันตอนโอนเงินเข้าบัญชี — คนละชุดกับรหัสผ่านเข้าสู่ระบบ
      </p>

      <div className="flex items-center gap-2 text-sm">
        <ShieldCheck className={`h-4 w-4 ${pinSet ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`} />
        <span className={pinSet ? "text-foreground" : "text-muted-foreground"}>
          {pinSet ? "ตั้ง PIN แล้ว — ใช้ตอนกดยืนยันถอนเงิน" : "ยังไม่ได้ตั้ง PIN"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {pinSet ? (
          <>
            <Button
              type="button"
              size="sm"
              className="rounded-full"
              onClick={() => setEditor("change")}
            >
              เปลี่ยน PIN
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={recoverBusy}
              onClick={() => void startRecover()}
            >
              {recoverBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              ลืม PIN
            </Button>
          </>
        ) : (
          <Button type="button" size="sm" className="rounded-full" onClick={() => setEditor("setup")}>
            ตั้ง PIN
          </Button>
        )}
      </div>

      {pinSet ? (
        <p className="text-xs text-muted-foreground">
          ลืม หรือถูกล็อกจากใส่ผิดหลายครั้ง — กด <strong>ลืม PIN</strong> แล้วยืนยันรหัสผ่านบัญชี
          (หรืออีเมล Google) จากนั้นตั้งชุดใหม่
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          ครั้งแรกที่ถอนเงินก็ตั้งได้ — หรือตั้งล่วงหน้าที่นี่
        </p>
      )}

      <WithdrawPinEditorDialog
        open={editor !== null}
        mode={editor ?? "setup"}
        ownerKey={ownerKey}
        onClose={() => setEditor(null)}
        onSaved={refreshPin}
      />
    </section>
  );
}
