import { Link } from "react-router-dom";
import { Scale } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  ATTESTATION_ANCHOR_ID,
  ATTESTATION_BULLETS,
  ATTESTATION_LEGAL_NOTE,
  ATTESTATION_SHORT,
  ATTESTATION_TITLE,
} from "@/lib/legalAttestation";
import { cn } from "@/lib/utils";

interface Props {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  required?: boolean;
}

const OriginalWorkAttestation = ({ checked, onCheckedChange, required = true }: Props) => (
  <div
    className={cn(
      "rounded-xl border-2 p-3 space-y-2",
      checked ? "border-primary/40 bg-primary/5" : "border-border/80 bg-muted/30",
    )}
  >
    <div className="flex items-start gap-3">
      <Checkbox
        id="rights-attest"
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="mt-1 shrink-0"
      />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-primary shrink-0" aria-hidden />
          <Label htmlFor="rights-attest" className="text-sm font-semibold text-foreground cursor-pointer leading-snug">
            {ATTESTATION_TITLE}
            {required && <span className="text-destructive"> *</span>}
          </Label>
        </div>
        <p className="text-base text-muted-foreground leading-relaxed">{ATTESTATION_SHORT}</p>
        <ul className="text-base text-foreground list-disc pl-4 space-y-0.5">
          {ATTESTATION_BULLETS.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{ATTESTATION_LEGAL_NOTE}</p>
        <p className="text-[11px] text-muted-foreground">
          ข้าพเจ้ายอมรับ{" "}
          <Link to="/legal/terms" target="_blank" className="text-primary hover:underline">
            ข้อกำหนดการใช้งาน
          </Link>
          {" "}และ{" "}
          <Link to={`/legal/ip#${ATTESTATION_ANCHOR_ID}`} target="_blank" className="text-primary hover:underline">
            นโยบายลิขสิทธิ์
          </Link>
          {" "}
          <span className="text-primary">·</span>
          {" "}
          <Link to={`/legal/ip#${ATTESTATION_ANCHOR_ID}`} target="_blank" className="text-primary hover:underline">
            อ่านเพิ่มเติม
          </Link>
        </p>
      </div>
    </div>
  </div>
);

export default OriginalWorkAttestation;
