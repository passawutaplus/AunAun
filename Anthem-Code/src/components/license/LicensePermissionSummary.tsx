import { Link } from "react-router-dom";
import { Check, Minus, X } from "lucide-react";
import {
  getLicenseMeta,
  licenseAttributionDisplay,
  licenseCommercialDisplay,
  type LicenseFlagDisplay,
} from "@/lib/licenses";
import { useProjectT } from "@/lib/i18n/project";

export function LicenseBoolRow({
  label,
  value,
}: {
  label: string;
  value: LicenseFlagDisplay;
}) {
  const { t } = useProjectT();
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {value === true ? (
        <span className="flex items-center gap-1 text-emerald-600">
          <Check className="h-3.5 w-3.5" aria-hidden /> {t("permYes")}
        </span>
      ) : value === "partial" ? (
        <span className="flex items-center gap-1 text-warning">
          <Minus className="h-3.5 w-3.5" aria-hidden /> {t("permContact")}
        </span>
      ) : value === "optional" ? (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Minus className="h-3.5 w-3.5" aria-hidden /> {t("permOptional")}
        </span>
      ) : (
        <span className="flex items-center gap-1 text-muted-foreground">
          <X className="h-3.5 w-3.5" aria-hidden /> {t("permNo")}
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
  const { t } = useProjectT();

  return (
    <div className="space-y-2">
      {name ? (
        <p className="text-xs text-muted-foreground">
          {t("copyrightHolder")} <span className="text-foreground">{name}</span>
        </p>
      ) : null}
      <LicenseBoolRow label={t("permReuse")} value={meta.allowsReuse} />
      <LicenseBoolRow label={t("permCommercial")} value={licenseCommercialDisplay(meta)} />
      <LicenseBoolRow label={t("permAttribution")} value={licenseAttributionDisplay(meta)} />
      {showLearnMore ? (
        <Link to="/legal/ip" className="inline-block text-xs text-primary hover:underline">
          {t("learnCopyright")}
        </Link>
      ) : null}
    </div>
  );
}
