import { Link } from "react-router-dom";
import { ChevronRight, Mail } from "lucide-react";

export type EmailNotificationFields = {
  notifyEmail: boolean;
  notifyHire: boolean;
  notifyCollab: boolean;
};

type Props = {
  value: EmailNotificationFields;
  onChange: <K extends keyof EmailNotificationFields>(
    key: K,
    value: EmailNotificationFields[K],
  ) => void;
};

export function EmailNotificationSection({ value, onChange }: Props) {
  return (
    <section className="rounded-2xl glass-panel p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">แจ้งเตือนทางอีเมล</h2>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        ควบคุมอีเมลจาก Aplus1 — แจ้งเตือนในแอปดูที่{" "}
        <Link to="/notifications" className="text-primary hover:underline inline-flex items-center gap-0.5">
          กล่องการแจ้งเตือน
          <ChevronRight className="w-3 h-3" />
        </Link>
      </p>

      <Toggle
        label="เปิดอีเมลจาก Aplus1"
        description="ปิดแล้วจะไม่ได้รับอีเมลทุกประเภท (แชท ของขวัญ การติดตาม การเงิน ฯลฯ)"
        checked={value.notifyEmail}
        onChange={(v) => onChange("notifyEmail", v)}
      />
      <Toggle
        label="แจ้งเตือนเมื่อมีคำขอจ้างงาน"
        description="ส่งอีเมลทันทีที่มีคนสนใจจ้างจากผลงานของคุณ"
        checked={value.notifyHire}
        disabled={!value.notifyEmail}
        onChange={(v) => onChange("notifyHire", v)}
      />
      <Toggle
        label="แจ้งเตือนเมื่อมีคนสนใจคอลแลป"
        description="ส่งอีเมลทันทีที่มีคนส่งคำขอคอลแลปถึงคุณ"
        checked={value.notifyCollab}
        disabled={!value.notifyEmail}
        onChange={(v) => onChange("notifyCollab", v)}
      />
    </section>
  );
}

function Toggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 py-2 ${disabled ? "opacity-50" : ""}`}>
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        aria-label={label}
        aria-pressed={checked}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:cursor-not-allowed ${
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
