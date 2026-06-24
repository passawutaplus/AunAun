import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Check, Clock, AlertTriangle, AlertOctagon, ChevronDown } from "lucide-react";
import { type InvoiceStatus, STATUS_LABEL } from "@/store/clientInvoices";
import { toast } from "sonner";

const STATUS_META: Record<
  InvoiceStatus,
  { icon: React.ComponentType<{ className?: string }>; classes: string }
> = {
  paid: { icon: Check, classes: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  ontime: { icon: Clock, classes: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  late7: { icon: AlertTriangle, classes: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  late30: {
    icon: AlertOctagon,
    classes: "bg-destructive/15 text-destructive border-destructive/30",
  },
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const m = STATUS_META[status];
  const Icon = m.icon;
  return (
    <Badge variant="outline" className={`text-[10px] rounded-full gap-1 ${m.classes}`}>
      <Icon className="h-2.5 w-2.5" /> {STATUS_LABEL[status]}
    </Badge>
  );
}

export function InvoiceStatusMenu({
  current,
  onChange,
}: {
  current: InvoiceStatus;
  onChange: (status: InvoiceStatus, note?: string) => Promise<void> | void;
}) {
  const [pending, setPending] = React.useState<InvoiceStatus | null>(null);
  const [note, setNote] = React.useState("");

  async function apply(status: InvoiceStatus, withNote?: string) {
    try {
      await onChange(status, withNote);
      toast.success(`เปลี่ยนสถานะเป็น "${STATUS_LABEL[status]}" แล้ว`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เปลี่ยนสถานะไม่สำเร็จ");
    } finally {
      setPending(null);
      setNote("");
    }
  }

  const options: InvoiceStatus[] = ["paid", "ontime", "late7", "late30"];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="h-7 rounded-full text-[11px] gap-1">
            <StatusBadge status={current} />
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-[11px]">เปลี่ยนสถานะ</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {options.map((s) => {
            const Icon = STATUS_META[s].icon;
            return (
              <DropdownMenuItem
                key={s}
                disabled={s === current}
                onClick={() => setPending(s)}
                className="text-xs gap-2"
              >
                <Icon className="h-3.5 w-3.5" /> {STATUS_LABEL[s]}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>เปลี่ยนเป็น "{pending && STATUS_LABEL[pending]}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              บันทึกหมายเหตุ (ไม่บังคับ) — จะถูกเก็บในประวัติ
            </p>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ลูกค้าโอนแล้ว / ลูกค้าขอเลื่อน 3 วัน"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              ยกเลิก
            </Button>
            <Button onClick={() => pending && apply(pending, note.trim() || undefined)}>
              ยืนยัน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
