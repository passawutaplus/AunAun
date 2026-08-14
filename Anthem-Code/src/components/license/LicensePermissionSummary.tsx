import { Link } from "react-router-dom";
import { Check, Minus, X } from "lucide-react";
import {
  getLicenseMeta,
  licenseAttributionDisplay,
  licenseCommercialDisplay,
  type LicenseFlagDisplay,
} from "@/lib/licenses";

export function LicenseBoolRow({
  label,
  value,
}: {
  label: string;
  value: LicenseFlagDisplay;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {value === true ? (
        <span className="flex items-center gap-1 text-emerald-600">
          <Check className="h-3.5 w-3.5" aria-hidden /> ได้
        </span>
      ) : value === "partial" ? (
        <span className="flex items-center gap-1 text-amber-600">
          <Minus className="h-3.5 w-3.5" aria-hidden /> ติดต่อเจ้าของ
        </span>
      ) : value === "optional" ? (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Minus className="h-3.5 w-3.5" aria-hidden /> ไม่บังคับ
        </span>
      ) : (
        <span className="flex items-center gap-1 text-muted-foreground">
          <X className="h-3.5 w-3.5" aria-hidden /> ไม่ได้
        </span>
      )}
    </div>
  );
}

type Props = {
  licenseType?: string | null;
  holder?: string | null;
  showLearnMore?: boolean;
};

/** What this license allows — updates when the picker value changes. */
export function LicensePermissionSummary({
  licenseType,
  holder,
  showLearnMore = true,
}: Props) {
  const meta = getLicenseMeta(licenseType);
  const name = holder?.trim();

  return (
    <div className="space-y-2">
      {name ? (
        <p className="text-xs text-muted-foreground">
          เจ้าของลิขสิทธิ์: <span className="text-foreground">{name}</span>
        </p>
      ) : null}
      <LicenseBoolRow label="นำไปใช้ซ้ำ" value={meta.allowsReuse} />
      <LicenseBoolRow label="ใช้เชิงพาณิชย์" value={licenseCommercialDisplay(meta)} />
      <LicenseBoolRow label="ต้องอ้างอิงเครดิต" value={licenseAttributionDisplay(meta)} />
      {showLearnMore ? (
        <Link to="/legal/ip" className="inline-block text-xs text-primary hover:underline">
          เรียนรู้เรื่องลิขสิทธิ์
        </Link>
      ) : null}
    </div>
  );
}
