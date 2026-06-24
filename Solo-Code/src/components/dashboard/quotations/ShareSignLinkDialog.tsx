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
import { Copy, ExternalLink, Mail, Loader2, PenLine } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { sendSignLinkToClient } from "@/server/sign.functions";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  signShareToken: string;
  quotationNumber: string;
  clientEmail?: string;
}

export function ShareSignLinkDialog({
  open,
  onOpenChange,
  signShareToken,
  quotationNumber,
  clientEmail,
}: Props) {
  const sendEmail = useServerFn(sendSignLinkToClient);
  const [sending, setSending] = React.useState(false);

  const url = React.useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/sign/${signShareToken}`;
  }, [signShareToken]);

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
      const res = await sendEmail({ data: { signShareToken } });
      toast.success(`ส่งอีเมลให้ ${res.sentTo} แล้ว`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งอีเมลไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <PenLine className="h-4 w-4 text-primary" />
            ลิงก์ให้ลูกค้าเซ็น
          </DialogTitle>
          <DialogDescription className="text-xs">
            ใบเสนอราคา {quotationNumber} — ลูกค้าเปิดลิงก์บน iPad/มือถือเพื่อวาดลายเซ็นหรืออัปโหลดเอกสารเซ็นแล้ว
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="flex gap-2">
            <Input readOnly value={url} className="text-xs font-mono" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => void copyText(url, "คัดลอกลิงก์แล้ว")}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" className="shrink-0" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>

          <Button
            type="button"
            className="w-full gap-1.5"
            disabled={sending || !clientEmail?.trim()}
            onClick={() => void emailClient()}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            ส่งอีเมลให้ลูกค้า
          </Button>
          {!clientEmail?.trim() && (
            <p className="text-[10px] text-muted-foreground">
              ใส่อีเมลลูกค้าในใบเสนอราคาก่อน จึงจะส่งอีเมลได้
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
