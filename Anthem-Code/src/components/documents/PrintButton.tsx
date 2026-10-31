import { useState, type RefObject } from "react";
import { Printer } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  documentFileStem,
  printDocumentElement,
} from "@/lib/documents/printDocument";

type Props = {
  /** Container holding the `.doc-paper` element to print. */
  targetRef: RefObject<HTMLElement>;
  docNumber?: string | null;
  title?: string | null;
  label?: string;
} & Pick<ButtonProps, "size" | "variant" | "className">;

/** "ดาวน์โหลด PDF / พิมพ์" for any document paper rendered inside `targetRef`. */
export function PrintButton({
  targetRef,
  docNumber,
  title,
  label = "PDF / พิมพ์",
  size = "sm",
  variant = "outline",
  className,
}: Props) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className}
      disabled={busy}
      onClick={async () => {
        const root = targetRef.current;
        const el = root?.matches(".doc-paper")
          ? root
          : root?.querySelector<HTMLElement>(".doc-paper");
        if (!el) return;
        setBusy(true);
        try {
          await printDocumentElement(el, documentFileStem(docNumber, title));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Printer className="mr-1.5 h-4 w-4" aria-hidden />
      {busy ? "กำลังเตรียม…" : label}
    </Button>
  );
}
