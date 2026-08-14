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
}: Props) => {
  const [open, setOpen] = useState(false);
  const meta = getLicenseMeta(licenseType);
  const holder = copyrightHolder?.trim() || ownerName || "เจ้าของผลงาน";
  const aiLevel = parseAiUseLevel(aiDisclosureNote, !!aiAssisted);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          embedded ? "border-t border-border/50 pt-1" : "rounded-2xl glass-panel overflow-hidden",
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full flex items-center justify-between gap-2 text-left hover:bg-muted/30 transition-colors",
              embedded ? "py-3" : "px-4 py-3",
            )}
            aria-label={open ? "ย่อรายละเอียดสิทธิ์การใช้งาน" : "ดูรายละเอียดสิทธิ์การใช้งาน"}
          >
            <span className="text-sm text-muted-foreground shrink-0 whitespace-nowrap">
              สิทธิ์ของผลงานนี้
            </span>
            <span className="flex items-center gap-1.5 shrink-0 ml-auto">
              {aiLevel ? <AiDisclosureBadge level={aiLevel} tone="inline" /> : null}
              <LicenseBadgeInline licenseType={licenseType} />
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
          <div className="px-5 pb-5 space-y-4 border-t border-border/50 pt-4">
            <h3 className="text-sm font-medium text-foreground">สิทธิ์การใช้งาน</h3>
            <p className="text-base text-foreground leading-relaxed">
              {licenseType === "custom" && licenseNote?.trim() ? licenseNote.trim() : meta.detailParagraph}
            </p>

            <LicensePermissionSummary licenseType={licenseType} holder={holder} showLearnMore={false} />

            {hasThirdPartyAssets && thirdPartyNote?.trim() && (
              <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2">
                มี asset จากที่อื่น: {thirdPartyNote.trim()}
              </p>
            )}

            {aiLevel ? (
              <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2">
                ใช้ AI ช่วยทำผลงานนี้ — {AI_USE_LEVEL_META[aiLevel].hint}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              {(meta.allowsCommercial || meta.id === "commercial_license") && (allowHire ?? true) && onHire && (
                <Button size="sm" className="rounded-full" onClick={onHire}>
                  อยากใช้งานนี้? ติดต่อจ้าง
                </Button>
              )}
              <Link to="/legal/ip" className="text-xs text-primary hover:underline">
                เรียนรู้เรื่องลิขสิทธิ์
              </Link>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default LicenseDetailBlock;
