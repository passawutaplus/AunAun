import { Settings2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ThemeSettingsSection } from "@/components/settings/ThemeSettingsSection";
import {
  APP_LOCALE_OPTIONS,
  detectTimezones,
  loadLocalePrefs,
  saveLocalePrefs,
  type AppLocale,
} from "@/lib/localePrefs";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/** Display prefs (theme + language / timezone). */
export function SettingsPreferencesSection() {
  const [locale, setLocale] = useState<AppLocale>("th");
  const [timezone, setTimezone] = useState("Asia/Bangkok");
  const zones = useMemo(() => detectTimezones(), []);

  useEffect(() => {
    const prefs = loadLocalePrefs();
    setLocale(prefs.locale);
    setTimezone(prefs.timezone);
  }, []);

  return (
    <section className="rounded-2xl glass-panel p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Settings2 className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">การแสดงผล</h2>
      </div>
      <ThemeSettingsSection embedded />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="settings-locale">ภาษา</Label>
          <select
            id="settings-locale"
            value={locale}
            onChange={(e) => {
              const next = e.target.value as AppLocale;
              setLocale(next);
              saveLocalePrefs({ locale: next, timezone });
              toast.success("บันทึกภาษาในอุปกรณ์นี้แล้ว");
            }}
            className="w-full h-10 rounded-xl border border-border bg-secondary px-3 text-sm"
          >
            {APP_LOCALE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="settings-tz">เขตเวลา</Label>
          <select
            id="settings-tz"
            value={timezone}
            onChange={(e) => {
              const next = e.target.value;
              setTimezone(next);
              saveLocalePrefs({ locale, timezone: next });
              toast.success("บันทึกเขตเวลาในอุปกรณ์นี้แล้ว");
            }}
            className="w-full h-10 rounded-xl border border-border bg-secondary px-3 text-sm"
          >
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        ภาษาและเขตเวลาเก็บในอุปกรณ์นี้ — วันที่ในโปรไฟล์ใช้เขตเวลานี้แสดง
      </p>
    </section>
  );
}
