import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronRight, FileText, Receipt, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sharedDb } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import {
  useConversationStudioDocs,
  useIssueQuotation,
} from "@/hooks/useStudioDocuments";
import {
  IssueInvoiceDialog,
  RecordPaymentDialog,
  StatusPill,
  StudioDocViewDialog,
  formatSatang,
} from "@/components/documents/StudioDocDialogs";
import {
  formatOfferAmount,
  formatOfferDateShort,
  parseChatOffer,
  type ChatOfferPayload,
} from "@/lib/chatOffer";
import {
  INSTALLMENT_STATE_LABEL,
  STUDIO_DOC_KIND_LABEL,
  docDisplayStatus,
  installmentTracks,
  type InstallmentTrack,
  type StudioDocumentRow,
} from "@/lib/documents/studioDocuments";
import { cn } from "@/lib/utils";

const KIND_ICON = {
  quotation: FileText,
  invoice: ScrollText,
  receipt: Receipt,
} as const;

/** Latest in-chat offer (for quotations sent before document tracking existed). */
function useLatestChatOffer(conversationId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["chat-latest-offer", conversationId],
    enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<{
      offer: ChatOfferPayload;
      senderId: string;
    } | null> => {
      const { data, error } = await sharedDb
        .from("messages" as never)
        .select("content, sender_id")
        .eq("conversation_id" as never, conversationId as never)
        .like("content" as never, "%\\_\\_APLUS1\\_OFFER\\_\\_:%" as never)
        .order("created_at" as never, { ascending: false })
        .limit(1);
      if (error) throw error;
      const row = (
        data as { content: string | null; sender_id: string }[] | null
      )?.[0];
      const offer = row ? parseChatOffer(row.content) : null;
      return offer && row ? { offer, senderId: row.sender_id } : null;
    },
  });
}

/** Data wrapper: side panel "งานนี้" for one chat. */
export function ChatJobPanel({ conversationId }: { conversationId: string }) {
  const { user } = useAuth();
  const { data: docs = [], isLoading } =
    useConversationStudioDocs(conversationId);
  const hasQuote = docs.some((d) => d.kind === "quotation");
  const { data: legacy } = useLatestChatOffer(
    conversationId,
    !isLoading && !hasQuote,
  );
  const issueQuotation = useIssueQuotation();

  return (
    <JobPanelView
      docs={docs}
      viewerId={user?.id ?? null}
      loading={isLoading}
      legacyOffer={!hasQuote && legacy ? legacy : null}
      onTrackLegacy={async () => {
        if (!legacy) return;
        try {
          await issueQuotation.mutateAsync({
            offer: legacy.offer,
            conversationId,
            status: "accepted",
          });
          toast.success("เริ่มติดตามงวดแล้ว");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "เริ่มติดตามไม่สำเร็จ");
        }
      }}
      trackingLegacy={issueQuotation.isPending}
    />
  );
}

type ViewProps = {
  docs: StudioDocumentRow[];
  viewerId: string | null;
  loading?: boolean;
  legacyOffer?: { offer: ChatOfferPayload; senderId: string } | null;
  onTrackLegacy?: () => void;
  trackingLegacy?: boolean;
};

/** Presentational panel (also used by /dev preview with fixtures). */
export function JobPanelView({
  docs,
  viewerId,
  loading,
  legacyOffer,
  onTrackLegacy,
  trackingLegacy,
}: ViewProps) {
  const [viewDoc, setViewDoc] = useState<StudioDocumentRow | null>(null);
  const [invoiceFor, setInvoiceFor] = useState<InstallmentTrack | null>(null);
  const [payFor, setPayFor] = useState<InstallmentTrack | null>(null);

  const quotes = docs.filter((d) => d.kind === "quotation");
  const quote =
    [...quotes].reverse().find((q) => q.status === "accepted") ??
    [...quotes].reverse().find((q) => q.status === "sent") ??
    quotes[quotes.length - 1] ??
    null;
  const isOwner = !!quote && quote.owner_id === viewerId;
  const tracks = useMemo(
    () => (quote ? installmentTracks(quote, docs) : []),
    [quote, docs],
  );
  const paidNos = tracks.filter((t) => t.state === "paid").map((t) => t.no);
  const totalNet = tracks.reduce((s, t) => s + t.net, 0);
  const paidNet = tracks
    .filter((t) => t.state === "paid")
    .reduce((s, t) => s + t.net, 0);
  const pct = totalNet > 0 ? Math.round((paidNet / totalNet) * 100) : 0;
  const nextTrack = tracks.find((t) => t.state !== "paid") ?? null;
  const history = [...docs].reverse();

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">กำลังโหลด…</div>;
  }

  return (
    <div className="space-y-4 p-3">
      {!quote ? (
        legacyOffer ? (
          <section className="space-y-2 rounded-2xl border border-border bg-card p-3.5">
            <p className="text-sm font-semibold">{legacyOffer.offer.title}</p>
            <p className="text-xs text-muted-foreground">
              ใบเสนอราคา {legacyOffer.offer.number || ""} ·{" "}
              {formatOfferAmount(legacyOffer.offer.amount)}
            </p>
            {legacyOffer.senderId === viewerId ? (
              <>
                <p className="text-xs text-muted-foreground">
                  ใบนี้ส่งก่อนมีระบบติดตามงวด
                  กดเพื่อเริ่มออกใบแจ้งหนี้และใบเสร็จจากใบนี้
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="h-10 w-full"
                  onClick={onTrackLegacy}
                  disabled={trackingLegacy}
                >
                  เริ่มติดตามงวด
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                รอผู้รับงานเริ่มติดตามการชำระเงิน
              </p>
            )}
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-border p-4 text-center">
            <FileText
              className="mx-auto mb-2 h-6 w-6 text-muted-foreground"
              aria-hidden
            />
            <p className="text-sm font-medium">ยังไม่มีใบเสนอราคา</p>
            <p className="mt-1 text-xs text-muted-foreground">
              ส่งใบเสนอราคาจากแชท แล้วติดตามงวด ใบแจ้งหนี้ และใบเสร็จได้ที่นี่
            </p>
          </section>
        )
      ) : (
        <section className="space-y-3 rounded-2xl border border-border bg-card p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{quote.title}</p>
              <p className="text-xs tabular-nums text-muted-foreground">
                {quote.doc_number} · {formatSatang(quote.net_satang)}
              </p>
            </div>
            <StatusPill status={docDisplayStatus(quote)} />
          </div>

          {tracks.length > 0 &&
          quote.status !== "declined" &&
          quote.status !== "void" ? (
            <>
              <div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-muted-foreground">รับเงินแล้ว</span>
                  <span className="tabular-nums">
                    <span className="font-semibold text-foreground">
                      {formatOfferAmount(paidNet)}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      / {formatOfferAmount(totalNet)}
                    </span>
                  </span>
                </div>
                <div
                  className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="ความคืบหน้าการรับเงิน"
                >
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <ol className="space-y-2">
                {tracks.map((t) => {
                  const st = INSTALLMENT_STATE_LABEL[t.state];
                  const isNext = nextTrack?.no === t.no;
                  return (
                    <li
                      key={t.no}
                      className={cn(
                        "rounded-xl border p-2.5",
                        isNext && t.state !== "paid"
                          ? "border-foreground/30 bg-muted/40"
                          : "border-border",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            งวด {t.no} · {t.installment.label}
                          </p>
                          <p className="text-xs tabular-nums text-muted-foreground">
                            {t.installment.percent}% ·{" "}
                            {formatOfferAmount(t.net)}
                            {t.invoice?.due_date && t.state !== "paid"
                              ? ` · ครบกำหนด ${formatOfferDateShort(t.invoice.due_date)}`
                              : ""}
                          </p>
                        </div>
                        <StatusPill status={st} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {isOwner && t.state === "pending" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-9"
                            onClick={() => setInvoiceFor(t)}
                          >
                            ส่งใบแจ้งหนี้
                          </Button>
                        ) : null}
                        {isOwner && t.state !== "paid" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant={
                              t.state === "client_marked"
                                ? "default"
                                : "outline"
                            }
                            className="h-9"
                            onClick={() => setPayFor(t)}
                          >
                            บันทึกรับเงิน
                          </Button>
                        ) : null}
                        {t.invoice && t.state !== "paid" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-9"
                            onClick={() => setViewDoc(t.invoice)}
                          >
                            {isOwner || t.state === "client_marked"
                              ? "ดูใบแจ้งหนี้"
                              : "ดู / แจ้งโอน"}
                          </Button>
                        ) : null}
                        {t.receipt ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-9"
                            onClick={() => setViewDoc(t.receipt)}
                          >
                            ใบเสร็จ
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </>
          ) : null}
        </section>
      )}

      {history.length > 0 ? (
        <section>
          <p className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">
            เอกสารในแชทนี้
          </p>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {history.map((d) => {
              const Icon = KIND_ICON[d.kind];
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => setViewDoc(d)}
                    className="flex min-h-12 w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/60"
                  >
                    <Icon
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">
                        {STUDIO_DOC_KIND_LABEL[d.kind]}
                        {d.installment_no ? ` งวด ${d.installment_no}` : ""}
                      </span>
                      <span className="block text-xs tabular-nums text-muted-foreground">
                        {d.doc_number} · {formatSatang(d.net_satang)}
                      </span>
                    </span>
                    <StatusPill status={docDisplayStatus(d)} />
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <StudioDocViewDialog
        doc={viewDoc}
        open={!!viewDoc}
        onOpenChange={(o) => !o && setViewDoc(null)}
        viewerIsOwner={!!viewDoc && viewDoc.owner_id === viewerId}
      />
      {quote ? (
        <>
          <IssueInvoiceDialog
            key={`inv-${invoiceFor?.no ?? 0}`}
            quote={quote}
            track={invoiceFor}
            paidNos={paidNos}
            open={!!invoiceFor}
            onOpenChange={(o) => !o && setInvoiceFor(null)}
          />
          <RecordPaymentDialog
            key={`pay-${payFor?.no ?? 0}`}
            quote={quote}
            track={payFor}
            paidNos={paidNos}
            open={!!payFor}
            onOpenChange={(o) => !o && setPayFor(null)}
          />
        </>
      ) : null}
    </div>
  );
}
