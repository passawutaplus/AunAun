import { Link } from "react-router-dom";
import { Bell, ChevronRight, Mail } from "lucide-react";
import {
  JOB_ROLE_CATEGORIES,
  PREFERRED_EMPLOYMENT_OPTIONS,
  type PreferredEmploymentType,
} from "@/lib/jobConstants";

export type EmailNotificationFields = {
  notifyEmail: boolean;
  notifyHire: boolean;
  notifyJobMatch: boolean;
  preferredCategories: string[];
  preferredEmploymentTypes: string[];
};

type Props = {
  value: EmailNotificationFields;
  onChange: <K extends keyof EmailNotificationFields>(
    key: K,
    value: EmailNotificationFields[K],
  ) => void;
};

export function EmailNotificationSection({ value, onChange }: Props) {
  const toggleCategory = (cat: string) => {
    const active = value.preferredCategories.includes(cat);
    onChange(
      "preferredCategories",
      active
        ? value.preferredCategories.filter((c) => c !== cat)
        : [...value.preferredCategories, cat],
    );
  };

  const toggleEmployment = (emp: PreferredEmploymentType) => {
    const active = value.preferredEmploymentTypes.includes(emp);
    onChange(
      "preferredEmploymentTypes",
      active
        ? value.preferredEmploymentTypes.filter((x) => x !== emp)
        : [...value.preferredEmploymentTypes, emp],
    );
  };

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
        label="แจ้งเตือนงานที่ตรงกับฉัน"
        description="ระบบคัดประกาศจากบอร์ดงานที่ตรงกับสกิล/หมวดของคุณมาแจ้งอัตโนมัติ"
        checked={value.notifyJobMatch}
        disabled={!value.notifyEmail}
        onChange={(v) => onChange("notifyJobMatch", v)}
      />

      {value.notifyEmail && value.notifyJobMatch && (
        <div className="space-y-4 pt-1 border-t border-border/40">
          <div>
            <p id="settings-job-categories-label" className="text-xs text-muted-foreground mb-2">
              หมวดหมู่งานที่สนใจ
              {value.preferredCategories.length > 0 ? (
                <span className="text-foreground/70"> · เลือกแล้ว {value.preferredCategories.length}</span>
              ) : (
                <span className="text-foreground/70"> · ไม่เลือก = ใช้สกิลและหมวดจากโปรไฟล์/ผลงาน</span>
              )}
            </p>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-labelledby="settings-job-categories-label"
            >
              {JOB_ROLE_CATEGORIES.map((cat) => {
                const active = value.preferredCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-2 min-h-11 rounded-full text-xs transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground hover:bg-accent"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p id="settings-employment-types-label" className="text-xs text-muted-foreground mb-2">
              ประเภทการจ้างที่ต้องการ
            </p>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-labelledby="settings-employment-types-label"
            >
              {PREFERRED_EMPLOYMENT_OPTIONS.map(({ value: emp, label }) => {
                const active = value.preferredEmploymentTypes.includes(emp);
                return (
                  <button
                    key={emp}
                    type="button"
                    onClick={() => toggleEmployment(emp)}
                    className={`px-3 py-2 min-h-11 rounded-full text-xs transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground hover:bg-accent"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border/40 pt-3 flex items-start gap-1.5">
        <Bell className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        สมาชิก Pro+ ตั้งค่าแจ้งเตือนผ่าน LINE แบบละเอียดได้ด้านบน
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
