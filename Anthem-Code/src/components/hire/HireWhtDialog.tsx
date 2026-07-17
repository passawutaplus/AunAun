import { useState } from "react";
import { FileUp, Loader2, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  useConfirmHireWhtReceived,
  useHireWhtDoc,
  useUploadHireWhtCert,
  type HireOrderRow,
} from "@/hooks/useHireOrderFlow";
import { formatOfferAmount } from "@/lib/chatOffer";
import { satangToThb } from "@/lib/payments/fees";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: HireOrderRow;
  userId: string;
  role: "buyer" | "seller";
};

export default function HireWhtDialog({ open, onOpenChange, order, userId, role }: Props) {
  const { data: whtDoc } = useHireWhtDoc(order.id);
  const upload = useUploadHireWhtCert();
  const confirm = useConfirmHireWhtReceived();
  const [method, setMethod] = useState<"upload" | "post">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");

  const whtLabel = formatOfferAmount(satangToThb(order.wht_satang ?? 0));
  const busy = upload.isPending || confirm.isPending;

  const handleBuyerSubmit = async () => {
    try {
      await upload.mutateAsync({
        orderId: order.id,
        userId,
        method,
        file: method === "upload" ? file : null,
        note,
      });
      setFile(null);
      setNote("");
      onOpenChange(false);
    } catch {
      /* toast in hook */
    }
  };

  const handleSellerConfirm = async () => {
    if (!whtDoc?.id) return;
    try {
      await confirm.mutateAsync({
        orderId: order.id,
        whtDocId: whtDoc.id,
        userId,
      });
      onOpenChange(false);
    } catch {
      /* toast in hook */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle>หนังสือรับรองหัก ณ ที่จ่าย (50 ทวิ)</DialogTitle>
          <DialogDescription>
            หัก ณ ที่จ่าย {whtLabel} — ผู้จ้างส่ง 50 ทวิ ให้ผู้รับงานเพื่อยื่นภาษี
          </DialogDescription>
        </DialogHeader>

        {role === "buyer" ? (
          <div className="space-y-4 py-1">
            {order.wht_status === "complete" ? (
              <p className="text-sm text-emerald-700 bg-emerald-500/10 rounded-xl px-3 py-2">
                ผู้รับงานยืนยันรับ 50 ทวิ แล้ว
              </p>
            ) : whtDoc ? (
              <p className="text-sm text-muted-foreground">
                บันทึกแล้ว — รอผู้รับงานยืนยันรับ
                {whtDoc.method === "post" ? " (ส่งทางไปรษณีย์)" : ""}
              </p>
            ) : (
              <>
                <RadioGroup
                  value={method}
                  onValueChange={(v) => setMethod(v as "upload" | "post")}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2 rounded-xl border border-border p-3">
                    <RadioGroupItem value="upload" id="wht-upload" />
                    <Label htmlFor="wht-upload" className="flex items-center gap-2 cursor-pointer flex-1">
                      <FileUp className="w-4 h-4" />
                      อัปโหลดไฟล์ 50 ทวิ
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-xl border border-border p-3">
                    <RadioGroupItem value="post" id="wht-post" />
                    <Label htmlFor="wht-post" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Mail className="w-4 h-4" />
                      จะส่งทางไปรษณีย์
                    </Label>
                  </div>
                </RadioGroup>

                {method === "upload" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="wht-file">ไฟล์ PDF / รูป</Label>
                    <input
                      id="wht-file"
                      type="file"
                      accept=".pdf,image/*"
                      className="block w-full text-sm"
                      disabled={busy}
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <Label htmlFor="wht-note">หมายเหตุ (ไม่บังคับ)</Label>
                  <Textarea
                    id="wht-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="เลขที่ 50 ทวิ หรือที่อยู่จัดส่ง..."
                    className="rounded-xl min-h-[72px]"
                    disabled={busy}
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3 py-1">
            {!whtDoc ? (
              <p className="text-sm text-muted-foreground">รอผู้จ้างส่งหนังสือรับรอง 50 ทวิ</p>
            ) : whtDoc.received_confirmed_at ? (
              <p className="text-sm text-emerald-700 bg-emerald-500/10 rounded-xl px-3 py-2">
                ยืนยันรับแล้วเมื่อ{" "}
                {new Date(whtDoc.received_confirmed_at).toLocaleString("th-TH")}
              </p>
            ) : (
              <>
                <p className="text-sm text-foreground">
                  {whtDoc.method === "post"
                    ? "ผู้จ้างแจ้งว่าจะส่ง 50 ทวิ ทางไปรษณีย์"
                    : "ผู้จ้างอัปโหลด 50 ทวิ แล้ว"}
                </p>
                {whtDoc.file_url ? (
                  <a
                    href={whtDoc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    เปิดไฟล์ 50 ทวิ
                  </a>
                ) : null}
                {whtDoc.note ? (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{whtDoc.note}</p>
                ) : null}
              </>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            ปิด
          </Button>
          {role === "buyer" && !whtDoc && order.wht_status !== "complete" ? (
            <Button
              type="button"
              className="rounded-full"
              disabled={busy || (method === "upload" && !file)}
              onClick={() => void handleBuyerSubmit()}
            >
              {upload.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              บันทึก
            </Button>
          ) : null}
          {role === "seller" && whtDoc && !whtDoc.received_confirmed_at ? (
            <Button
              type="button"
              className="rounded-full"
              disabled={busy}
              onClick={() => void handleSellerConfirm()}
            >
              {confirm.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              ยืนยันรับ 50 ทวิ
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
