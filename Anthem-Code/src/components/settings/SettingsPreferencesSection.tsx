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
import { useAuth } from "@/hooks/useAuth";
import { pushCloudPrefs } from "@/lib/settingsCloudPrefs";
import { SettingsCard, useSaveStatus } from "@/components/settings/SettingsCard";

/** Display prefs (theme + language / timezone). */
export function SettingsPreferencesSection() {
  const [locale, setLocale] = useState<AppLocale>("th");
  const [timezone, setTimezone] = useState("Asia/Bangkok");
  const zones = useMemo(() => detectTimezones(), []);
  const { user } = useAuth();
  const { status, saved } = useSaveStatus();

  const persist = (next: { locale: AppLocale; timezone: string }) => {
    saveLocalePrefs(next);
    if (user?.id) void pushCloudPrefs(user.id, next);
    saved();
  };

  useEffect(() => {
    const prefs = loadLocalePrefs();
    setLocale(prefs.locale);
    setTimezone(prefs.timezone);
  }, []);

  return (
    <SettingsCard icon={Settings2} title="การแสดงผล" status={status}>
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
              persist({ locale: next, timezone });
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
              persist({ locale, timezone: next });
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
      <p className="text-[11px] text-muted-foreground">วันที่และเวลาในแอปแสดงตามเขตเวลานี้</p>
    </SettingsCard>
  );
}
