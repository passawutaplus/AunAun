import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DocumentPaper,
  PrintableDocumentPaper,
} from "@/components/documents/DocumentPaper";
import {
  useClientRespondDoc,
  useIssueInvoice,
  useRecordPayment,
  useVoidStudioDoc,
} from "@/hooks/useStudioDocuments";
import { formatOfferAmount, formatOfferDateShort } from "@/lib/chatOffer";
import { offerToInvoiceDocument } from "@/lib/documents/offerToDocument";
import {
  PAYMENT_METHODS,
  STATUS_TONE_CLASS,
  STUDIO_DOC_KIND_LABEL,
  addDaysYmd,
  docDisplayStatus,
  satangToThb,
  todayBangkok,
  type DocDisplayStatus,
  type InstallmentTrack,
  type StudioDocumentRow,
} from "@/lib/documents/studioDocuments";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSendMessage } from "@/hooks/useChat";
import { normalizePromptPayId } from "@/lib/payments/promptpayQr";
import {
  sharedStorage,
  SHARED_MEDIA_BUCKET,
} from "@/integrations/supabase/sharedStorageClient";

const SLIP_ACCEPT = "image/jpeg,image/png,image/webp";
const SLIP_MAX_BYTES = 8 * 1024 * 1024;

export function StatusPill({
  status,
  className,
}: {
  status: DocDisplayStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        STATUS_TONE_CLASS[status.tone],
        className,
      )}
    >
      {status.label}
    </span>
  );
}

/** View any studio document; owner can cancel it, client can report a transfer on an invoice. */
export function StudioDocViewDialog({
  doc,
  open,
  onOpenChange,
  viewerIsOwner,
}: {
  doc: StudioDocumentRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewerIsOwner: boolean;
}) {
  const voidDoc = useVoidStudioDoc();
  const respond = useClientRespondDoc();
  const send = useSendMessage();
  const [slip, setSlip] = useState<File | null>(null);
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [markMode, setMarkMode] = useState(false);
  const [note, setNote] = useState("");

  const close = (next: boolean) => {
    if (!next) {
      setConfirmVoid(false);
      setMarkMode(false);
      setNote("");
      setSlip(null);
    }
    onOpenChange(next);
  };

  if (!doc) return null;
  const status = docDisplayStatus(doc);
  const canVoid = viewerIsOwner && doc.status !== "void";
  const canMarkPaid =
    !viewerIsOwner &&
    doc.kind === "invoice" &&
    doc.status === "sent" &&
    !doc.client_marked_paid_at;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-2xl sm:max-w-3xl">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {STUDIO_DOC_KIND_LABEL[doc.kind]}
            <StatusPill status={status} />
          </DialogTitle>
          <DialogDescription className="tabular-nums">
            {doc.doc_number} · {doc.title}
            {doc.client_marked_paid_at
              ? ` · ลูกค้าแจ้งโอนเมื่อ ${formatOfferDateShort(doc.client_marked_paid_at.slice(0, 10))}`
              : ""}
          </DialogDescription>
        </DialogHeader>
        {doc.client_payment_note && doc.kind === "invoice" ? (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
            ข้อความจากลูกค้า: {doc.client_payment_note}
          </p>
        ) : null}
        {doc.snapshot ? (
          <PrintableDocumentPaper doc={doc.snapshot} />
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            ไม่มีข้อมูลเอกสาร
          </p>
        )}
        {markMode ? (
          <div className="space-y-1.5">
            <Label htmlFor="doc-paid-note">แจ้งผู้รับงาน (ไม่บังคับ)</Label>
            <Textarea
              id="doc-paid-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="เช่น โอนจากบัญชีกสิกร 14:20 น."
              className="resize-none text-base sm:text-sm"
            />
            <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-sm hover:bg-muted/50">
              <ImagePlus
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="min-w-0 truncate">
                {slip
                  ? slip.name
                  : "แนบรูปสลิป (ไม่บังคับ) ส่งเข้าแชทให้อีกฝ่ายเห็น"}
              </span>
              <input
                type="file"
                accept={SLIP_ACCEPT}
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (
                    f &&
                    (!SLIP_ACCEPT.split(",").includes(f.type) ||
                      f.size > SLIP_MAX_BYTES)
                  ) {
                    toast.error("รองรับ JPG / PNG / WebP ไม่เกิน 8 MB");
                    return;
                  }
                  setSlip(f);
                }}
              />
            </label>
          </div>
        ) : null}
        <DialogFooter className="gap-2 sm:justify-between">
          {canVoid ? (
            confirmVoid ? (
              <Button
                type="button"
                variant="destructive"
                disabled={voidDoc.isPending}
                onClick={async () => {
                  try {
                    await voidDoc.mutateAsync(doc);
                    toast.success("ยกเลิกเอกสารแล้ว");
                    close(false);
                  } catch (e) {
                    toast.error(
                      e instanceof Error ? e.message : "ยกเลิกไม่สำเร็จ",
                    );
                  }
                }}
              >
                ยืนยันยกเลิกเอกสาร
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                onClick={() => setConfirmVoid(true)}
              >
                ยกเลิกเอกสารนี้
              </Button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            {canMarkPaid ? (
              markMode ? (
                <Button
                  type="button"
                  disabled={respond.isPending || send.isPending}
                  onClick={async () => {
                    try {
                      // Status first: if the invoice was voided meanwhile, no slip lands in chat.
                      await respond.mutateAsync({
                        docId: doc.id,
                        action: "mark_paid",
                        note:
                          [note.trim(), slip ? "แนบสลิปในแชทแล้ว" : ""]
                            .filter(Boolean)
                            .join(" · ") || undefined,
                      });
                      if (slip && doc.conversation_id) {
                        const ext =
                          slip.type === "image/png"
                            ? "png"
                            : slip.type === "image/webp"
                              ? "webp"
                              : "jpg";
                        const path = `anthem/chat/${doc.conversation_id}/${crypto.randomUUID()}.${ext}`;
                        const { error: upErr } = await sharedStorage.storage
                          .from(SHARED_MEDIA_BUCKET)
                          .upload(path, slip, {
                            upsert: false,
                            contentType: slip.type,
                          });
                        if (upErr) throw upErr;
                        await send.mutateAsync({
                          conversationId: doc.conversation_id,
                          content: `สลิปโอนเงิน ${doc.doc_number}`,
                          attachmentUrl: path,
                          messageType: "image",
                        });
                      }
                      toast.success("แจ้งผู้รับงานแล้ว", {
                        description: "รอผู้รับงานยืนยันและออกใบเสร็จ",
                      });
                      close(false);
                    } catch (e) {
                      toast.error(
                        e instanceof Error ? e.message : "แจ้งไม่สำเร็จ",
                      );
                    }
                  }}
                >
                  ยืนยันว่าโอนแล้ว
                </Button>
              ) : (
                <Button type="button" onClick={() => setMarkMode(true)}>
                  แจ้งว่าโอนแล้ว
                </Button>
              )
            ) : null}
            <Button
              type="button"
              variant="secondary"
              onClick={() => close(false)}
            >
              ปิด
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Freelancer: issue the invoice for one installment (one screen, prefilled). */
export function IssueInvoiceDialog({
  quote,
  track,
  paidNos,
  open,
  onOpenChange,
}: {
  quote: StudioDocumentRow;
  track: InstallmentTrack | null;
  paidNos: number[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const issue = useIssueInvoice();
  const { user } = useAuth();
  const ppKey = `samecor:promptpay:${user?.id ?? "anon"}`;
  const [dueDate, setDueDate] = useState(() => addDaysYmd(todayBangkok(), 7));
  const [notes, setNotes] = useState("");
  const [promptPay, setPromptPay] = useState(() => {
    try {
      return localStorage.getItem(ppKey) || "";
    } catch {
      return "";
    }
  });
  const ppValid = !promptPay.trim() || !!normalizePromptPayId(promptPay);
  const preview = useMemo(
    () =>
      quote.offer && track
        ? offerToInvoiceDocument(quote.offer, track.no, {
            docNumber: "INV-····",
            dueDate,
            paidNos,
            notes: notes.trim() || null,
            promptPayId: ppValid ? promptPay.trim() || null : null,
          })
        : null,
    [quote.offer, track, dueDate, paidNos, notes, promptPay, ppValid],
  );
  if (!track) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-2xl sm:max-w-3xl">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>ส่งใบแจ้งหนี้ งวดที่ {track.no}</DialogTitle>
          <DialogDescription>
            {track.installment.label} · {formatOfferAmount(track.net)} —
            ลูกค้าจะได้รับในแชทนี้ และกด “แจ้งว่าโอนแล้ว” ได้
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)]">
          <div className="space-y-1.5">
            <Label htmlFor="inv-due">ครบกำหนดชำระ</Label>
            <Input
              id="inv-due"
              type="date"
              value={dueDate}
              min={todayBangkok()}
              onChange={(e) => setDueDate(e.target.value)}
              className="tabular-nums sm:text-sm"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[0, 7, 15, 30].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDueDate(addDaysYmd(todayBangkok(), d))}
                  className="min-h-8 rounded-full border border-border px-2.5 text-xs hover:bg-muted"
                >
                  {d === 0 ? "วันนี้" : `${d} วัน`}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-notes">ข้อความในใบแจ้งหนี้ (ไม่บังคับ)</Label>
            <Textarea
              id="inv-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="เช่น ช่องทางโอน: กสิกรไทย 123-4-56789-0 ชื่อบัญชี …"
              className="resize-none text-base sm:text-sm"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="inv-promptpay">
              พร้อมเพย์ของคุณ{" "}
              <span className="font-normal text-muted-foreground">
                (ไม่บังคับ · ใส่แล้วมี QR ให้ลูกค้าสแกนจ่าย)
              </span>
            </Label>
            <Input
              id="inv-promptpay"
              value={promptPay}
              onChange={(e) => setPromptPay(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              placeholder="เบอร์มือถือ หรือเลขบัตรประชาชน"
              className="tabular-nums sm:w-72 sm:text-sm"
              aria-invalid={!ppValid}
              aria-describedby="inv-promptpay-hint"
            />
            <p
              id="inv-promptpay-hint"
              className={cn(
                "text-xs",
                ppValid ? "text-muted-foreground" : "text-destructive",
              )}
            >
              {ppValid
                ? "เงินโอนเข้าบัญชีคุณโดยตรง SAMECOR ไม่ได้รับเงิน · ระบบจำไว้ใช้ครั้งถัดไป"
                : "รูปแบบไม่ถูกต้อง ใช้เบอร์มือถือ 10 หลัก หรือเลขบัตร 13 หลัก"}
            </p>
          </div>
        </div>
        {preview ? <DocumentPaper doc={preview} /> : null}
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={issue.isPending}
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            disabled={issue.isPending || !ppValid}
            onClick={async () => {
              try {
                try {
                  if (promptPay.trim())
                    localStorage.setItem(ppKey, promptPay.trim());
                  else localStorage.removeItem(ppKey);
                } catch {
                  // storage blocked; the invoice still carries the id
                }
                await issue.mutateAsync({
                  quote,
                  installmentNo: track.no,
                  dueDate: dueDate || null,
                  notes: notes.trim() || null,
                  paidNos,
                  promptPayId: promptPay.trim() || null,
                });
                toast.success("ส่งใบแจ้งหนี้ในแชทแล้ว");
                onOpenChange(false);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "ส่งไม่สำเร็จ");
              }
            }}
          >
            {issue.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : null}
            ส่งใบแจ้งหนี้
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Freelancer: record a received payment → receipt is issued and posted in chat. */
export function RecordPaymentDialog({
  quote,
  track,
  paidNos,
  open,
  onOpenChange,
}: {
  quote: StudioDocumentRow;
  track: InstallmentTrack | null;
  paidNos: number[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const record = useRecordPayment();
  const [paidDate, setPaidDate] = useState(() => todayBangkok());
  const [method, setMethod] = useState<string>("bank_transfer");
  if (!track) return null;
  const invoice = track.invoice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>บันทึกรับเงิน งวดที่ {track.no}</DialogTitle>
          <DialogDescription>
            {track.installment.label} · ระบบจะออกใบเสร็จและส่งให้ลูกค้าในแชท
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2.5">
            <span className="text-sm text-muted-foreground">ยอดที่ได้รับ</span>
            <span className="text-lg font-semibold tabular-nums">
              {formatOfferAmount(track.net)}
            </span>
          </div>
          {track.wht > 0 ? (
            <p className="text-xs text-muted-foreground">
              ลูกค้าหัก ณ ที่จ่าย {formatOfferAmount(track.wht)} —
              ขอหนังสือรับรอง (50 ทวิ) จากลูกค้าไว้ยื่นภาษี
            </p>
          ) : null}
          {invoice?.client_marked_paid_at ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
              ลูกค้าแจ้งโอนแล้วเมื่อ{" "}
              {formatOfferDateShort(invoice.client_marked_paid_at.slice(0, 10))}
              {invoice.client_payment_note
                ? ` · ${invoice.client_payment_note}`
                : ""}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="pay-date">วันที่รับเงิน</Label>
              <Input
                id="pay-date"
                type="date"
                value={paidDate}
                max={todayBangkok()}
                onChange={(e) => setPaidDate(e.target.value)}
                className="tabular-nums sm:text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-method">ช่องทาง</Label>
              <select
                id="pay-method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="h-10 w-full rounded-full border border-input bg-card px-3 text-base sm:text-sm"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {invoice ? (
            <p className="text-xs text-muted-foreground">
              อ้างอิงใบแจ้งหนี้ {invoice.doc_number}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              ยังไม่ได้ส่งใบแจ้งหนี้งวดนี้ — ออกใบเสร็จได้เลย
            </p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={record.isPending}
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            disabled={record.isPending || !paidDate}
            onClick={async () => {
              try {
                await record.mutateAsync({
                  quote,
                  installmentNo: track.no,
                  invoice,
                  paidDate,
                  method,
                  paidNos,
                });
                toast.success("ออกใบเสร็จและส่งในแชทแล้ว");
                onOpenChange(false);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
              }
            }}
          >
            {record.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : null}
            บันทึกและออกใบเสร็จ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function formatSatang(s: number) {
  return formatOfferAmount(satangToThb(s));
}
