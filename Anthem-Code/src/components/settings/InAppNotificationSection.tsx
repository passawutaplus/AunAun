import { useEffect, useState } from "react";
import { Bell, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  DEFAULT_IN_APP_NOTIFY_PREFS,
  IN_APP_NOTIFY_OPTIONS,
  loadInAppNotifyPrefs,
  saveInAppNotifyPrefs,
  type InAppNotifyKey,
} from "@/lib/inAppNotifyPrefs";
import {
  MUTE_DURATIONS_MS,
  NOTIFY_FREQUENCY_OPTIONS,
  loadNotifyDeliveryPrefs,
  notifyMuteRemainingLabel,
  saveNotifyDeliveryPrefs,
  type NotifyFrequency,
} from "@/lib/notifyDeliveryPrefs";
import { cn } from "@/lib/utils";

/** Controls which kinds appear in the web notification bell / inbox. */
export function InAppNotificationSection() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Record<InAppNotifyKey, boolean>>(DEFAULT_IN_APP_NOTIFY_PREFS);
  const [frequency, setFrequency] = useState<NotifyFrequency>("immediate");
  const [muteUntil, setMuteUntil] = useState<number | null>(null);
  const [emailByType, setEmailByType] = useState<Partial<Record<InAppNotifyKey, boolean>>>({});

  useEffect(() => {
    setPrefs(loadInAppNotifyPrefs(user?.id));
    const delivery = loadNotifyDeliveryPrefs(user?.id);
    setFrequency(delivery.frequency);
    setMuteUntil(delivery.muteUntil && delivery.muteUntil > Date.now() ? delivery.muteUntil : null);
    setEmailByType(delivery.emailByType);
  }, [user?.id]);

  const persistDelivery = (patch: {
    frequency?: NotifyFrequency;
    muteUntil?: number | null;
    emailByType?: Partial<Record<InAppNotifyKey, boolean>>;
  }) => {
    if (!user?.id) return;
    const next = {
      frequency: patch.frequency ?? frequency,
      muteUntil: patch.muteUntil === undefined ? muteUntil : patch.muteUntil,
      emailByType: patch.emailByType ?? emailByType,
    };
    setFrequency(next.frequency);
    setMuteUntil(next.muteUntil);
    setEmailByType(next.emailByType);
    saveNotifyDeliveryPrefs(user.id, next);
    toast.success("บันทึกในอุปกรณ์นี้แล้ว");
  };

  const setKey = (key: InAppNotifyKey, value: boolean) => {
    if (!user?.id) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    saveInAppNotifyPrefs(user.id, next);
    toast.success("บันทึกในอุปกรณ์นี้แล้ว");
  };

  const muteLabel = notifyMuteRemainingLabel(muteUntil);

  return (
    <section className="rounded-2xl glass-panel p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">แจ้งเตือนในเว็บ (กระดิ่ง)</h2>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        เลือกว่าจะเห็นประเภทไหนใน{" "}
        <Link to="/notifications" className="text-primary hover:underline inline-flex items-center gap-0.5">
          กล่องการแจ้งเตือน
          <ChevronRight className="w-3 h-3" />
        </Link>{" "}
        และป้ายตัวเลขบนไอคอนกระดิ่ง — บันทึกในอุปกรณ์นี้
      </p>

      <div className="space-y-2">
        <p className="text-sm font-medium">ความถี่</p>
        <div className="flex flex-wrap gap-1.5">
          {NOTIFY_FREQUENCY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => persistDelivery({ frequency: opt.value })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs",
                frequency === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {NOTIFY_FREQUENCY_OPTIONS.find((o) => o.value === frequency)?.hint}
        </p>
      </div>

      <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">ปิดเสียงทั้งหมดชั่วคราว</p>
            <p className="text-xs text-muted-foreground">
              {muteLabel ?? "กระดิ่งจะเงียบจนกว่าจะครบเวลาที่เลือก"}
            </p>
          </div>
          {muteUntil ? (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => persistDelivery({ muteUntil: null })}
            >
              เปิดเสียง
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MUTE_DURATIONS_MS.map((d) => (
            <button
              key={d.label}
              type="button"
              onClick={() => persistDelivery({ muteUntil: Date.now() + d.ms })}
              className="rounded-full border border-border px-3 py-1 text-xs hover:border-primary/40"
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-muted-foreground">
              <th className="py-2 pr-3 font-medium">ประเภท</th>
              <th className="py-2 px-2 font-medium text-center">ในเว็บ</th>
              <th className="py-2 px-2 font-medium text-center">อีเมล</th>
            </tr>
          </thead>
          <tbody>
            {IN_APP_NOTIFY_OPTIONS.map((opt) => (
              <tr key={opt.key} className="border-t border-border/50">
                <td className="py-2.5 pr-3">
                  <p className="font-medium text-foreground">{opt.label}</p>
                  <p className="text-[11px] text-muted-foreground">{opt.description}</p>
                </td>
                <td className="px-2 text-center">
                  <MiniSwitch
                    checked={prefs[opt.key]}
                    label={`${opt.label} ในเว็บ`}
                    onChange={(v) => setKey(opt.key, v)}
                  />
                </td>
                <td className="px-2 text-center">
                  <MiniSwitch
                    checked={emailByType[opt.key] !== false}
                    label={`${opt.label} อีเมล`}
                    onChange={(v) => persistDelivery({ emailByType: { ...emailByType, [opt.key]: v } })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MiniSwitch({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-label={label}
      aria-pressed={checked}
      className={cn(
        "relative mx-auto w-10 h-5 rounded-full transition-colors",
        checked ? "bg-primary" : "bg-muted dark:bg-input",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background shadow-sm ring-1 ring-border/60 transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}
