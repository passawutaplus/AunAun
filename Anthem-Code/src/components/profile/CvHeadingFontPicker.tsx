import { CV_HEADING_FONTS, type CvHeadingFont } from "@/lib/profileCv";
import { useAboutEditLocale } from "@/components/profile/AboutEditLocale";
import { cn } from "@/lib/utils";

const SAMPLE_FAMILY: Record<CvHeadingFont, string> = {
  standard: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  ibm: '"IBM Plex Sans", sans-serif',
  agrandir: '"Agrandir Wide", sans-serif',
};
const SAMPLE_WEIGHT: Record<CvHeadingFont, number> = { standard: 600, ibm: 600, agrandir: 400 };

type Props = {
  value: CvHeadingFont;
  onChange: (next: CvHeadingFont) => void;
};

export default function CvHeadingFontPicker({ value, onChange }: Props) {
  const { t } = useAboutEditLocale();
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3" role="radiogroup" aria-label={t.headingFontTitle}>
      {CV_HEADING_FONTS.map((id) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(id)}
            className={cn(
              "flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              active ? "border-foreground" : "border-border hover:border-foreground/60",
            )}
          >
            <span
              className="block truncate text-lg leading-tight text-foreground"
              style={{ fontFamily: SAMPLE_FAMILY[id], fontWeight: SAMPLE_WEIGHT[id] }}
              aria-hidden
            >
              Experience
            </span>
            <span className="block text-[11px] leading-snug text-muted-foreground">{t.headingFontNames[id]}</span>
          </button>
        );
      })}
    </div>
  );
}
