import { Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  CLIENT_PERMISSION_CONFIRM_HINT,
  CLIENT_PERMISSION_CONFIRM_LABEL,
} from "@/lib/legalProjectPrompts";

interface Props {
  confirmed: boolean;
  onConfirmedChange: (v: boolean) => void;
  copyrightHolder: string;
  onCopyrightHolderChange: (v: string) => void;
}

/** Soft confirm: client work — when on, ask for copyright holder name. */
const ClientPermissionConfirm = ({
  confirmed,
  onConfirmedChange,
  copyrightHolder,
  onCopyrightHolderChange,
}: Props) => (
  <div className="relative z-10 space-y-2 pt-2 border-t border-border/60">
    <div className="flex items-center justify-between gap-3">
      <label
        htmlFor="client-permission-confirm"
        className="min-w-0 flex flex-1 items-start gap-2 cursor-pointer"
      >
        <Building2 className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden />
        <span className="text-sm text-foreground leading-snug">
          {CLIENT_PERMISSION_CONFIRM_LABEL}
          <span className="block text-xs text-muted-foreground font-normal mt-0.5">
            {CLIENT_PERMISSION_CONFIRM_HINT}
          </span>
        </span>
      </label>
      <Switch
        id="client-permission-confirm"
        checked={confirmed}
        onCheckedChange={(v) => {
          onConfirmedChange(v);
          if (!v) onCopyrightHolderChange("");
        }}
        className="shrink-0"
        aria-label={CLIENT_PERMISSION_CONFIRM_LABEL}
      />
    </div>
    {confirmed ? (
      <div className="space-y-1.5 pl-6">
        <Label htmlFor="client-copyright-holder" className="text-xs text-muted-foreground">
          ชื่อเจ้าของลิขสิทธิ์
        </Label>
        <Input
          id="client-copyright-holder"
          value={copyrightHolder}
          onChange={(e) => onCopyrightHolderChange(e.target.value)}
          placeholder="เช่น ชื่อลูกค้า / บริษัท"
          maxLength={120}
        />
      </div>
    ) : null}
  </div>
);

export default ClientPermissionConfirm;
