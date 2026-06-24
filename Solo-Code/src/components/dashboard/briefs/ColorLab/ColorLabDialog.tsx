import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FlaskConical } from "lucide-react";
import { normalizeHex } from "@/lib/colorUtils";
import { ColorLabInline } from "./ColorLabInline";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialHex?: string;
  onApply?: (hex: string) => void;
  applyLabel?: string;
}

export function ColorLabDialog({
  open,
  onOpenChange,
  initialHex = "#FF6B00",
  onApply,
  applyLabel = "+ เพิ่มเข้าบรีฟ",
}: Props) {
  const [hex, setHex] = React.useState<string>(normalizeHex(initialHex) ?? "#FF6B00");

  React.useEffect(() => {
    if (open) setHex(normalizeHex(initialHex) ?? "#FF6B00");
  }, [open, initialHex]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-5 pb-3 pr-12 sm:pr-14 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FlaskConical className="h-5 w-5 text-primary" />
            So1o Color Lab
          </DialogTitle>
          <DialogDescription className="text-xs">
            เลือกสี · ตรวจสอบ Contrast · แปลงรหัสสีครบทุกฟอร์แมต · ก๊อปปี้ในคลิกเดียว
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 pb-5">
          <ColorLabInline
            hex={hex}
            onHexChange={setHex}
            onApply={onApply}
            applyLabel={applyLabel}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
