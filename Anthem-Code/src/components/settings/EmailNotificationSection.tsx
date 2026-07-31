import { Link } from "react-router-dom";
import { ChevronRight, Mail } from "lucide-react";

export type EmailNotificationFields = {
  notifyEmail: boolean;
  notifyHire: boolean;
  notifyCollab: boolean;
  notifyJobMatch: boolean;
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
        ควบคุมอีเมลจาก Aplus1 — แจ้งเตือนกระดิ่งในเว็บตั้งค่าแยกด้านบน · ดูกล่องรวมที่{" "}
        <Link to="/notifications" className="text-primary hover:underline inline-flex items-center gap-0.5">
          การแจ้งเตือน
          <ChevronRight className="w-3 h-3" />
        </Link>
      </p>

      <Toggle
        label="เปิดอีเมลจาก Aplus1"
        description="ปิดแล้วจะไม่ได้รับอีเมลทุกประเภท (แชท ของขวัญ การติดตาม ชุมชน การเงิน ฯลฯ)"
        checked={value.notifyEmail}
        onChange={(v) => onChange("notifyEmail", v)}
      />
      <div className="rounded-xl border border-border/60 bg-secondary/40 px-3 py-2.5 space-y-2">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          ประเภทอีเมลสำคัญ
        </p>
        <Toggle
          label="คำขอจ้างงาน"
          description="มีคนสนใจจ้างจากผลงานหรือแพ็กเกจของคุณ"
          checked={value.notifyHire}
          disabled={!value.notifyEmail}
          onChange={(v) => onChange("notifyHire", v)}
        />
        <Toggle
          label="คำขอคอลแลป"
          description="มีคนส่งคำชวนคอลแลปหรืออัปเดตสถานะคอลแลป"
          checked={value.notifyCollab}
          disabled={!value.notifyEmail}
          onChange={(v) => onChange("notifyCollab", v)}
        />
        <Toggle
          label="งานที่ตรงสาย"
          description="จับคู่ประกาศงานกับสายงาน / ความสนใจของคุณ"
          checked={value.notifyJobMatch}
          disabled={!value.notifyEmail}
          onChange={(v) => onChange("notifyJobMatch", v)}
        />
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        อีเมลธุรกรรมที่จำเป็น (เช่น ยืนยันอีเมล รีเซ็ตรหัสผ่าน ใบเสร็จ) ยังส่งได้แม้ปิดแจ้งเตือนทั่วไป
      </p>
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
