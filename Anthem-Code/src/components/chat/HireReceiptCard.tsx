import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Loader2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DocumentPaper } from "@/components/documents/DocumentPaper";
import {
  ChatCardShell,
  ChatCardOrderMenu,
  ChatCardStatus,
  chatCardAccent,
} from "@/components/chat/ChatCardShell";
import { formatOfferAmount } from "@/lib/chatOffer";
import type { HireReceiptChatPayload } from "@/lib/hireReceiptChat";
import { docKindLabelTh } from "@/lib/documents/numbering";
import type { BusinessDocument } from "@/lib/documents/documentPayload";
import { sharedDb } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Props = {
  payload: HireReceiptChatPayload;
  onOpenOrderDetail?: (orderId?: string | null) => void;
};

const METHOD_LABEL: Record<string, string> = {
  promptpay: "พร้อมเพย์",
  card: "บัตร",
  bank_transfer: "โอนธนาคาร",
};

/** Deposit / payment receipt card posted after hire checkout. */
export default function HireReceiptCard({ payload, onOpenOrderDetail }: Props) {
  const [open, setOpen] = useState(false);
  const paidLabel = formatOfferAmount(payload.paidAmountThb);
  const title = payload.isDeposit ? "ใบเสร็จมัดจำ" : "ใบเสร็จรับเงิน";
  const methodLabel = payload.paymentMethod
    ? METHOD_LABEL[payload.paymentMethod] || payload.paymentMethod
    : null;

  const { data: docRow, isFetching } = useQuery({
    queryKey: ["hire-document-by-id", payload.documentId],
    enabled: open && !!payload.documentId,
    queryFn: async () => {
      const { data, error } = await sharedDb
        .from("hire_documents" as never)
        .select("id, kind, doc_number, snapshot, file_url")
        .eq("id", payload.documentId!)
        .maybeSingle();
      if (error) throw error;
      return data as {
        id: string;
        kind: "receipt" | "platform_fee_receipt" | "quotation" | "invoice" | "wht_cert";
        doc_number: string;
        snapshot: BusinessDocument;
        file_url: string | null;
      } | null;
    },
  });

  return (
    <>
      <ChatCardShell
        tone="neutral"
        icon={Receipt}
        title={title}
        meta={payload.docNumber || undefined}
        action={
          onOpenOrderDetail ? (
            <ChatCardOrderMenu
              onOpenOrderDetail={() => onOpenOrderDetail(payload.orderId)}
            />
          ) : undefined
        }
        footer={
          payload.documentId || onOpenOrderDetail ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full rounded-full"
              onClick={() => {
                if (payload.documentId) setOpen(true);
                else onOpenOrderDetail?.(payload.orderId);
              }}
            >
              <FileText className="w-3.5 h-3.5 mr-1" />
              ดูใบเสร็จ
            </Button>
          ) : (
            <ChatCardStatus>ออกใบเสร็จแล้ว</ChatCardStatus>
          )
        }
      >
        <div>
          <p className="text-sm font-semibold leading-snug">«{payload.offerTitle}»</p>
          <p className="text-xs mt-0.5 text-muted-foreground">
            {payload.isDeposit
              ? `มัดจำ${payload.depositPercent ? ` ${payload.depositPercent}%` : ""} · มูลค่างาน ${formatOfferAmount(payload.offerAmountThb)}`
              : `มูลค่างาน ${formatOfferAmount(payload.offerAmountThb)}`}
          </p>
        </div>
        <div className="rounded-xl px-3 py-2 bg-muted/60">
          <p className="text-[10px] font-medium text-muted-foreground">
            {payload.isDeposit ? "ยอดมัดจำที่รับแล้ว" : "ยอดที่รับแล้ว"}
          </p>
          <p className={cn("text-lg font-semibold tabular-nums", chatCardAccent("success"))}>
            {paidLabel}
          </p>
          {methodLabel ? (
            <p className="text-[10px] text-muted-foreground mt-0.5">ชำระผ่าน {methodLabel}</p>
          ) : null}
        </div>
      </ChatCardShell>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[92vh] overflow-y-auto p-0">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle className="text-base">
              {docRow ? docKindLabelTh(docRow.kind) : title}
            </DialogTitle>
            <DialogDescription>
              {docRow?.doc_number || payload.docNumber || "ใบเสร็จรับเงิน"}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            {isFetching && !docRow ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังโหลดใบเสร็จ…
              </div>
            ) : docRow?.snapshot ? (
              <DocumentPaper doc={docRow.snapshot} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                ยังโหลดใบเสร็จไม่ได้ — ลองเปิดจากรายละเอียดออเดอร์
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
