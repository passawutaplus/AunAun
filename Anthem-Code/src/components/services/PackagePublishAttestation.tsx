import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  PACKAGE_ATTESTATION_BULLETS,
  PACKAGE_ATTESTATION_LEGAL_NOTE,
  PACKAGE_ATTESTATION_SHORT,
  PACKAGE_POLICY_ATTESTATION_ANCHOR,
  PACKAGE_POLICY_PATH,
} from "@/lib/packageLegalAttestation";
import { cn } from "@/lib/utils";

type Props = {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  required?: boolean;
};

/** Checkbox + expandable package publish attestation (PDPA / terms / IP). */
export default function PackagePublishAttestation({
  checked,
  onCheckedChange,
  required = true,
}: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        checked ? "border-primary/40 bg-primary/5" : "border-border/80 bg-muted/20",
      )}
    >
      <div className="flex items-start gap-2.5">
        <Checkbox
          id="package-rights-attest"
          checked={checked}
          onCheckedChange={(v) => onCheckedChange(v === true)}
          className="mt-0.5 shrink-0"
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label
            htmlFor="package-rights-attest"
            className="text-sm text-foreground cursor-pointer leading-snug"
          >
            {PACKAGE_ATTESTATION_SHORT}
            {required ? <span className="text-destructive"> *</span> : null}
          </Label>
          <p className="text-[11px] text-muted-foreground leading-snug">
            ยอมรับ{" "}
            <Link to="/legal/terms" target="_blank" className="text-primary hover:underline">
              ข้อกำหนดการใช้งาน
            </Link>
            {", "}
            <Link to="/legal/privacy" target="_blank" className="text-primary hover:underline">
              นโยบายความเป็นส่วนตัว (PDPA)
            </Link>
            {" "}และ{" "}
            <Link
              to={`${PACKAGE_POLICY_PATH}#${PACKAGE_POLICY_ATTESTATION_ANCHOR}`}
              target="_blank"
              className="text-primary hover:underline"
            >
              นโยบายแพ็กเกจ
            </Link>
          </p>
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-[11px] text-primary hover:underline">
              <ChevronDown
                className={cn("w-3 h-3 transition-transform", detailsOpen && "rotate-180")}
                aria-hidden
              />
              รายละเอียดคำแถลง
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=closed]:hidden pt-2 space-y-1.5">
              <ul className="text-[11px] text-muted-foreground list-disc pl-4 space-y-0.5">
                {PACKAGE_ATTESTATION_BULLETS.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {PACKAGE_ATTESTATION_LEGAL_NOTE}
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}
