import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { celebrateFromEdges } from "@/lib/celebrate";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shareToken: string;
  briefTitle: string;
  onConfirmed: () => void;
  /** "self" = freelancer confirming on client's behalf, "client" = client confirming */
  mode?: "self" | "client";
  defaultName?: string;
}

export function ConfirmBriefDialog({
  open,
  onOpenChange,
  shareToken,
  briefTitle,
  onConfirmed,
  mode = "client",
  defaultName,
}: Props) {
  const [name, setName] = React.useState(defaultName ?? "");
  const [signature, setSignature] = React.useState("");
  const [agree, setAgree] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setName(defaultName ?? "");
      setSignature("");
      setAgree(false);
      setBusy(false);
    } else {
      setName(defaultName ?? "");
    }
  }, [open, defaultName]);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("กรุณาใส่ชื่อ");
      return;
    }
    if (!signature.trim()) {
      toast.error("กรุณาเซ็นชื่อ (พิมพ์)");
      return;
    }
    if (!agree) {
      toast.error("กรุณายืนยันว่าข้อมูลถูกต้อง");
      return;
    }
    setBusy(true);
    try {
      const finalName = mode === "self" ? `${name.trim()} (ยืนยันโดยฟรีแลนซ์)` : name.trim();
      const { data, error } = await supabase.rpc("confirm_brief_by_token", {
        _token: shareToken,
        _name: finalName,
        _signature: signature.trim(),
      });
      if (error) throw error;
      if (!data) throw new Error("ไม่สามารถยืนยันได้ — บรีฟอาจถูกยืนยันแล้ว");
      celebrateFromEdges();
      toast.success("ยืนยันบรีฟเรียบร้อย ✓");
      onConfirmed();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const isSelf = mode === "self";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {isSelf ? "ยืนยันบรีฟ (โดยฟรีแลนซ์)" : "ยืนยันบรีฟงาน"}
          </DialogTitle>
          <DialogDescription>
            {isSelf
              ? `ยืนยันบรีฟ "${briefTitle}" แทนลูกค้าที่ตกลงปากเปล่าแล้ว — ระบบจะบันทึกชื่อคุณเป็นผู้ยืนยัน`
              : `ยืนยันว่าบรีฟ "${briefTitle}" ถูกต้องตามที่ตกลงกัน — ข้อมูลนี้จะใช้เป็นหลักฐานขอบเขตงาน (Scope of Work)`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="conf-name">ชื่อ-นามสกุล</Label>
            <Input
              id="conf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น สมชาย ใจดี"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="conf-sig">ลายเซ็น (พิมพ์ชื่อสำหรับลายเซ็นดิจิทัล)</Label>
            <Input
              id="conf-sig"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="พิมพ์ชื่อของคุณ"
              maxLength={120}
              className="font-[cursive] text-lg italic"
            />
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-muted/50 p-3">
            <Checkbox id="agree" checked={agree} onCheckedChange={(v) => setAgree(!!v)} />
            <label
              htmlFor="agree"
              className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
            >
              ฉันยืนยันว่าข้อมูลในบรีฟนี้ถูกต้องและตกลงให้ใช้เป็นขอบเขตการทำงาน
              หากมีการเปลี่ยนแปลงนอกเหนือจากนี้อาจมีค่าใช้จ่ายเพิ่มเติม
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            ยกเลิก
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> กำลังยืนยัน…
              </>
            ) : (
              "ยืนยันบรีฟนี้"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
