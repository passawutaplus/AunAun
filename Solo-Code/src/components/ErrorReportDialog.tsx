import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Copy, Headphones, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthProvider";
import { useMyTickets } from "@/store/supportTickets";
import { reportPageError } from "@/server/error-report.functions";
import { trackFeature } from "@/lib/featureUsage";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errorCode: number;
  errorMessage?: string;
};

export function ErrorReportDialog({ open, onOpenChange, errorCode, errorMessage }: Props) {
  const { user } = useAuth();
  const { create } = useMyTickets();
  const [note, setNote] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [ticketNumber, setTicketNumber] = React.useState<string | null>(null);

  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  React.useEffect(() => {
    if (!open) {
      setNote("");
      setEmail("");
      setSubmitting(false);
      setTicketNumber(null);
    }
  }, [open]);

  const submit = async () => {
    setSubmitting(true);
    try {
      if (user) {
        const title =
          errorCode === 404
            ? "รายงานหน้าไม่พบ (404)"
            : errorCode >= 500
              ? `รายงานข้อผิดพลาดระบบ (${errorCode})`
              : `รายงานปัญหาหน้าเว็บ (${errorCode || "?"})`;

        const description = [
          `URL: ${pageUrl}`,
          errorMessage ? `Error: ${errorMessage}` : null,
          note.trim() ? `\nหมายเหตุ:\n${note.trim()}` : null,
          `เวลา: ${new Date().toISOString()}`,
        ]
          .filter(Boolean)
          .join("\n");

        const ticket = await create({
          title,
          description,
          category: "bug",
          source: "error_page",
          sourceFeature: `http_${errorCode || "unknown"}`,
        });
        setTicketNumber(ticket.ticketNumber);
      } else {
        if (!email.trim()) {
          toast.error("กรุณาระบุอีเมล / Please enter your email");
          return;
        }
        const result = await reportPageError({
          data: {
            errorCode,
            pageUrl,
            errorMessage,
            userNote: note.trim() || undefined,
            contactEmail: email.trim(),
          },
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setTicketNumber(result.ticketNumber);
      }

      void trackFeature("error_page.report");
      toast.success("ส่งให้ทีมงานแล้ว — เราจะรีบตรวจสอบ");
    } catch (e) {
      console.error("[ErrorReportDialog]", e);
      toast.error("ส่งรายงานไม่สำเร็จ — ลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {ticketNumber ? (
          <div className="text-center py-2">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 className="h-7 w-7 text-green-600" />
            </div>
            <DialogTitle className="text-lg">ส่งให้ทีมงานแล้ว</DialogTitle>
            <DialogDescription className="mt-1 text-sm">
              Report received — our team will look into it
            </DialogDescription>
            <p className="mt-4 text-xs text-muted-foreground">เลขตั๋ว / Ticket</p>
            <p className="text-2xl font-bold text-primary tracking-wide">{ticketNumber}</p>
            <p className="mt-2 text-xs text-muted-foreground max-w-xs mx-auto">
              ทีมงานได้รับแจ้งในหลังบ้านแล้ว — เราจะรีบตรวจสอบและอัปเดตให้คุณทราบ
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-1.5"
              onClick={() => {
                navigator.clipboard.writeText(ticketNumber);
                toast.success("คัดลอกเลขตั๋วแล้ว");
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              คัดลอกเลขตั๋ว
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Headphones className="h-5 w-5 text-primary" />
                แจ้งทีมงาน
              </DialogTitle>
              <DialogDescription>
                Contact support — we'll notify our team right away (like a support ticket)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                <p>
                  <span className="font-medium text-foreground">รหัส / Code:</span>{" "}
                  {errorCode || "—"}
                </p>
                <p className="break-all line-clamp-2">
                  <span className="font-medium text-foreground">URL:</span> {pageUrl || "—"}
                </p>
                {errorMessage && (
                  <p className="line-clamp-2">
                    <span className="font-medium text-foreground">Error:</span> {errorMessage}
                  </p>
                )}
              </div>

              {!user && (
                <div>
                  <label className="text-xs font-medium">อีเมลติดต่อกลับ * / Email *</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-medium">
                  เพิ่มรายละเอียด (ไม่บังคับ) / Optional note
                </label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เช่น กดปุ่มไหนแล้วเจอปัญหา / What were you doing?"
                  rows={3}
                  maxLength={1000}
                  className="mt-1 resize-none text-sm"
                />
              </div>

              <Button
                className="w-full text-white gap-1.5"
                style={{ background: "#FF5F05" }}
                disabled={submitting}
                onClick={() => void submit()}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Headphones className="h-4 w-4" />
                )}
                ส่งให้ทีมงาน / Send to support
              </Button>

              <p className="text-[10px] text-center text-muted-foreground">
                ระบบจะสร้างตั๋วและแจ้งแอดมินหลังบ้านอัตโนมัติ
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
