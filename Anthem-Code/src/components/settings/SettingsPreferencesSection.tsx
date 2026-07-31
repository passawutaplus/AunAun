import { Settings2 } from "lucide-react";
import { ThemeSettingsSection } from "@/components/settings/ThemeSettingsSection";

/** Display prefs (theme + feed density). */
export function SettingsPreferencesSection() {
  return (
    <section className="rounded-2xl glass-panel p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Settings2 className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">การแสดงผล</h2>
      </div>
      <ThemeSettingsSection embedded />
    </section>
  );
}
