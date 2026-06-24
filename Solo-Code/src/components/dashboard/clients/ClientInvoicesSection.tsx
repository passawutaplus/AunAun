import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Plus, History, Trash2, Loader2 } from "lucide-react";
import { formatTHB } from "@/data/mockData";
import {
  useClientInvoices,
  type ClientInvoiceInput,
  type InvoiceStatus,
} from "@/store/clientInvoices";
import { InvoiceStatusMenu, StatusBadge } from "./InvoiceStatusMenu";
import { InvoiceStatusHistoryDialog } from "./InvoiceStatusHistoryDialog";
import { toast } from "sonner";

function NewInvoiceDialog({ onCreate }: { onCreate: (i: ClientInvoiceInput) => Promise<unknown> }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [project, setProject] = React.useState("");
  const [amount, setAmount] = React.useState<string>("");
  const [dueDate, setDueDate] = React.useState("");
  const [status, setStatus] = React.useState<InvoiceStatus>("ontime");
  const [busy, setBusy] = React.useState(false);

  function reset() {
    setName("");
    setProject("");
    setAmount("");
    setDueDate("");
    setStatus("ontime");
  }

  async function submit() {
    if (!name.trim()) {
      toast.error("กรอกชื่อลูกค้า");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("กรอกยอดเงิน");
      return;
    }
    setBusy(true);
    try {
      await onCreate({
        name: name.trim(),
        project: project.trim() || undefined,
        amount: amt,
        dueDate: dueDate || undefined,
        status,
      });
      toast.success("เพิ่มใบแจ้งหนี้แล้ว");
      reset();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-gradient-primary text-primary-foreground rounded-full gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> เพิ่มใบแจ้งหนี้
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>เพิ่มใบแจ้งหนี้ลูกค้า</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">ชื่อลูกค้า *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น Studio Mango"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">โปรเจกต์</Label>
            <Input
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="Brand Identity"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">ยอดเงิน (฿) *</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">วันครบกำหนด</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">สถานะเริ่มต้น</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as InvoiceStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ontime">ตรงเวลา</SelectItem>
                <SelectItem value="paid">จ่ายแล้ว</SelectItem>
                <SelectItem value="late7">เลท 7 วัน</SelectItem>
                <SelectItem value="late30">เลท 1 เดือน</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            ยกเลิก
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ClientInvoicesSection() {
  const { list, isLoading, add, setStatus, remove } = useClientInvoices();
  const [historyId, setHistoryId] = React.useState<string | null>(null);
  const [historyName, setHistoryName] = React.useState<string | undefined>(undefined);

  return (
    <Card className="animate-fade-up">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> ใบแจ้งหนี้ลูกค้า
          <span className="text-[11px] text-muted-foreground font-normal">({list.length})</span>
        </CardTitle>
        <NewInvoiceDialog onCreate={add} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด…
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-xl">
            <p className="text-sm text-muted-foreground">
              ยังไม่มีใบแจ้งหนี้ — เพิ่มเพื่อติดตามวันครบกำหนดและสถานะการจ่าย
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((inv) => (
              <div key={inv.id} className="rounded-xl border border-border/60 bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{inv.name}</p>
                    {inv.project && (
                      <p className="text-[11px] text-muted-foreground truncate">{inv.project}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <p className="num text-sm font-semibold text-primary">
                        ฿{formatTHB(inv.amount)}
                      </p>
                      {inv.dueDate && (
                        <p className="text-[10px] text-muted-foreground num">
                          ครบกำหนด{" "}
                          {new Date(inv.dueDate + "T00:00:00").toLocaleDateString("th-TH", {
                            day: "2-digit",
                            month: "short",
                            year: "2-digit",
                          })}
                        </p>
                      )}
                      <StatusBadge status={inv.status} />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <InvoiceStatusMenu
                      current={inv.status}
                      onChange={(s, note) => setStatus(inv.id, s, note)}
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label="ประวัติสถานะ"
                        onClick={() => {
                          setHistoryId(inv.id);
                          setHistoryName(inv.name);
                        }}
                      >
                        <History className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 hover:text-destructive"
                        aria-label="ลบ"
                        onClick={() => {
                          if (confirm(`ลบใบแจ้งหนี้ "${inv.name}"?`)) {
                            remove(inv.id).then(() => toast.success("ลบแล้ว"));
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <InvoiceStatusHistoryDialog
          invoiceId={historyId}
          invoiceName={historyName}
          open={!!historyId}
          onOpenChange={(o) => {
            if (!o) setHistoryId(null);
          }}
        />
      </CardContent>
    </Card>
  );
}
