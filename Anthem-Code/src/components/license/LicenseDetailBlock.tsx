import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getLicenseMeta } from "@/lib/licenses";
import { LicenseBadgeInline } from "@/components/license/LicenseBadge";
import { Check, X, Minus, ChevronDown } from "lucide-react";
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
  clientPermissionConfirmed?: boolean;
  allowHire?: boolean;
  onHire?: () => void;
  /** Render inside project header card (no extra glass panel). */
  embedded?: boolean;
}

const BoolRow = ({ label, value }: { label: string; value: boolean | "partial" | "optional" }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    {value === true ? (
      <span className="flex items-center gap-1 text-emerald-600"><Check className="w-3.5 h-3.5" /> ได้</span>
    ) : value === "partial" ? (
      <span className="flex items-center gap-1 text-amber-600"><Minus className="w-3.5 h-3.5" /> ติดต่อเจ้าของ</span>
    ) : value === "optional" ? (
      <span className="flex items-center gap-1 text-muted-foreground"><Minus className="w-3.5 h-3.5" /> ไม่บังคับ</span>
    ) : (
      <span className="flex items-center gap-1 text-muted-foreground"><X className="w-3.5 h-3.5" /> ไม่ได้</span>
    )}
  </div>
);

const LicenseDetailBlock = ({
  licenseType,
  licenseNote,
  copyrightHolder,
  ownerName,
  hasThirdPartyAssets,
  thirdPartyNote,
  aiAssisted,
  aiDisclosureNote,
  clientPermissionConfirmed,
  allowHire,
  onHire,
  embedded = false,
}: Props) => {
  const [open, setOpen] = useState(false);
  const meta = getLicenseMeta(licenseType);
  const holder = copyrightHolder?.trim() || ownerName || "เจ้าของผลงาน";
  const commercialValue = meta.allowsCommercial
    ? true
    : meta.id === "commercial_license"
      ? "partial"
      : false;
  const attributionValue = meta.requiresAttribution
    ? true
    : meta.id === "free_use"
      ? "optional"
      : false;

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
            <LicenseBadgeInline licenseType={licenseType} />
            <ChevronDown
              className={cn(
                "w-4 h-4 text-muted-foreground transition-transform shrink-0",
                open && "rotate-180",
              )}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-5 pb-5 space-y-4 border-t border-border/50 pt-4">
            <h3 className="text-sm font-medium text-foreground">สิทธิ์การใช้งาน</h3>
            <p className="text-base text-foreground leading-relaxed">
              {licenseType === "custom" && licenseNote?.trim() ? licenseNote.trim() : meta.detailParagraph}
            </p>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">เจ้าของลิขสิทธิ์: <span className="text-foreground">{holder}</span></p>
              <BoolRow label="นำไปใช้ซ้ำ" value={meta.allowsReuse} />
              <BoolRow label="ใช้เชิงพาณิชย์" value={commercialValue} />
              <BoolRow label="ต้องอ้างอิงเครดิต" value={attributionValue} />
            </div>

            {hasThirdPartyAssets && thirdPartyNote?.trim() && (
              <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2">
                มี asset จากที่อื่น: {thirdPartyNote.trim()}
              </p>
            )}

            {clientPermissionConfirmed ? (
              <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2">
                งานลูกค้า — ได้รับอนุญาตเผยแพร่แล้ว
              </p>
            ) : null}

            {aiAssisted ? (
              <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2">
                ใช้ AI ช่วยทำผลงานนี้
                {aiDisclosureNote?.trim() ? ` — ${aiDisclosureNote.trim()}` : ""}
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
