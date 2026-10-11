import { CV_TEMPLATES, type CvTemplate } from "@/lib/profileCv";
import { useAboutEditLocale } from "@/components/profile/AboutEditLocale";
import { cn } from "@/lib/utils";

const INK = "currentColor";
const PAPER: Record<CvTemplate, string> = { editorial: "#f3f2ec", index: "#e9e8e2", grid: "#dcdedf" };

/** Tiny wireframe of each arrangement (viewBox mirrors A4: 100 × 141). */
function Wireframe({ template }: { template: CvTemplate }) {
  const bar = (x: number, y: number, w: number, h = 2.4, o = 0.55) => (
    <rect key={`${x}-${y}-${w}`} x={x} y={y} width={w} height={h} rx={0.6} fill={INK} opacity={o} />
  );
  return (
    <svg viewBox="0 0 100 141" className="h-auto w-full text-neutral-800" aria-hidden>
      <rect width="100" height="141" fill={PAPER[template]} />
      {template === "editorial" ? (
        <>
          {bar(8, 9, 30, 2, 0.7)}
          {bar(68, 9, 24, 2, 0.7)}
          <rect x="8" y="13" width="84" height="1" fill={INK} />
          <rect x="8" y="22" width="38" height="46" fill={INK} opacity="0.18" />
          {bar(58, 30, 34, 6, 0.85)}
          {bar(64, 40, 28, 6, 0.85)}
          {bar(52, 56, 40, 1.8)}
          {bar(58, 61, 34, 1.8)}
          <rect x="8" y="76" width="84" height="0.8" fill={INK} />
          <rect x="50" y="76" width="0.8" height="50" fill={INK} />
          {[84, 90, 96, 102, 108, 114].map((y) => bar(8, y, 30, 1.8, 0.45))}
          {[84, 92, 98, 106, 112].map((y) => bar(56, y, 36, 1.8, 0.45))}
          <rect x="8" y="130" width="84" height="0.8" fill={INK} />
        </>
      ) : null}
      {template === "index" ? (
        <>
          <rect x="8" y="10" width="30" height="38" fill={INK} opacity="0.18" stroke={INK} strokeWidth="0.6" />
          {bar(8, 54, 22, 4, 0.8)}
          {[62, 67, 72].map((y) => bar(8, y, 26, 1.8, 0.45))}
          {bar(8, 100, 30, 6, 0.9)}
          {bar(8, 109, 24, 6, 0.9)}
          {[119, 124, 129].map((y) => bar(8, y, 30, 1.8, 0.45))}
          <rect x="44" y="9" width="0.8" height="123" fill={INK} />
          <circle cx="44.4" cy="9" r="1.6" fill={INK} />
          <circle cx="44.4" cy="132" r="1.6" fill={INK} />
          {bar(52, 12, 30, 5, 0.85)}
          {[22, 27, 32, 37].map((y) => bar(52, y, 38, 1.8, 0.45))}
          {bar(52, 50, 26, 5, 0.85)}
          {[60, 65].map((y) => bar(52, y, 34, 1.8, 0.45))}
          {bar(52, 78, 18, 5, 0.85)}
          {[88, 93, 98, 103].map((y) => bar(52, y, 40, 1.8, 0.45))}
        </>
      ) : null}
      {template === "grid" ? (
        <>
          {bar(8, 10, 20, 3.4, 0.5)}
          {bar(8, 17, 42, 9, 0.9)}
          {[12, 18, 24].map((y) => bar(66, y, 26, 1.8, 0.45))}
          {bar(8, 36, 34, 2.6, 0.8)}
          {[42, 47].map((y) => bar(8, y, 56, 1.8, 0.45))}
          {[58, 86, 108].map((y) => (
            <g key={y}>
              {bar(8, y, 30, 2.6, 0.8)}
              <rect x="8" y={y + 5} width="56" height="0.8" fill={INK} />
              {[y + 10, y + 15].map((yy) => bar(8, yy, 50, 1.8, 0.45))}
            </g>
          ))}
          <rect x="70" y="36" width="22" height="30" fill={INK} opacity="0.18" />
          {bar(70, 74, 16, 2.4, 0.8)}
          <rect x="70" y="79" width="22" height="0.8" fill={INK} />
          {[84, 89, 94].map((y) => bar(70, y, 18, 1.8, 0.45))}
          {bar(70, 104, 16, 2.4, 0.8)}
          <rect x="70" y="109" width="22" height="0.8" fill={INK} />
          {[114, 119].map((y) => bar(70, y, 18, 1.8, 0.45))}
        </>
      ) : null}
    </svg>
  );
}

type Props = {
  value: CvTemplate;
  onChange: (next: CvTemplate) => void;
};

export default function CvTemplatePicker({ value, onChange }: Props) {
  const { t } = useAboutEditLocale();
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3" role="radiogroup" aria-label={t.layoutTitle}>
      {CV_TEMPLATES.map((id) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(id)}
            className={cn(
              "group flex flex-col gap-2 rounded-xl border p-2 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              active ? "border-foreground" : "border-border hover:border-foreground/60",
            )}
          >
            <span
              className={cn(
                "block overflow-hidden rounded-md ring-1 ring-black/10",
                active ? "opacity-100" : "opacity-80 group-hover:opacity-100",
              )}
            >
              <Wireframe template={id} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-medium text-foreground">{t.templateNames[id]}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                {t.templateNotes[id]}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
