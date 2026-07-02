import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useKuyRadarContext } from "@/hooks/admin/KuyRadarContext";
import { useKuyRadarBusinesses } from "@/hooks/admin/useKuyRadarBusinesses";
import { useKuyRadarSettings } from "@/hooks/admin/useKuyRadarSettings";
import type { KuyLanguage } from "@/lib/kuy-radar/types";
import { KuyRadarCard } from "./KuyRadarShell";

export default function KuySettingsPanel() {
  const { uiLanguage, setLanguagePref } = useKuyRadarContext();
  const { activeBusinessId, deleteBusinessData } = useKuyRadarBusinesses();
  const { settings, saveSettings } = useKuyRadarSettings(activeBusinessId);
  const [form, setForm] = useState({
    default_language: "both" as KuyLanguage,
    timezone: "Asia/Bangkok",
    data_retention_days: 365,
    export_default_format: "csv",
    ai_mock_enabled: true,
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      default_language: settings.default_language,
      timezone: settings.timezone,
      data_retention_days: settings.data_retention_days,
      export_default_format: settings.export_default_format,
      ai_mock_enabled: settings.ai_mock_enabled,
    });
    setLanguagePref(settings.default_language);
  }, [settings, setLanguagePref]);

  const save = async () => {
    try {
      await saveSettings(form);
      toast.success(uiLanguage === "th" ? "บันทึกการตั้งค่าแล้ว" : "Settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const wipe = async () => {
    if (!activeBusinessId) return;
    if (!confirm(uiLanguage === "th" ? "ลบข้อมูลธุรกิจนี้ทั้งหมด?" : "Delete all data for this business?")) return;
    try {
      await deleteBusinessData(activeBusinessId);
      toast.success("Deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="space-y-4">
      <KuyRadarCard className="p-5">
        <h2 className="text-lg font-semibold text-admin-fg">Settings</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            Default language
            <select
              className="mt-1 w-full rounded-lg border border-admin-border px-3 py-2"
              value={form.default_language}
              onChange={(e) => setForm((f) => ({ ...f, default_language: e.target.value as KuyLanguage }))}
            >
              <option value="th">TH</option>
              <option value="en">EN</option>
              <option value="both">Both</option>
            </select>
          </label>
          <label className="text-sm">
            Timezone
            <input
              className="mt-1 w-full rounded-lg border border-admin-border px-3 py-2"
              value={form.timezone}
              onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            Data retention (days)
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-admin-border px-3 py-2"
              value={form.data_retention_days}
              onChange={(e) => setForm((f) => ({ ...f, data_retention_days: Number(e.target.value) }))}
            />
          </label>
          <label className="text-sm">
            Export default
            <select
              className="mt-1 w-full rounded-lg border border-admin-border px-3 py-2"
              value={form.export_default_format}
              onChange={(e) => setForm((f) => ({ ...f, export_default_format: e.target.value }))}
            >
              <option value="csv">CSV</option>
              <option value="xlsx">XLSX</option>
              <option value="pdf">PDF</option>
            </select>
          </label>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.ai_mock_enabled}
            onChange={(e) => setForm((f) => ({ ...f, ai_mock_enabled: e.target.checked }))}
          />
          AI mock mode (VITE_KUY_RADAR_AI_MOCK)
        </label>
        <p className="mt-4 text-xs text-admin-muted">
          Official API connectors (Google CSE, etc.) — coming soon placeholder in admin settings.
        </p>
        <button type="button" onClick={() => void save()} className="kuy-btn-primary mt-4 rounded-lg px-4 py-2 text-sm">
          Save
        </button>
      </KuyRadarCard>
      <KuyRadarCard className="kuy-danger-zone p-5">
        <h3 className="font-semibold text-red-800">PDPA delete path</h3>
        <p className="mt-1 text-sm text-admin-muted">ลบ leads, competitors, content, insights และธุรกิจนี้</p>
        <button type="button" onClick={() => void wipe()} className="mt-3 rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700">
          Delete business data
        </button>
      </KuyRadarCard>
    </div>
  );
}
