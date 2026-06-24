import * as React from "react";
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

export type StudioClientContext = {
  projectTitle?: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectTitle?: string;
  onConfirm: (ctx: StudioClientContext) => void | Promise<void>;
};

export function StudioClientPickerDialog({
  open,
  onOpenChange,
  defaultProjectTitle = "",
  onConfirm,
}: Props) {
  const [projectTitle, setProjectTitle] = React.useState(defaultProjectTitle);
  const [clientName, setClientName] = React.useState("");
  const [clientEmail, setClientEmail] = React.useState("");
  const [clientPhone, setClientPhone] = React.useState("");
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (open) setProjectTitle(defaultProjectTitle);
  }, [open, defaultProjectTitle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientEmail.trim()) return;
    setPending(true);
    try {
      await onConfirm({
        projectTitle: projectTitle.trim() || defaultProjectTitle,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        clientPhone: clientPhone.trim() || undefined,
      });
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ข้อมูลลูกค้าสำหรับใบเสนอราคา</DialogTitle>
          <DialogDescription>
            จะส่งต่อไปยัง So1o เพื่อสร้างใบเสนอราคารวม Studio
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>ชื่องาน</Label>
            <Input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} />
          </div>
          <div>
            <Label>ชื่อลูกค้า *</Label>
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>อีเมลลูกค้า *</Label>
            <Input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>เบอร์โทร</Label>
            <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending ? "กำลังเปิด So1o..." : "เปิดใบเสนอราคา"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
