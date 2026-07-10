import { useMemo, useState } from "react";
import {
  Banknote,
  CalendarRange,
  Eye,
  EyeOff,
  FileText,
  Plus,
  StickyNote,
  Trash2,
  UserRound,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useSendMessage } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import {
  DEPOSIT_PRESETS,
  defaultOfferMilestones,
  emptyOfferItem,
  encodeChatOffer,
  formatOfferAmount,
  formatOfferBaht,
  makeOfferNumber,
  offerItemSubtotal,
  offerItemsSubtotal,
  paymentTermsLabel,
  summarizeOfferItems,
  type ChatOfferLineItem,
  type ChatOfferMilestone,
  type ChatOfferPayload,
} from "@/lib/chatOffer";
import { ChatOfferTimeline } from "@/components/chat/ChatOfferTimeline";
import { ChatOfferPreview } from "@/components/chat/ChatOfferPreview";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  defaultTitle?: string;
  defaultClientName?: string;
  defaultClientEmail?: string;
  defaultClientPhone?: string;
  defaultClientAddress?: string;
  defaultClientTaxId?: string;
};

function newMilestoneId() {
  return `ms-${Math.random().toString(36).slice(2, 9)}`;
}

export function ChatOfferDialog({
  open,
  onOpenChange,
  conversationId,
  defaultTitle,
  defaultClientName,
  defaultClientEmail,
  defaultClientPhone,
  defaultClientAddress,
  defaultClientTaxId,
}: Props) {
  const send = useSendMessage();
  const { user } = useAuth();
  const [title, setTitle] = useState(defaultTitle?.trim() || "");
  const [items, setItems] = useState<ChatOfferLineItem[]>(() => [emptyOfferItem()]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [clientName, setClientName] = useState(defaultClientName?.trim() || "");
  const [clientEmail, setClientEmail] = useState(defaultClientEmail?.trim() || "");
  const [clientPhone, setClientPhone] = useState(defaultClientPhone?.trim() || "");
  const [clientAddress, setClientAddress] = useState(defaultClientAddress?.trim() || "");
  const [clientTaxId, setClientTaxId] = useState(defaultClientTaxId?.trim() || "");
  const [depositPercent, setDepositPercent] = useState(50);
  const [customDeposit, setCustomDeposit] = useState("50");
  const [whtEnabled, setWhtEnabled] = useState(true);
  const [clientNotes, setClientNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [docNumber] = useState(() => makeOfferNumber());
  const [milestones, setMilestones] = useState<ChatOfferMilestone[]>(() =>
    defaultOfferMilestones(),
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"view" | "confirm">("view");

  const issuerName =
    (typeof user?.user_metadata?.display_name === "string" && user.user_metadata.display_name) ||
    (typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    (typeof user?.user_metadata?.name === "string" && user.user_metadata.name) ||
    undefined;
  const issuerEmail = user?.email ?? undefined;

  const itemsTotal = useMemo(() => Math.round(offerItemsSubtotal(items)), [items]);

  const updateItem = (id: string, patch: Partial<ChatOfferLineItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const applyDeposit = (pct: number) => {
    const next = Math.min(100, Math.max(1, Math.round(pct)));
    setDepositPercent(next);
    setCustomDeposit(String(next));
  };

  const syncMilestoneDates = (start: string, end: string) => {
    setMilestones((prev) => {
      const next = [...prev];
      if (next[0]) next[0] = { ...next[0], date: start || next[0].date || null };
      if (next.length > 0) {
        const last = next.length - 1;
        next[last] = { ...next[last], date: end || next[last].date || null };
      }
      return next;
    });
  };

  const previewOffer: ChatOfferPayload = useMemo(() => {
    const named = items.filter((it) => it.name.trim());
    return {
      v: 3,
      title: title.trim() || "ชื่องาน",
      amount: itemsTotal,
      currency: "THB",
      deliverables: summarizeOfferItems(named),
      items: named.length ? named : items,
      startDate: startDate || null,
      endDate: endDate || null,
      dueDate: endDate || null,
      number: docNumber,
      clientName: clientName.trim() || null,
      clientEmail: clientEmail.trim() || null,
      clientPhone: clientPhone.trim() || null,
      clientAddress: clientAddress.trim() || null,
      clientTaxId: clientTaxId.trim() || null,
      issuerName: issuerName || null,
      issuerEmail: issuerEmail || null,
      depositPercent,
      depositDueDate: null,
      paymentTerms: paymentTermsLabel(depositPercent),
      whtEnabled,
      whtRate: 3,
      milestones,
      clientNotes: clientNotes.trim() || null,
      internalNotes: internalNotes.trim() || null,
    };
  }, [
    title,
    items,
    itemsTotal,
    startDate,
    endDate,
    docNumber,
    clientName,
    clientEmail,
    clientPhone,
    clientAddress,
    clientTaxId,
    issuerName,
    issuerEmail,
    depositPercent,
    whtEnabled,
    milestones,
    clientNotes,
    internalNotes,
  ]);

  const reset = () => {
    setTitle(defaultTitle?.trim() || "");
    setItems([emptyOfferItem()]);
    setStartDate("");
    setEndDate("");
    setClientName(defaultClientName?.trim() || "");
    setClientEmail(defaultClientEmail?.trim() || "");
    setClientPhone(defaultClientPhone?.trim() || "");
    setClientAddress(defaultClientAddress?.trim() || "");
    setClientTaxId(defaultClientTaxId?.trim() || "");
    setDepositPercent(50);
    setCustomDeposit("50");
    setWhtEnabled(true);
    setClientNotes("");
    setInternalNotes("");
    setMilestones(defaultOfferMilestones());
  };

  const handleOpen = (next: boolean) => {
    if (next) {
      setTitle(defaultTitle?.trim() || "");
      setClientName(defaultClientName?.trim() || "");
      setClientEmail(defaultClientEmail?.trim() || "");
      setClientPhone(defaultClientPhone?.trim() || "");
      setClientAddress(defaultClientAddress?.trim() || "");
      setClientTaxId(defaultClientTaxId?.trim() || "");
    } else {
      setPreviewOpen(false);
      setPreviewMode("view");
      reset();
    }
    onOpenChange(next);
  };

  const validateOffer = (): { title: string; named: typeof items } | null => {
    const trimmedTitle = title.trim();
    const named = items.filter((it) => it.name.trim());
    if (!trimmedTitle) {
      toast.error("ใส่ชื่องานด้วย");
      return null;
    }
    if (named.length === 0) {
      toast.error("เพิ่มอย่างน้อย 1 รายการ");
      return null;
    }
    if (itemsTotal <= 0) {
      toast.error("ใส่ราคาในรายการให้มียอดรวมมากกว่า 0");
      return null;
    }
    if (startDate && endDate && endDate < startDate) {
      toast.error("วันจบงานต้องไม่อยู่ก่อนวันเริ่มงาน");
      return null;
    }
    return { title: trimmedTitle, named };
  };

  const openPreview = (mode: "view" | "confirm") => {
    if (mode === "confirm" && !validateOffer()) return;
    setPreviewMode(mode);
    setPreviewOpen(true);
  };

  const confirmSend = async () => {
    const ok = validateOffer();
    if (!ok) return;

    try {
      await send.mutateAsync({
        conversationId,
        content: encodeChatOffer({
          ...previewOffer,
          title: ok.title,
          amount: itemsTotal,
          items: ok.named,
          deliverables: summarizeOfferItems(ok.named),
        }),
        messageType: "text",
      });
      toast.success("ส่งข้อเสนอแล้ว");
      setPreviewOpen(false);
      handleOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งไม่สำเร็จ");
    }
  };

  const totalLabel = formatOfferAmount(itemsTotal);

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-6xl max-h-[92vh] overflow-y-auto rounded-2xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-primary" />
            เสนอราคา
          </DialogTitle>
          <DialogDescription>
            กรอกรายละเอียดแบบใบเสนอราคา — กดส่งแล้วจะขึ้นพรีวิวให้เช็คก่อนส่งจริง
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1 min-w-0">
            {/* Client */}
            <section className="rounded-2xl border border-border bg-card p-3.5 space-y-3">
              <div className="flex items-start gap-2">
                <UserRound className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">ลูกค้า</p>
                  <p className="text-[11px] text-muted-foreground">
                    ข้อมูลที่จะแสดงบนใบเสนอราคา
                  </p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="offer-client">ชื่อลูกค้า / บริษัท</Label>
                  <Input
                    id="offer-client"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="ชื่อลูกค้า / บริษัท"
                    maxLength={80}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="offer-client-email">อีเมล</Label>
                  <Input
                    id="offer-client-email"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="client@email.com"
                    maxLength={120}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="offer-client-phone">เบอร์โทร</Label>
                  <Input
                    id="offer-client-phone"
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="08x-xxx-xxxx"
                    maxLength={40}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="offer-client-address">ที่อยู่</Label>
                  <Textarea
                    id="offer-client-address"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="ที่อยู่สำหรับออกเอกสาร (ไม่บังคับ)"
                    rows={2}
                    maxLength={300}
                    className="resize-none text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="offer-client-tax">เลขผู้เสียภาษี</Label>
                  <Input
                    id="offer-client-tax"
                    value={clientTaxId}
                    onChange={(e) => setClientTaxId(e.target.value.replace(/[^\d]/g, "").slice(0, 13))}
                    placeholder="13 หลัก (ไม่บังคับ)"
                    inputMode="numeric"
                    maxLength={13}
                  />
                </div>
              </div>
            </section>

            {/* Document details */}
            <section className="rounded-2xl border border-border bg-card p-3.5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">รายละเอียดเอกสาร</p>
                    <p className="text-[11px] text-muted-foreground">ข้อมูลโครงการและเงื่อนไขชำระ</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-primary tabular-nums shrink-0">
                  ยอดรวม {totalLabel}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="offer-title">
                    ชื่อโครงการ <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="offer-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="เช่น ออกแบบโลโก้ + brand kit"
                    maxLength={120}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="offer-number">เลขที่ใบเสนอราคา</Label>
                  <Input id="offer-number" value={docNumber} readOnly className="bg-muted/50" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>
                    รายการ <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    รวมเป็นเงิน ฿{formatOfferBaht(itemsTotal)}
                  </span>
                </div>

                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="hidden sm:grid grid-cols-[minmax(0,1.4fr)_64px_88px_88px_32px] gap-1.5 px-2.5 py-1.5 bg-muted/50 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                    <span>รายละเอียด</span>
                    <span className="text-center">จำนวน</span>
                    <span className="text-right">ราคา/หน่วย</span>
                    <span className="text-right">รวม</span>
                    <span />
                  </div>

                  <div className="divide-y divide-border">
                    {items.map((it, idx) => {
                      const rowTotal = offerItemSubtotal(it);
                      return (
                        <div
                          key={it.id}
                          className="p-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-[minmax(0,1.4fr)_64px_88px_88px_32px] sm:gap-x-1.5 sm:gap-y-1.5 sm:items-center"
                        >
                          <p className="sm:hidden text-[10px] text-muted-foreground">
                            รายการที่ {idx + 1}
                          </p>
                          <Input
                            value={it.name}
                            onChange={(e) => updateItem(it.id, { name: e.target.value })}
                            placeholder="เช่น ออกแบบโลโก้"
                            maxLength={120}
                            className="h-8 text-sm font-medium min-w-0"
                          />
                          <Input
                            inputMode="numeric"
                            value={it.quantity || ""}
                            onChange={(e) =>
                              updateItem(it.id, {
                                quantity: Math.max(
                                  0,
                                  Number(e.target.value.replace(/[^\d]/g, "")) || 0,
                                ),
                              })
                            }
                            aria-label="จำนวน"
                            className="h-8 text-sm tabular-nums text-center"
                          />
                          <Input
                            inputMode="numeric"
                            value={it.unitPrice || ""}
                            onChange={(e) =>
                              updateItem(it.id, {
                                unitPrice: Math.max(
                                  0,
                                  Number(e.target.value.replace(/[^\d]/g, "")) || 0,
                                ),
                              })
                            }
                            placeholder="0"
                            aria-label="ราคาต่อหน่วย"
                            className="h-8 text-sm tabular-nums text-right"
                          />
                          <div className="flex h-8 items-center justify-between sm:justify-end">
                            <span className="sm:hidden text-[10px] text-muted-foreground">รวม</span>
                            <p className="text-sm font-semibold tabular-nums leading-none">
                              ฿{formatOfferBaht(rowTotal)}
                            </p>
                          </div>
                          <div className="flex h-8 items-center justify-end">
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-destructive p-1 disabled:opacity-30"
                              aria-label="ลบรายการ"
                              disabled={items.length <= 1}
                              onClick={() =>
                                setItems((prev) => prev.filter((x) => x.id !== it.id))
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <Input
                            value={it.description || ""}
                            onChange={(e) =>
                              updateItem(it.id, { description: e.target.value })
                            }
                            placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
                            maxLength={300}
                            className="h-8 text-xs text-muted-foreground min-w-0 sm:col-start-1"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-2 border-t border-border bg-muted/20">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full h-8 text-xs"
                      disabled={items.length >= 20}
                      onClick={() => setItems((prev) => [...prev, emptyOfferItem()])}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> เพิ่มรายการ
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>เงื่อนไขการชำระ</Label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {DEPOSIT_PRESETS.map((p) => (
                    <Button
                      key={p}
                      type="button"
                      size="sm"
                      variant={depositPercent === p ? "default" : "outline"}
                      className="rounded-full h-8 shrink-0"
                      onClick={() => applyDeposit(p)}
                    >
                      {p === 100 ? "จ่ายเต็ม" : `${p}%`}
                    </Button>
                  ))}
                  <span className="text-[12px] text-muted-foreground whitespace-nowrap pl-0.5">
                    หรือกำหนดเอง:
                  </span>
                  <Input
                    className={cn(
                      "h-8 w-14 shrink-0",
                      depositPercent !== 50 && depositPercent !== 100
                        ? "border-primary ring-1 ring-primary/30"
                        : "",
                    )}
                    inputMode="numeric"
                    value={customDeposit}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d]/g, "");
                      setCustomDeposit(v);
                      if (v) applyDeposit(Number(v));
                    }}
                    onFocus={() => {
                      if (customDeposit) applyDeposit(Number(customDeposit) || 50);
                    }}
                  />
                  <span className="text-[12px] text-muted-foreground">%</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setWhtEnabled((v) => !v)}
                className={cn(
                  "w-full flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors",
                  whtEnabled ? "border-primary/40 bg-primary/5" : "border-border",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 h-4 w-4 rounded-full border-2 shrink-0",
                    whtEnabled ? "border-primary bg-primary" : "border-muted-foreground/40",
                  )}
                />
                <span>
                  <span className="text-sm font-medium block">หัก ณ ที่จ่าย 3%</span>
                  <span className="text-[11px] text-muted-foreground">
                    แสดงในพรีวิวใบเสนอราคา (ปิดได้ถ้าไม่ต้องการ)
                  </span>
                </span>
              </button>
            </section>

            {/* Timeline */}
            <section className="rounded-2xl border border-border bg-card p-3.5 space-y-3">
              <div className="flex items-start gap-2">
                <CalendarRange className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">ไทม์ไลน์และงวดงาน</p>
                  <p className="text-[11px] text-muted-foreground">
                    วันที่เหล่านี้จะปรากฏบนใบเสนอราคา
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[12px] font-medium mb-1.5">วันที่โครงการ</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="offer-start">วันที่เริ่ม</Label>
                    <Input
                      id="offer-start"
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        const next = e.target.value;
                        setStartDate(next);
                        if (endDate && next && endDate < next) setEndDate("");
                        syncMilestoneDates(next, endDate && next && endDate < next ? "" : endDate);
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="offer-end">วันที่จบงาน</Label>
                    <Input
                      id="offer-end"
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      onChange={(e) => {
                        const next = e.target.value;
                        setEndDate(next);
                        syncMilestoneDates(startDate, next);
                      }}
                    />
                  </div>
                </div>
                {startDate && endDate && endDate < startDate ? (
                  <p className="text-[11px] text-destructive mt-1.5" role="alert">
                    วันจบงานต้องไม่อยู่ก่อนวันเริ่มงาน
                  </p>
                ) : null}
                <ChatOfferTimeline offer={previewOffer} className="mt-2" />
              </div>

              <div className="space-y-2">
                <p className="text-[12px] font-medium">งวดการชำระเงิน / ลำดับงาน</p>
                <div className="space-y-2.5">
                  {milestones.map((m, i) => (
                    <div key={m.id} className="flex gap-2 items-start">
                      <div className="pt-2.5">
                        <span
                          className={cn(
                            "block h-3 w-3 rounded-full border-2 border-primary",
                            i === 0 || i === milestones.length - 1 ? "bg-primary" : "bg-transparent",
                          )}
                        />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Input
                            value={m.label}
                            onChange={(e) =>
                              setMilestones((prev) =>
                                prev.map((x) =>
                                  x.id === m.id ? { ...x, label: e.target.value } : x,
                                ),
                              )
                            }
                            className="h-8 text-xs font-medium"
                            placeholder="ชื่องวด"
                            maxLength={80}
                          />
                          {milestones.length > 1 ? (
                            <button
                              type="button"
                              className="text-destructive p-1"
                              aria-label="ลบงวด"
                              onClick={() =>
                                setMilestones((prev) => prev.filter((x) => x.id !== m.id))
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                        <Input
                          type="date"
                          value={m.date || ""}
                          min={startDate || undefined}
                          onChange={(e) =>
                            setMilestones((prev) =>
                              prev.map((x) =>
                                x.id === m.id ? { ...x, date: e.target.value || null } : x,
                              ),
                            )
                          }
                          className="h-8 text-xs border-0 bg-transparent shadow-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {milestones.length < 6 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-xs"
                    onClick={() =>
                      setMilestones((prev) => [
                        ...prev,
                        { id: newMilestoneId(), label: "งวดใหม่", date: null },
                      ])
                    }
                  >
                    <Plus className="h-3 w-3 mr-1" /> เพิ่มงวด
                  </Button>
                ) : null}
              </div>
            </section>

            {/* Notes */}
            <section className="rounded-2xl border border-border bg-card p-3.5 space-y-3">
              <div className="flex items-start gap-2">
                <StickyNote className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">หมายเหตุ</p>
                  <p className="text-[11px] text-muted-foreground">
                    แยกหมายเหตุที่ลูกค้าเห็น กับโน้ตภายในของคุณ
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="offer-client-notes" className="inline-flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-primary" aria-hidden />
                  หมายเหตุฝั่งลูกค้า
                </Label>
                <p className="text-[11px] text-muted-foreground -mt-0.5">
                  แสดงบนใบเสนอราคาให้ลูกค้าอ่านได้
                </p>
                <Textarea
                  id="offer-client-notes"
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="เช่น รวมไฟล์ต้นฉบับ · ชำระมัดจำก่อนเริ่มงาน · แก้ไข 2 รอบ"
                  rows={3}
                  maxLength={800}
                  className="resize-none text-sm"
                />
              </div>
              <div className="space-y-1.5 rounded-xl border border-dashed border-border/80 bg-muted/20 p-3">
                <Label htmlFor="offer-internal-notes" className="inline-flex items-center gap-1.5">
                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  หมายเหตุฝั่งเรา (ภายใน)
                </Label>
                <p className="text-[11px] text-muted-foreground -mt-0.5">
                  เห็นเฉพาะคุณตอนเปิดดูข้อเสนอที่ส่งแล้ว — ไม่โชว์บนใบเสนอราคา
                </p>
                <Textarea
                  id="offer-internal-notes"
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="เช่น ต้นทุนจริง · คุยส่วนลดไว้ · ติดตามมัดจำวันไหน"
                  rows={3}
                  maxLength={800}
                  className="resize-none text-sm bg-background"
                />
              </div>
            </section>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => openPreview("view")}>
            <Eye className="w-4 h-4 mr-1.5" />
            ดูพรีวิว
          </Button>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Button type="button" variant="ghost" onClick={() => handleOpen(false)}>
              ยกเลิก
            </Button>
            <Button type="button" onClick={() => openPreview("confirm")} disabled={send.isPending}>
              ส่งข้อเสนอ
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
      <DialogContent className="sm:max-w-6xl max-h-[92vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>
            {previewMode === "confirm" ? "เช็คพรีวิวก่อนส่ง" : "พรีวิวใบเสนอราคา"}
          </DialogTitle>
          <DialogDescription>
            {previewMode === "confirm"
              ? "ตรวจรายละเอียดให้ครบ แล้วกดยืนยันเพื่อส่งให้ลูกค้าในแชท"
              : "เอกสารที่จะส่งให้ลูกค้าในแชท"}
          </DialogDescription>
        </DialogHeader>
        <div className="mx-auto w-full max-w-2xl space-y-3">
          <ChatOfferPreview
            offer={previewOffer}
            issuerName={issuerName}
            issuerEmail={issuerEmail}
          />
          {internalNotes.trim() ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3 space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground inline-flex items-center gap-1.5">
                <EyeOff className="h-3.5 w-3.5" aria-hidden />
                หมายเหตุภายใน (ไม่โชว์ลูกค้า)
              </p>
              <p className="text-sm whitespace-pre-wrap">{internalNotes.trim()}</p>
            </div>
          ) : null}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {previewMode === "confirm" ? (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPreviewOpen(false)}
                disabled={send.isPending}
              >
                กลับไปแก้
              </Button>
              <Button type="button" onClick={() => void confirmSend()} disabled={send.isPending}>
                {send.isPending ? "กำลังส่ง..." : "ยืนยันส่งข้อเสนอ"}
              </Button>
            </>
          ) : (
            <Button type="button" variant="secondary" onClick={() => setPreviewOpen(false)}>
              ปิด
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
