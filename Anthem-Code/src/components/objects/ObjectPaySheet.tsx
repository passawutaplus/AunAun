import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateObjectOrder } from "@/hooks/useCreatorObjects";
import { objectErrorText } from "@/lib/objects/db";
import { createObjectCharge, objectPayEnabled, syncObjectCharge } from "@/lib/objects/pay";
import { OBJECT_PLATFORM_FEE_PERCENT, formatBaht, type CreatorObject } from "@/lib/objects/taxonomy";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Pick<CreatorObject, "id" | "title" | "owner_id" | "price_thb" | "fulfillment">;
  buyerId: string;
  qty: number;
  finish: string;
  note: string;
  orderId?: string | null;
  amountSatang?: number;
};

export default function ObjectPaySheet({
  open,
  onOpenChange,
  item,
  buyerId,
  qty,
  finish,
  note,
  orderId,
  amountSatang,
}: Props) {
  const navigate = useNavigate();
  const createOrder = useCreateObjectOrder();
  const needsShip = item.fulfillment !== "download";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [chargeId, setChargeId] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [paying, setPaying] = useState(false);
  const shownSatang = amountSatang && amountSatang > 0 ? amountSatang : item.price_thb * qty * 100;

  useEffect(() => {
    if (!open) return;
    setActiveOrderId(orderId ?? null);
    setChargeId("");
    setQr(null);
    setPaid(false);
  }, [open, orderId]);

  useEffect(() => {
    if (!open || !activeOrderId || !chargeId || paid) return;
    const timer = window.setInterval(() => {
      void syncObjectCharge(activeOrderId, chargeId)
        .then((result) => {
          if (result.paid) setPaid(true);
        })
        .catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [open, activeOrderId, chargeId, paid]);

  const placeOrder = async () => {
    if (!orderId && !activeOrderId && needsShip) {
      if (name.trim().length < 2) {
        toast.error("ใส่ชื่อผู้รับ");
        return;
      }
      const digits = phone.replace(/\D/g, "");
      if (!/^[0-9]{9,10}$/.test(digits)) {
        toast.error("ใส่เบอร์โทร 9–10 หลัก");
        return;
      }
      if (address.trim().length < 8) {
        toast.error("ใส่ที่อยู่จัดส่ง");
        return;
      }
    }
    setPaying(true);
    try {
      const order = activeOrderId
        ? { id: activeOrderId, amount_satang: shownSatang }
        : await createOrder.mutateAsync({
            objectId: item.id,
            objectTitle: item.title,
            sellerId: item.owner_id,
            buyerId,
            qty: item.fulfillment === "download" ? 1 : qty,
            finish,
            note,
            shipName: name,
            shipPhone: phone,
            shipAddress: address,
          });
      setActiveOrderId(order.id);
      if (!objectPayEnabled()) {
        toast.message("สร้างคำสั่งแล้ว แต่ระบบนี้ยังไม่เปิดรับเงิน Payso");
        onOpenChange(false);
        navigate("/dashboard/objects?tab=buying");
        return;
      }
      const charge = await createObjectCharge(order.id, item.title);
      setChargeId(charge.chargeId);
      setQr(charge.qrCodeUri);
      if (charge.paid) setPaid(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : objectErrorText(error));
    } finally {
      setPaying(false);
    }
  };

  const finishPaid = () => {
    toast.success("จ่ายแล้ว คนขายจะจัดส่งและใส่เลขติดตามให้");
    onOpenChange(false);
    navigate("/dashboard/objects?tab=buying");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{paid ? "จ่ายแล้ว" : chargeId ? "สแกนพร้อมเพย์" : "สั่งซื้อ"}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{item.title}</p>
        <p className="text-2xl font-medium">{formatBaht(Math.round(shownSatang / 100))}</p>
        <p className="text-xs leading-5 text-muted-foreground">
          จ่ายผ่าน Payso ค่าธรรมเนียมแพลตฟอร์ม {OBJECT_PLATFORM_FEE_PERCENT}% หักจากคนขายตอนสั่ง
          เงินคนขายพร้อมถอนเมื่อคุณกดรับของ แล้วโอนตามรอบ T+7
        </p>
        {paid ? (
          <Button type="button" className="w-full" onClick={finishPaid}>
            ไปที่คำสั่งที่ซื้อ
          </Button>
        ) : chargeId ? (
          <div className="grid justify-items-center gap-3">
            {qr ? <img src={qr} alt="คิวอาร์พร้อมเพย์" className="h-52 w-52 bg-white object-contain" /> : <p className="text-sm">กำลังเตรียมคิวอาร์</p>}
            <p className="text-center text-xs text-muted-foreground">หลังจ่ายสำเร็จ หน้านี้จะไปต่อเอง</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {orderId ? (
              <p className="text-sm text-muted-foreground">คำสั่งนี้ยังรอชำระ สแกนพร้อมเพย์เพื่อให้คนขายเริ่มจัดส่ง</p>
            ) : needsShip ? (
              <>
                <div className="grid gap-1.5">
                  <Label htmlFor="ship-name">ชื่อผู้รับ</Label>
                  <Input id="ship-name" value={name} onChange={(event) => setName(event.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ship-phone">เบอร์โทร</Label>
                  <Input id="ship-phone" inputMode="numeric" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="08xxxxxxxx" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ship-address">ที่อยู่จัดส่ง</Label>
                  <Textarea id="ship-address" value={address} onChange={(event) => setAddress(event.target.value)} rows={3} />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">ไฟล์นี้ไม่ต้องใส่ที่อยู่ คนขายจะปล่อยให้ดาวน์โหลดหลังจ่าย</p>
            )}
            <Button type="button" className="w-full" disabled={paying || createOrder.isPending} onClick={() => void placeOrder()}>
              {paying ? "กำลังสร้างรายการจ่าย" : "สั่งและจ่ายด้วยพร้อมเพย์"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
