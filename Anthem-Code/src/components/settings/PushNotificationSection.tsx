import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SettingsCard, SettingsSwitch } from "@/components/settings/SettingsCard";
import { disablePush, enablePush, getPushState, type PushState } from "@/lib/pushNotifications";
import { userFacingError } from "@/lib/userFacingError";

const CARD_DISMISS_KEY = "samecor:push-card-dismissed";
const PITCH = "รู้ทันทีเมื่อมีคนทักแชท ติดตาม หรือถูกใจผลงาน — เด้งขึ้นบนมือถือพร้อมรูป";

function usePushState() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void getPushState().then((s) => alive && setState(s));
    return () => {
      alive = false;
    };
  }, []);

  const set = async (on: boolean) => {
    setBusy(true);
    try {
      const next = on ? await enablePush() : await disablePush();
      setState(next);
      if (on && next === "on") toast.success("เปิดแจ้งเตือนแล้ว");
      if (on && next === "denied") toast.error("เบราว์เซอร์บล็อกการแจ้งเตือนไว้ — เปิดได้ในการตั้งค่าของเบราว์เซอร์/แอป");
    } catch (err) {
      toast.error(userFacingError(err, "เปิดแจ้งเตือนไม่สำเร็จ"));
    } finally {
      setBusy(false);
    }
  };

  return { state, busy, set };
}

/** Settings → การแจ้งเตือน: on/off for this device. */
export function PushNotificationSection() {
  const { state, busy, set } = usePushState();
  if (state === null || state === "unsupported" || state === "unconfigured") return null;

  return (
    <SettingsCard
      icon={BellRing}
      title="แจ้งเตือนบนอุปกรณ์นี้"
      description={
        state === "denied"
          ? "ถูกบล็อกไว้ — เปิดสิทธิ์การแจ้งเตือนของ SAMECOR ในการตั้งค่าเบราว์เซอร์หรือมือถือก่อน"
          : PITCH
      }
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-foreground">{state === "on" ? "เปิดอยู่" : "ปิดอยู่"}</span>
        <SettingsSwitch
          checked={state === "on"}
          label="แจ้งเตือนบนอุปกรณ์นี้"
          disabled={busy || state === "denied"}
          onChange={(next) => void set(next)}
        />
      </div>
    </SettingsCard>
  );
}

/** Top of /notifications: a one-tap opt-in until the user turns it on or dismisses it. */
export function PushOptInCard() {
  const { state, busy, set } = usePushState();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(CARD_DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed || state !== "off") return null;

  const dismiss = () => {
    try {
      localStorage.setItem(CARD_DISMISS_KEY, "1");
    } catch {
      /* storage blocked */
    }
    setDismissed(true);
  };

  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <BellRing className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">เปิดแจ้งเตือนบนมือถือ</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{PITCH}</p>
        <Button size="sm" className="mt-3 rounded-full" disabled={busy} onClick={() => void set(true)}>
          เปิดแจ้งเตือน
        </Button>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="ไม่ใช่ตอนนี้"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
