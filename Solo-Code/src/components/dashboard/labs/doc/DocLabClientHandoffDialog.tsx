import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuotations } from "@/store/quotations";
import { Loader2, Send } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  onConfirm: (quotationId: string | null) => void;
};

export function DocLabClientHandoffDialog({ open, onOpenChange, busy, onConfirm }: Props) {
  const { list, isLoading } = useQuotations();
  const [picked, setPicked] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) setPicked(null);
  }, [open]);

  const recent = React.useMemo(
    () =>
      [...list]
        .filter((q) => q.status !== "rejected" && q.status !== "expired")
        .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
        .slice(0, 8),
    [list],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            ส่งไปชุดส่งลูกค้า
          </DialogTitle>
          <DialogDescription>
            เลือกใบเสนอราคาเพื่อแนบไฟล์ที่ประมวลผลแล้ว — หรือไปหน้ารายการแล้วเลือกเอง
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : recent.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            ยังไม่มีใบเสนอราคา — จะพาไปหน้าสร้างใบใหม่
          </p>
        ) : (
          <ul className="space-y-1.5 max-h-52 overflow-y-auto">
            {recent.map((q) => (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => setPicked(q.id)}
                  className={`w-full text-left rounded-lg border px-3 py-2 text-xs transition-colors ${
                    picked === q.id
                      ? "border-primary bg-primary/10"
                      : "border-border/60 hover:bg-muted/50"
                  }`}
                >
                  <p className="font-medium truncate">{q.projectName || q.number}</p>
                  <p className="text-muted-foreground truncate">
                    {q.clientName || "—"} · {q.number}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onConfirm(null)}
          >
            ไปหน้าใบเสนอราคา
          </Button>
          <Button
            type="button"
            disabled={busy || (recent.length > 0 && !picked)}
            onClick={() => onConfirm(picked)}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "ส่งต่อ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
