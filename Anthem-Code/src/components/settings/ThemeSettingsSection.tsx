import { Palette } from "lucide-react";
import { ThemeModePicker } from "@/components/settings/ThemeModePicker";
import { FeedGridDensityPicker } from "@/components/feed/FeedGridDensityPicker";
import { useThemeFade } from "@/hooks/useThemeFade";
import { useNarrowViewport } from "@/hooks/useNarrowViewport";

const THEME_HINT: Record<string, string> = {
  light: "ธีมสว่าง",
  dark: "ธีมมืด — ลดแสงจอ",
  system: "ตามการตั้งค่าระบบ",
};

export function ThemeSettingsSection({ embedded = false }: { embedded?: boolean }) {
  const { theme, mounted } = useThemeFade();
  const narrow = useNarrowViewport();

  const content = (
    <>
      <div className="flex items-center gap-2">
        <Palette className="w-5 h-5 text-primary" />
        <h3 className={embedded ? "text-sm font-medium text-foreground" : "font-semibold text-foreground"}>
          การแสดงผล
        </h3>
      </div>

      <div className="space-y-3">
        <ThemeModePicker label="โหมดแสดงผล" disabled={!mounted} />
        <p className="text-xs text-muted-foreground -mt-1">
          {mounted ? THEME_HINT[theme] ?? "" : "กำลังโหลด…"}
        </p>
        <FeedGridDensityPicker label="ขนาดฟีดผลงาน" />
        <p className="text-xs text-muted-foreground -mt-1">
          {narrow ? "1 คอลัมน์ · 2 คอลัมน์" : "ใหญ่ 3 คอลัมน์ · กลาง 5 · เล็ก 7"}
        </p>
      </div>
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{content}</div>;
  }

  return (
    <section className="rounded-2xl glass-panel p-6 space-y-4">
      {content}
    </section>
  );
}
