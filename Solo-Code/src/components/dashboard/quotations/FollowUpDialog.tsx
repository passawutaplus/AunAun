import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, MessageCircle, Phone, Mail, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/auth/AuthProvider";
import { useSubscription } from "@/hooks/useSubscription";
import { issuerFromQuotation } from "@/lib/quotationKinds";
import { resolveQuotationSenderName } from "@/lib/quotationSenderName";
import { type Quotation, useQuotations } from "@/store/quotations";
import {
  daysOverdue,
  isOverdue,
  outstandingAmount,
  buildFollowUpMessage,
  type FollowUpTone,
} from "@/lib/email/followUpMessage";
import { sendPaymentFollowUpEmail } from "@/server/followUpEmail.functions";

export { daysOverdue, isOverdue, outstandingAmount };

const TONE_OPTIONS: { id: FollowUpTone; label: string; tone: string }[] = [
  { id: "soft", label: "นุ่มนวล", tone: "bg-emerald-500/15 text-emerald-700" },
  { id: "formal", label: "ทางการ", tone: "bg-amber-500/15 text-amber-700" },
  { id: "urgent", label: "เร่งด่วน", tone: "bg-destructive/15 text-destructive" },
];

export function FollowUpDialog({
  q,
  open,
  onClose,
}: {
  q: Quotation | null;
  open: boolean;
  onClose: () => void;
}) {
  const { update } = useQuotations();
  const { profile } = useAuth();
  const { isPro } = useSubscription();
  const sendBrandedEmail = useServerFn(sendPaymentFollowUpEmail);
  const [tplId, setTplId] = React.useState<FollowUpTone>("soft");
  const [partial, setPartial] = React.useState("");
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (open && q) {
      setTplId(daysOverdue(q) >= 14 ? "urgent" : daysOverdue(q) >= 7 ? "formal" : "soft");
      setPartial("");
    }
  }, [open, q]);

  if (!q) return null;
  const amount = outstandingAmount(q);
  const message = buildFollowUpMessage(q, amount, tplId);
  const issuer = issuerFromQuotation(q);
  const senderName = resolveQuotationSenderName({
    quotationKind: q.quotationKind,
    orgSnapshot: q.orgSnapshot,
    studioSnapshot: q.studioSnapshot,
    profileBrandName: profile?.brand_name,
    profileDisplayName: profile?.display_name,
  });
  const emailButtonLabel =
    issuer || isPro ? `ส่งอีเมลจาก ${senderName}` : "ส่งอีเมลแบรนด์ So1o ให้ลูกค้า";

  const recordFollowup = () => update(q.id, { lastFollowupAt: new Date().toISOString() });

  const copy = async () => {
    await navigator.clipboard.writeText(message);
    toast.success("คัดลอกข้อความแล้ว");
    recordFollowup();
  };

  const openLine = () => {
    const url = `https://line.me/R/msg/text/?${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    recordFollowup();
  };

  const openWhatsApp = () => {
    const phone = (q.clientPhone ?? "").replace(/\D/g, "");
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    recordFollowup();
  };

  const openMail = () => {
    if (!q.clientEmail) {
      toast.error("ไม่มีอีเมลลูกค้า");
      return;
    }
    window.location.href = `mailto:${q.clientEmail}?subject=${encodeURIComponent(`ติดตามการชำระเงิน ${q.invoiceNumber ?? q.number}`)}&body=${encodeURIComponent(message)}`;
    recordFollowup();
  };

  const sendEmail = async () => {
    if (!q.clientEmail) {
      toast.error("ไม่มีอีเมลลูกค้า — ใส่ในใบเสนอราคาก่อน");
      return;
    }
    setSending(true);
    try {
      const res = await sendBrandedEmail({ data: { quotationId: q.id, tone: tplId } });
      toast.success(`ส่งอีเมลจาก ${senderName} ให้ ${res.sentTo} แล้ว`);
      recordFollowup();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งอีเมลไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  };

  const recordPartial = async () => {
    const n = Number(partial.replace(/[^\d.]/g, "")) || 0;
    if (n <= 0) return;
    await update(q.id, { paidPartial: (q.paidPartial || 0) + n });
    toast.success(`บันทึกรับชำระบางส่วน ฿${n.toLocaleString("th-TH")}`);
    setPartial("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ติดตามการชำระเงิน — {q.invoiceNumber ?? q.number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-xl border border-border/60 p-3 bg-muted/20">
            <p className="text-xs text-muted-foreground">
              ลูกค้า: <span className="text-foreground font-medium">{q.clientName}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">โครงการ: {q.projectName}</p>
            <div className="flex items-center justify-between mt-2">
              <div>
                <p className="text-[11px] text-muted-foreground">ยอดค้างชำระ (รวมค่าปรับ)</p>
                <p className="text-xl font-bold num">฿{amount.toLocaleString("th-TH")}</p>
              </div>
              {isOverdue(q) && (
                <span className="text-[11px] rounded-full bg-destructive/15 text-destructive px-2.5 py-1 font-semibold">
                  เกินกำหนด {daysOverdue(q)} วัน
                </span>
              )}
            </div>
          </div>

          <div>
            <Label className="text-[11px] text-muted-foreground">ระดับข้อความ</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTplId(t.id)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                    tplId === t.id
                      ? "border-primary " + t.tone
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-[11px] text-muted-foreground">ข้อความที่จะส่ง</Label>
            <Textarea rows={8} value={message} readOnly className="text-xs mt-1 font-mono" />
          </div>

          <Button
            size="lg"
            className="w-full gap-1.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
            disabled={sending || !q.clientEmail}
            onClick={sendEmail}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {emailButtonLabel}
          </Button>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button size="sm" variant="outline" onClick={copy}>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={openLine}
              className="bg-[#06C755]/10 border-[#06C755]/40 text-[#06C755] hover:bg-[#06C755]/20"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              LINE
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={openWhatsApp}
              className="bg-[#25D366]/10 border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/20"
            >
              <Phone className="h-3.5 w-3.5" />
              WhatsApp
            </Button>
            <Button size="sm" variant="outline" onClick={openMail}>
              <Mail className="h-3.5 w-3.5" />
              Email
            </Button>
          </div>

          <div className="rounded-xl border border-border/60 p-3 space-y-2">
            <Label className="text-[11px] font-semibold">รับชำระบางส่วน (Partial)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="ยอดที่ได้รับ"
                inputMode="numeric"
                value={partial}
                onChange={(e) => setPartial(e.target.value)}
                className="num"
              />
              <Button size="sm" onClick={recordPartial} disabled={!partial}>
                บันทึก
              </Button>
            </div>
            {(q.paidPartial || 0) > 0 && (
              <p className="text-[11px] text-muted-foreground">
                ชำระแล้ว ฿{q.paidPartial.toLocaleString("th-TH")}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ปิด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
