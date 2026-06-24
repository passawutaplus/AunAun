import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sanitizeText } from "@/lib/security";
import { toast } from "sonner";
import { Plus, AlertCircle, UserPlus, FileText } from "lucide-react";
import { FeedbackJob } from "./types";
import { useQuotations } from "@/store/quotations";

const NEW_CLIENT_VALUE = "__new__";
const NO_QUOTATION_VALUE = "__none__";

export function NewJobDialog({
  onAdd,
  clientOptions,
  onAddClient,
}: {
  onAdd: (job: FeedbackJob) => void;
  clientOptions: { id: string; name: string }[];
  onAddClient?: (name: string) => Promise<string> | string;
}) {
  const { list: quotations } = useQuotations();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [newClientName, setNewClientName] = React.useState("");
  const [quotationId, setQuotationId] = React.useState<string>(NO_QUOTATION_VALUE);
  const [revisionQuota, setRevisionQuota] = React.useState<number>(3);
  const [touched, setTouched] = React.useState(false);

  const isAddingNew = clientId === NEW_CLIENT_VALUE;
  const titleError = touched && !sanitizeText(title, 120) ? "กรุณากรอกชื่องาน" : "";
  const clientError = touched && !clientId ? "กรุณาเลือกลูกค้า" : "";
  const newClientError =
    touched && isAddingNew && !sanitizeText(newClientName, 80) ? "กรุณากรอกชื่อลูกค้าใหม่" : "";
  const valid =
    !titleError &&
    !clientError &&
    !newClientError &&
    title.trim() &&
    clientId &&
    (!isAddingNew || newClientName.trim());

  // Filter quotations to those of the selected client (by name match)
  const selectedClientName = React.useMemo(
    () => clientOptions.find((c) => c.id === clientId)?.name ?? "",
    [clientOptions, clientId],
  );
  const filteredQuotations = React.useMemo(
    () =>
      selectedClientName
        ? quotations.filter(
            (q) => q.clientName.trim().toLowerCase() === selectedClientName.trim().toLowerCase(),
          )
        : quotations,
    [quotations, selectedClientName],
  );

  // Auto-fill quota from quotation
  const handleQuotationChange = (v: string) => {
    setQuotationId(v);
    if (v === NO_QUOTATION_VALUE) return;
    const q = quotations.find((x) => x.id === v);
    if (q && q.revisionsCount > 0) setRevisionQuota(q.revisionsCount);
  };

  const reset = () => {
    setTitle("");
    setClientId("");
    setNewClientName("");
    setQuotationId(NO_QUOTATION_VALUE);
    setRevisionQuota(3);
    setTouched(false);
  };

  const submit = async () => {
    setTouched(true);
    const t = sanitizeText(title, 120);
    if (!t || !clientId) return;
    let finalClientId = clientId;
    if (isAddingNew) {
      const name = sanitizeText(newClientName, 80);
      if (!name) return;
      if (!onAddClient) {
        toast.error("ไม่สามารถเพิ่มลูกค้าใหม่ได้");
        return;
      }
      try {
        finalClientId = await Promise.resolve(onAddClient(name));
      } catch {
        toast.error("เพิ่มลูกค้าใหม่ไม่สำเร็จ");
        return;
      }
    }
    onAdd({
      id: crypto.randomUUID(),
      title: t,
      clientId: finalClientId,
      createdAt: new Date().toISOString(),
      closed: false,
      revisions: [],
      revisionQuota: revisionQuota > 0 ? revisionQuota : null,
      quotationId: quotationId !== NO_QUOTATION_VALUE ? quotationId : null,
    });
    reset();
    setOpen(false);
    toast.success("เพิ่มงานใหม่แล้ว");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="rounded-xl gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-elevated">
          <Plus className="h-4 w-4" /> เพิ่มงาน Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>เพิ่มงานใหม่</DialogTitle>
          <DialogDescription>เริ่มเก็บฟีดแบคและรอบการแก้ไขสำหรับงานนี้</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="fb-title">
              ชื่องาน <span className="text-destructive">*</span>
            </Label>
            <Input
              id="fb-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="เช่น Logo Rebrand"
              maxLength={120}
              aria-invalid={!!titleError}
              className={`rounded-xl ${titleError ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
            {titleError && (
              <p className="text-[11px] text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {titleError}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label>
              ลูกค้า <span className="text-destructive">*</span>
            </Label>
            <Select
              value={clientId}
              onValueChange={(v) => {
                setClientId(v);
                setTouched(true);
                setQuotationId(NO_QUOTATION_VALUE);
              }}
            >
              <SelectTrigger
                className={`rounded-xl ${clientError ? "border-destructive focus-visible:ring-destructive" : ""}`}
              >
                <SelectValue placeholder="เลือกลูกค้า" />
              </SelectTrigger>
              <SelectContent>
                {clientOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
                {onAddClient && (
                  <SelectItem value={NEW_CLIENT_VALUE} className="text-primary font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <UserPlus className="h-3.5 w-3.5" /> เพิ่มลูกค้าใหม่
                    </span>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {clientError && (
              <p className="text-[11px] text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {clientError}
              </p>
            )}
            {isAddingNew && (
              <div className="grid gap-1.5 mt-2">
                <Label htmlFor="fb-new-client">
                  ชื่อลูกค้าใหม่ <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fb-new-client"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="เช่น Nimbus Co."
                  maxLength={80}
                  className={`rounded-xl ${newClientError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {newClientError && (
                  <p className="text-[11px] text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {newClientError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Optional: link an existing quotation to auto-fill the revision quota */}
          {!isAddingNew && filteredQuotations.length > 0 && (
            <div className="grid gap-1.5">
              <Label className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" /> ใบเสนอราคาที่เกี่ยวข้อง
                <span className="text-[10px] text-muted-foreground font-normal">(ไม่บังคับ)</span>
              </Label>
              <Select value={quotationId} onValueChange={handleQuotationChange}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_QUOTATION_VALUE}>— ไม่ลิงก์ใบเสนอราคา —</SelectItem>
                  {filteredQuotations.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.number} · แก้ได้ {q.revisionsCount} ครั้ง
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                ระบบจะดึงโควต้าการแก้ไขจากใบเสนอราคามาตั้งให้อัตโนมัติ
              </p>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="fb-quota">โควต้ารอบการแก้ไขที่ตกลงไว้</Label>
            <Input
              id="fb-quota"
              type="number"
              min={0}
              max={99}
              value={revisionQuota}
              onChange={(e) =>
                setRevisionQuota(Math.max(0, Math.min(99, Number(e.target.value) || 0)))
              }
              className="rounded-xl w-32"
            />
            <p className="text-[10px] text-muted-foreground">
              ใส่ 0 ถ้าไม่อยากให้ระบบเตือนเมื่อแก้เกิน
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl">
            ยกเลิก
          </Button>
          <Button
            onClick={submit}
            disabled={touched && !valid}
            className="rounded-xl bg-primary hover:bg-primary/90"
          >
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
