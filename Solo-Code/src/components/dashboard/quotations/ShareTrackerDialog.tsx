import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, Hash, CheckCircle2, Mail, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { sendPortalLinkToClient } from "@/server/portalEmail.functions";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  shareToken: string;
  trackingCode: string;
  hasBrief: boolean;
  hasQuotation: boolean;
  isNew: boolean;
}

export function ShareTrackerDialog({
  open,
  onOpenChange,
  shareToken,
  trackingCode,
  hasQuotation,
  isNew,
}: Props) {
  const sendEmail = useServerFn(sendPortalLinkToClient);
  const [sending, setSending] = React.useState(false);
  const [emailPrompted, setEmailPrompted] = React.useState(false);

  const url = React.useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/track/${shareToken}`;
  }, [shareToken]);

  const depositUrl = `${url}#deposit`;

  async function copyText(text: string, msg: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(msg);
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  }

  async function emailClient() {
    setSending(true);
    try {
      const res = await sendEmail({ data: { shareToken } });
      toast.success(`ส่งอีเมลให้ ${res.sentTo} แล้ว`);
      setEmailPrompted(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งอีเมลไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  }

  React.useEffect(() => {
    if (!open || !isNew || !hasQuotation || emailPrompted) return;
    const t = window.setTimeout(() => {
      toast("ส่งใบเสนอราคาให้ลูกค้าทางอีเมลได้เลย", {
        description: "กด «ส่งอีเมลให้ลูกค้า» — ต้องมีอีเมลลูกค้าในใบเสนอราคาก่อน",
        duration: 8000,
        action: {
          label: "ส่งเลย",
          onClick: () => void emailClient(),
        },
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [open, isNew, hasQuotation, emailPrompted]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            {isNew ? "สร้างลิงก์ติดตามงานสำเร็จ" : "ลิงก์ติดตามงานของลูกค้า"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            ส่งลิงก์นี้ให้ลูกค้า — ดูใบเสนอราคา ยอมรับ ชำระมัดจำ และติดตามงานได้ในที่เดียว
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              ลิงก์สาธารณะ
            </label>
            <Input
              value={url}
              readOnly
              className="text-xs font-mono mt-1"
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">รหัสติดตาม:</span>
            <span className="font-mono font-semibold">{trackingCode}</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <Button
              size="lg"
              className="w-full gap-1.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
              onClick={() => copyText(url, "คัดลอกลิงก์แล้ว — ส่งให้ลูกค้าได้เลย")}
            >
              <Copy className="h-4 w-4" /> คัดลอกลิงก์
            </Button>

            {hasQuotation && (
              <>
                <Button
                  variant="outline"
                  className="w-full gap-1.5"
                  disabled={sending}
                  onClick={emailClient}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  ส่งอีเมลใบเสนอราคาให้ลูกค้า
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-1.5"
                  onClick={() => copyText(depositUrl, "คัดลอกลิงก์ชำระมัดจำแล้ว")}
                >
                  <Wallet className="h-4 w-4" /> คัดลอกลิงก์ชำระมัดจำ
                </Button>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="h-3.5 w-3.5" /> เปิดดูหน้าลูกค้า
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground leading-snug pt-1 border-t border-border">
            💡 ใส่อีเมลลูกค้าในใบเสนอราคาก่อน ถึงจะส่งอีเมลได้ ·
            ลูกค้ากดยอมรับใบเสนอราคาได้จากลิงก์นี้
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
