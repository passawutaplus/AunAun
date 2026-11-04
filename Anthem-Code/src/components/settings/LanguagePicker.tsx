import { PreferenceSegmentRow, type SegmentOption } from "@/components/ui/IconSegmentPill";
import { useAppLocale, type AppLocale } from "@/lib/i18n/locale";

const mark = (text: string) => <span className="text-[11px] font-medium leading-none">{text}</span>;

const OPTIONS: SegmentOption<AppLocale>[] = [
  { value: "th", icon: mark("TH"), label: "ไทย" },
  { value: "en", icon: mark("EN"), label: "English" },
  { value: "zh", icon: mark("中"), label: "中文" },
];

type Props = {
  label?: string;
  className?: string;
};

/** Interface language (ไทย / English / 中文), shown above Theme in the profile menu. */
export function LanguagePicker({ label = "Language", className }: Props) {
  const { locale, setLocale } = useAppLocale();
  return (
    <PreferenceSegmentRow label={label} value={locale} options={OPTIONS} onChange={setLocale} className={className} />
  );
}
