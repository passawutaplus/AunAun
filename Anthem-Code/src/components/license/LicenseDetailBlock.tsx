import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getLicenseMeta } from "@/lib/licenses";
import { LicenseBadgeInline } from "@/components/license/LicenseBadge";
import { LicensePermissionSummary } from "@/components/license/LicensePermissionSummary";
import AiDisclosureBadge from "@/components/license/AiDisclosureBadge";
import { AI_USE_LEVEL_META, parseAiUseLevel } from "@/lib/aiDisclosure";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { isProjectKey, useProjectT } from "@/lib/i18n/project";

interface Props {
  licenseType?: string | null;
  licenseNote?: string | null;
  copyrightHolder?: string | null;
  ownerName?: string;
  hasThirdPartyAssets?: boolean;
  thirdPartyNote?: string | null;
  aiAssisted?: boolean;
  aiDisclosureNote?: string | null;
  allowHire?: boolean;
  onHire?: () => void;
  /** Render inside project header card (no extra glass panel). */
  embedded?: boolean;
  /** Plain text row ("สงวนสิทธิ์ทั้งหมด · © holder" + chevron) for an icon-labelled details list. */
  bare?: boolean;
}

const LicenseDetailBlock = ({
  licenseType,
  licenseNote,
  copyrightHolder,
  ownerName,
  hasThirdPartyAssets,
  thirdPartyNote,
  aiAssisted,
  aiDisclosureNote,
  allowHire,
  onHire,
  embedded = false,
  bare = false,
}: Props) => {
  const [open, setOpen] = useState(false);
  const { t } = useProjectT();
  const meta = getLicenseMeta(licenseType);
  const holder = copyrightHolder?.trim() || ownerName || t("ownerOfWork");
  const aiLevel = parseAiUseLevel(aiDisclosureNote, !!aiAssisted);
  const licShortKey = `lic.${meta.id}.short`;
  const licDetailKey = `lic.${meta.id}.detail`;
  const licShort = isProjectKey(licShortKey) ? t(licShortKey) : meta.shortLabel;
  const licDetail = isProjectKey(licDetailKey) ? t(licDetailKey) : meta.detailParagraph;
  const aiHintKey = aiLevel ? `aiHint.${aiLevel}` : "";
  const aiHint = aiLevel ? (isProjectKey(aiHintKey) ? t(aiHintKey) : AI_USE_LEVEL_META[aiLevel].hint) : "";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          bare ? "" : embedded ? "border-t border-border/50 pt-1" : "rounded-2xl glass-panel overflow-hidden",
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full flex items-center gap-2 text-left hover:bg-muted/30 transition-colors",
              bare ? "py-1 text-sm text-foreground" : embedded ? "py-3" : "px-4 py-3",
            )}
            aria-label={open ? t("licenseCollapse") : t("licenseExpand")}
          >
            {bare ? (
              <span className="min-w-0">
                {licShort} · © {holder}
              </span>
            ) : null}
            <span className="flex items-center gap-1.5 shrink-0">
              {bare ? null : <LicenseBadgeInline licenseType={licenseType} />}
              {aiLevel ? <AiDisclosureBadge level={aiLevel} tone="inline" interactive={false} /> : null}
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform shrink-0",
                  open && "rotate-180",
                )}
              />
            </span>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className={cn("space-y-4", bare ? "pb-1 pt-3" : "px-5 pb-5 border-t border-border/50 pt-4")}>
            <h3 className={cn("text-sm font-medium text-foreground", bare && "sr-only")}>{t("license")}</h3>
            <p className={cn("leading-relaxed", bare ? "text-sm text-muted-foreground" : "text-base text-foreground")}>
              {licenseType === "custom" && licenseNote?.trim() ? licenseNote.trim() : licDetail}
            </p>

            <LicensePermissionSummary licenseType={licenseType} holder={holder} showLearnMore={false} />

            {hasThirdPartyAssets && thirdPartyNote?.trim() && (
              <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2">
                {t("thirdParty", { note: thirdPartyNote.trim() })}
              </p>
            )}

            {aiLevel ? (
              <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2">
                {t("aiUsed", { hint: aiHint })}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              {(meta.allowsCommercial || meta.id === "commercial_license") && (allowHire ?? true) && onHire && (
                <Button size="sm" className="rounded-full" onClick={onHire}>
                  {t("contactHire")}
                </Button>
              )}
              <Link to="/legal/ip" className="text-xs text-primary hover:underline">
                {t("learnCopyright")}
              </Link>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default LicenseDetailBlock;
