import { useState } from "react";
import { Receipt, ScrollText, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatCardShell, chatCardAccent } from "@/components/chat/ChatCardShell";
import {
  StatusPill,
  StudioDocViewDialog,
} from "@/components/documents/StudioDocDialogs";
import { useAuth } from "@/hooks/useAuth";
import { useStudioDoc } from "@/hooks/useStudioDocuments";
import { formatOfferAmount, formatOfferDateShort } from "@/lib/chatOffer";
import {
  STUDIO_DOC_KIND_LABEL,
  docDisplayStatus,
  type StudioDocChatCard,
} from "@/lib/documents/studioDocuments";
import { cn } from "@/lib/utils";

const ICON = {
  quotation: FileText,
  invoice: ScrollText,
  receipt: Receipt,
} as const;

/** Chat card for an invoice / receipt issued from the job panel. Status is read live. */
export function StudioDocCard({
  card,
  mine,
}: {
  card: StudioDocChatCard;
  mine: boolean;
}) {
  const { user } = useAuth();
  const { data: doc } = useStudioDoc(card.id);
  const [open, setOpen] = useState(false);
  const status = doc ? docDisplayStatus(doc) : null;
  const isReceipt = card.kind === "receipt";
  const viewerIsOwner = doc ? doc.owner_id === user?.id : mine;
  const clientCanReport =
    !!doc &&
    !viewerIsOwner &&
    doc.kind === "invoice" &&
    doc.status === "sent" &&
    !doc.client_marked_paid_at;

  return (
    <>
      <ChatCardShell
        tone={isReceipt ? "success" : "hire"}
        icon={ICON[card.kind]}
        title={
          card.installmentNo && (card.installmentTotal ?? 1) > 1
            ? `${STUDIO_DOC_KIND_LABEL[card.kind]} · งวด ${card.installmentNo}/${card.installmentTotal}`
            : STUDIO_DOC_KIND_LABEL[card.kind]
        }
        meta={card.number}
        footer={
          <Button
            type="button"
            size="sm"
            variant={clientCanReport ? "default" : "outline"}
            className="w-full rounded-full"
            onClick={() => setOpen(true)}
          >
            {clientCanReport
              ? "ดูและแจ้งว่าโอนแล้ว"
              : `ดู${STUDIO_DOC_KIND_LABEL[card.kind]} / PDF`}
          </Button>
        }
      >
        <div>
          <p className="text-sm font-semibold leading-snug">{card.title}</p>
          {card.installmentLabel ? (
            <p className="text-xs text-muted-foreground">
              {card.installmentLabel}
            </p>
          ) : null}
          <p
            className={cn(
              "mt-0.5 text-xl font-semibold tabular-nums",
              chatCardAccent(isReceipt ? "success" : "hire"),
            )}
          >
            {formatOfferAmount(card.net)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status ? <StatusPill status={status} /> : null}
          {!isReceipt && card.dueDate ? (
            <span className="text-[11px] text-muted-foreground">
              ครบกำหนด {formatOfferDateShort(card.dueDate)}
            </span>
          ) : null}
          {isReceipt ? (
            <span className="text-[11px] text-muted-foreground">
              ผู้รับงานยืนยันว่าได้รับเงินแล้ว
            </span>
          ) : null}
        </div>
      </ChatCardShell>
      <StudioDocViewDialog
        doc={doc ?? null}
        open={open && !!doc}
        onOpenChange={setOpen}
        viewerIsOwner={viewerIsOwner}
      />
    </>
  );
}
