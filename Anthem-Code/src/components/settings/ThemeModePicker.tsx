import { Monitor, Moon, Sun } from "lucide-react";
import { useThemeFade, type ThemePreference } from "@/hooks/useThemeFade";
import { PreferenceSegmentRow, type SegmentOption } from "@/components/ui/IconSegmentPill";

const OPTIONS: SegmentOption<ThemePreference>[] = [
  { value: "light", icon: <Sun className="w-3.5 h-3.5" />, label: "สว่าง" },
  { value: "dark", icon: <Moon className="w-3.5 h-3.5" />, label: "มืด" },
  { value: "system", icon: <Monitor className="w-3.5 h-3.5" />, label: "ตามระบบ" },
];

type Props = {
  label?: string;
  className?: string;
  disabled?: boolean;
};

export function ThemeModePicker({ label = "Theme", className, disabled }: Props) {
  const { theme, setThemeWithFade, mounted } = useThemeFade();

  return (
    <PreferenceSegmentRow
      label={label}
      value={theme}
      options={OPTIONS}
      onChange={setThemeWithFade}
      disabled={disabled || !mounted}
      className={className}
    />
  );
}
