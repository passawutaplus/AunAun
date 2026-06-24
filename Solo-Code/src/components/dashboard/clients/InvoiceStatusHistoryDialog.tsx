import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { History, ArrowRight, Loader2 } from "lucide-react";
import { useInvoiceStatusHistory, STATUS_LABEL } from "@/store/clientInvoices";

export function InvoiceStatusHistoryDialog({
  invoiceId,
  invoiceName,
  open,
  onOpenChange,
}: {
  invoiceId: string | null;
  invoiceName?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { data, isLoading } = useInvoiceStatusHistory(open ? invoiceId : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-primary" /> ประวัติการเปลี่ยนสถานะ
          </DialogTitle>
          {invoiceName && <p className="text-xs text-muted-foreground">{invoiceName}</p>}
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด…
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            ยังไม่มีประวัติการเปลี่ยนสถานะ
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-auto">
            {data.map((h) => {
              const dt = new Date(h.changedAt);
              return (
                <div
                  key={h.id}
                  className="rounded-lg border border-border/60 bg-card p-2.5 text-xs space-y-1"
                >
                  <div className="flex items-center gap-1.5 font-medium">
                    {h.fromStatus ? (
                      <>
                        <span className="text-muted-foreground">{STATUS_LABEL[h.fromStatus]}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </>
                    ) : null}
                    <span className="text-primary">{STATUS_LABEL[h.toStatus]}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground num">
                    {dt.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                  {h.note && <p className="text-[11px] text-muted-foreground italic">"{h.note}"</p>}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
