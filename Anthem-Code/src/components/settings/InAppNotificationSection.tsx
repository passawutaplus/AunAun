import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  DEFAULT_IN_APP_NOTIFY_PREFS,
  IN_APP_NOTIFY_OPTIONS,
  loadInAppNotifyPrefs,
  saveInAppNotifyPrefs,
  type InAppNotifyKey,
} from "@/lib/inAppNotifyPrefs";

/** Controls which kinds appear in the web notification bell / inbox. */
export function InAppNotificationSection() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Record<InAppNotifyKey, boolean>>(DEFAULT_IN_APP_NOTIFY_PREFS);

  useEffect(() => {
    setPrefs(loadInAppNotifyPrefs(user?.id));
  }, [user?.id]);

  const setKey = (key: InAppNotifyKey, value: boolean) => {
    if (!user?.id) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    saveInAppNotifyPrefs(user.id, next);
  };

  return (
    <section className="rounded-2xl glass-panel p-6 space-y-3">
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

      {IN_APP_NOTIFY_OPTIONS.map((opt) => (
        <Toggle
          key={opt.key}
          label={opt.label}
          description={opt.description}
          checked={prefs[opt.key]}
          onChange={(v) => setKey(opt.key, v)}
        />
      ))}
    </section>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-label={label}
        aria-pressed={checked}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
          checked ? "bg-primary" : "bg-muted dark:bg-input"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow-sm ring-1 ring-border/60 transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}
