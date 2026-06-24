import * as React from "react";
import type { Quotation } from "@/store/quotations";
import { useClients, type SavedClient } from "@/store/clients";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Briefcase,
  Hash,
  User,
  AlertTriangle,
  Wallet,
  Coins,
  ChevronDown,
  Plus,
  UserPlus,
  Repeat,
  FileSignature,
  ExternalLink,
  X as XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AttachBriefDialog, type BriefSummary } from "./AttachBriefDialog";
import { supabase } from "@/integrations/supabase/client";
import { mergeFieldClass } from "@/lib/formFieldStyles";

interface Props {
  q: Quotation;
  patch: (p: Partial<Quotation>) => void;
  sections?: Array<"project" | "brief" | "client" | "modifiers" | "payment" | "due">;
}

const PAYMENT_TERMS = [
  "ชำระมัดจำก่อนเริ่มงาน",
  "ชำระเต็มจำนวนก่อนเริ่มงาน",
  "ชำระตามไมล์สโตน",
  "ชำระเมื่อส่งมอบงาน",
];

export function SettingsPanel({ q, patch, sections }: Props) {
  const show = (key: NonNullable<Props["sections"]>[number]) => !sections || sections.includes(key);
  const { list: clients, add: addClient } = useClients();
  const hasLateFeeData = !!(q.dueDate || (q.lateFeePercent ?? 0) > 0);
  const [lateFeeFieldsOpen, setLateFeeFieldsOpen] = React.useState(hasLateFeeData);

  React.useEffect(() => {
    setLateFeeFieldsOpen(!!(q.dueDate || (q.lateFeePercent ?? 0) > 0));
  }, [q.id]);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [draftClient, setDraftClient] = React.useState<Omit<SavedClient, "id" | "createdAt">>({
    name: "",
    phone: "",
    lineId: "",
    email: "",
    address: "",
    taxId: "",
  });
  const [mode, setMode] = React.useState<"select" | "new">("select");
  const [briefDialogOpen, setBriefDialogOpen] = React.useState(false);
  const [attachedBrief, setAttachedBrief] = React.useState<{
    title: string;
    status: string;
    share_token: string;
  } | null>(null);
  const [savingClient, setSavingClient] = React.useState(false);

  // Fetch attached brief summary whenever briefId changes
  React.useEffect(() => {
    if (!q.briefId) {
      setAttachedBrief(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("design_briefs")
      .select("title,status,share_token")
      .eq("id", q.briefId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setAttachedBrief(
          data ? { title: data.title, status: data.status, share_token: data.share_token } : null,
        );
      });
    return () => {
      cancelled = true;
    };
  }, [q.briefId]);

  function setField<K extends keyof Quotation>(k: K, v: Quotation[K]) {
    patch({ [k]: v } as Partial<Quotation>);
  }

  function handlePickBrief(brief: BriefSummary) {
    const ci = (brief.client_info ?? {}) as Record<string, string | undefined>;
    // Support both legacy (name/phone/email) and new Smart Brief schema
    // (client_name/contact_phone/contact_email/contact_line/brand_name).
    const pick = (...keys: string[]) => {
      for (const k of keys) {
        const v = ci[k];
        if (v && v.trim()) return v;
      }
      return undefined;
    };
    const next: Partial<Quotation> = { briefId: brief.id };
    if (!q.projectName?.trim() && brief.title) next.projectName = brief.title;
    const cname = pick("client_name", "name");
    if (!q.clientName?.trim() && cname) next.clientName = cname;
    const cphone = pick("contact_phone", "phone");
    if (!q.clientPhone?.trim() && cphone) next.clientPhone = cphone;
    const cemail = pick("contact_email", "email");
    if (!q.clientEmail?.trim() && cemail) next.clientEmail = cemail;
    const cline = pick("contact_line", "line_id");
    if (!q.clientLineId?.trim() && cline) next.clientLineId = cline;
    const caddr = pick("address");
    if (!q.clientAddress?.trim() && caddr) next.clientAddress = caddr;
    const ctax = pick("tax_id");
    if (!q.clientTaxId?.trim() && ctax) next.clientTaxId = ctax;
    patch(next);
    toast.success("ผูกบรีฟแล้ว — ดึงข้อมูลลูกค้า/ชื่อโปรเจกต์ที่ยังว่างอัตโนมัติ");
  }

  function handleUnlinkBrief() {
    patch({ briefId: undefined });
    toast.info("ยกเลิกการผูกบรีฟแล้ว");
  }

  function applyClient(c: SavedClient) {
    patch({
      clientName: c.name,
      clientPhone: c.phone ?? "",
      clientLineId: c.lineId ?? "",
      clientEmail: c.email ?? "",
      clientAddress: c.address ?? "",
      clientTaxId: c.taxId ?? "",
    });
    setPickerOpen(false);
    toast.success(`เลือกลูกค้า: ${c.name}`);
  }

  function clearClient() {
    patch({
      clientName: "",
      clientPhone: "",
      clientLineId: "",
      clientEmail: "",
      clientAddress: "",
      clientTaxId: "",
    });
    toast.info("ล้างข้อมูลลูกค้าแล้ว");
  }

  async function saveNewClient() {
    if (savingClient) return;
    if (!draftClient.name.trim()) {
      toast.error("กรุณาระบุชื่อลูกค้า");
      return;
    }
    setSavingClient(true);
    try {
      const c = await addClient({ ...draftClient, name: draftClient.name.trim() });
      applyClient(c);
      setDraftClient({ name: "", phone: "", lineId: "", email: "", address: "", taxId: "" });
      setMode("select");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSavingClient(false);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      {/* Project */}
      {show("project") && (
        <Section icon={<Briefcase className="h-3.5 w-3.5" />} title="โครงการ">
          <Field label="ชื่อโครงการ" required>
            <Input
              value={q.projectName}
              onChange={(e) => setField("projectName", e.target.value)}
              maxLength={120}
              className={mergeFieldClass("", q.projectName)}
            />
          </Field>
          <Field
            label={
              <>
                <Hash className="h-3 w-3 inline" /> เลขที่ใบเสนอราคา (อัตโนมัติ)
              </>
            }
          >
            <Input value={q.number} readOnly className="bg-muted/50 cursor-not-allowed num" />
          </Field>
        </Section>
      )}

      {/* Design Brief link */}
      {show("brief") && (
        <Section icon={<FileSignature className="h-3.5 w-3.5" />} title="Design Brief">
          {q.briefId && attachedBrief ? (
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-2.5 space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {attachedBrief.title || "ไม่มีชื่อ"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    สถานะ: {attachedBrief.status}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleUnlinkBrief}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  title="ยกเลิกการผูก"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs gap-1.5"
                  onClick={() => window.open(`/brief/${attachedBrief.share_token}`, "_blank")}
                >
                  <ExternalLink className="h-3 w-3" /> เปิดบรีฟ
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => setBriefDialogOpen(true)}
                >
                  เปลี่ยนบรีฟ
                </Button>
              </div>
            </div>
          ) : q.briefId && !attachedBrief ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-2.5 space-y-1.5">
              <p className="text-xs text-destructive">บรีฟที่ผูกไว้ถูกลบหรือไม่พบ</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs w-full"
                onClick={handleUnlinkBrief}
              >
                ลบลิงก์
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs gap-1.5"
              onClick={() => setBriefDialogOpen(true)}
            >
              <FileSignature className="h-3.5 w-3.5" /> แนบ Design Brief
            </Button>
          )}
          <p className="text-[10px] text-muted-foreground">
            ผูกใบเสนอราคานี้กับบรีฟใน Smart Brief เพื่ออ้างอิงและซิงค์ข้อมูลลูกค้าอัตโนมัติ
          </p>
        </Section>
      )}

      {/* Client picker */}
      {show("client") &&
        (sections?.length === 1 && sections[0] === "client" ? (
          <Section icon={<User className="h-3.5 w-3.5" />} title="ลูกค้า">
            <div className="rounded-xl border border-border/60 p-2.5 space-y-1 bg-muted/20">
              {q.clientName ? (
                <>
                  <p className="text-sm font-medium leading-tight">{q.clientName}</p>
                  {q.clientAddress && (
                    <p className="text-[11px] text-muted-foreground leading-snug whitespace-pre-line">
                      {q.clientAddress}
                    </p>
                  )}
                  <div className="text-[11px] text-muted-foreground space-y-0.5 pt-0.5">
                    {q.clientPhone && <p>📞 {q.clientPhone}</p>}
                    {q.clientLineId && <p>LINE: {q.clientLineId}</p>}
                    {q.clientEmail && <p className="truncate">✉ {q.clientEmail}</p>}
                    {q.clientTaxId && <p className="num">เลขผู้เสียภาษี {q.clientTaxId}</p>}
                  </div>
                  {!q.clientAddress && !q.clientTaxId && (
                    <p className="text-[10px] text-warning-foreground/80 pt-1">
                      ⚠ ยังไม่มีที่อยู่/เลขผู้เสียภาษี — เพิ่มเพื่อให้ใบเสนอราคาครบถ้วน
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground italic">ยังไม่ได้เลือกลูกค้า</p>
              )}
            </div>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs gap-1.5"
                onClick={() => {
                  setMode(clients.length > 0 ? "select" : "new");
                  setPickerOpen(true);
                }}
              >
                <UserPlus className="h-3.5 w-3.5" />
                {q.clientName ? "เปลี่ยน / เพิ่มลูกค้า" : "เลือกหรือเพิ่มลูกค้า"}
              </Button>
              {q.clientName && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
                  onClick={clearClient}
                  title="ล้างการเลือกลูกค้า"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </Section>
        ) : (
          <CollapsibleSection icon={<User className="h-3.5 w-3.5" />} title="ลูกค้า" defaultOpen>
            <div className="rounded-xl border border-border/60 p-2.5 space-y-1 bg-muted/20">
              {q.clientName ? (
                <>
                  <p className="text-sm font-medium leading-tight">{q.clientName}</p>
                  {q.clientAddress && (
                    <p className="text-[11px] text-muted-foreground leading-snug whitespace-pre-line">
                      {q.clientAddress}
                    </p>
                  )}
                  <div className="text-[11px] text-muted-foreground space-y-0.5 pt-0.5">
                    {q.clientPhone && <p>📞 {q.clientPhone}</p>}
                    {q.clientLineId && <p>LINE: {q.clientLineId}</p>}
                    {q.clientEmail && <p className="truncate">✉ {q.clientEmail}</p>}
                    {q.clientTaxId && <p className="num">เลขผู้เสียภาษี {q.clientTaxId}</p>}
                  </div>
                  {!q.clientAddress && !q.clientTaxId && (
                    <p className="text-[10px] text-warning-foreground/80 pt-1">
                      ⚠ ยังไม่มีที่อยู่/เลขผู้เสียภาษี — เพิ่มเพื่อให้ใบเสนอราคาครบถ้วน
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground italic">ยังไม่ได้เลือกลูกค้า</p>
              )}
            </div>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs gap-1.5"
                onClick={() => {
                  setMode(clients.length > 0 ? "select" : "new");
                  setPickerOpen(true);
                }}
              >
                <UserPlus className="h-3.5 w-3.5" />
                {q.clientName ? "เปลี่ยน / เพิ่มลูกค้า" : "เลือกหรือเพิ่มลูกค้า"}
              </Button>
              {q.clientName && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
                  onClick={clearClient}
                  title="ล้างการเลือกลูกค้า"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </CollapsibleSection>
        ))}

      {/* Difficulty (locked labels) */}
      {show("modifiers") && (
        <CollapsibleSection
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          title="ความยากของลูกค้า"
        >
          <p className="text-[10px] text-muted-foreground -mt-1">เลือกใช้และปรับ % ได้</p>
          {q.difficulties.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-2 rounded-lg border border-border/40 px-2 py-1.5"
            >
              <Checkbox
                checked={d.enabled}
                onCheckedChange={(v) =>
                  patch({
                    difficulties: q.difficulties.map((x) =>
                      x.id === d.id ? { ...x, enabled: !!v } : x,
                    ),
                  })
                }
              />
              <span className="text-xs flex-1 leading-tight">{d.label}</span>
              <span className="text-xs text-muted-foreground">+</span>
              <Input
                type="number"
                value={d.percent}
                onChange={(e) =>
                  patch({
                    difficulties: q.difficulties.map((x) =>
                      x.id === d.id ? { ...x, percent: Number(e.target.value) || 0 } : x,
                    ),
                  })
                }
                className="h-7 text-xs w-14 num"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          ))}
        </CollapsibleSection>
      )}

      {/* Add-ons (locked labels) */}
      {show("modifiers") && (
        <Section icon={<Plus className="h-3.5 w-3.5" />} title="เพิ่มเติม">
          <p className="text-[10px] text-muted-foreground -mt-1">เลือกใช้และปรับ % ได้</p>
          {q.addons.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 rounded-lg border border-border/40 px-2 py-1.5"
            >
              <Checkbox
                checked={a.enabled}
                onCheckedChange={(v) =>
                  patch({
                    addons: q.addons.map((x) => (x.id === a.id ? { ...x, enabled: !!v } : x)),
                  })
                }
              />
              <span className="text-xs flex-1 leading-tight">{a.label}</span>
              <span className="text-xs text-muted-foreground">+</span>
              <Input
                type="number"
                value={a.percent}
                onChange={(e) =>
                  patch({
                    addons: q.addons.map((x) =>
                      x.id === a.id ? { ...x, percent: Number(e.target.value) || 0 } : x,
                    ),
                  })
                }
                className="h-7 text-xs w-14 num"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          ))}
        </Section>
      )}

      {/* Hidden cost + Revisions */}
      {show("modifiers") && (
        <Section icon={<Coins className="h-3.5 w-3.5" />} title="ต้นทุนแฝง & แก้ไขฟรี">
          <Field label="ค่าต้นทุนแฝงอื่น ๆ (฿)">
            <Input
              type="number"
              value={q.hiddenCost || ""}
              onChange={(e) => setField("hiddenCost", Number(e.target.value) || 0)}
              className="num"
              placeholder="0"
            />
          </Field>
          <Field
            label={
              <>
                <Repeat className="h-3 w-3 inline" /> จำนวนแก้ไขงานฟรี (ครั้ง)
              </>
            }
          >
            <Input
              type="number"
              min={0}
              max={20}
              value={q.revisionsCount}
              onChange={(e) => setField("revisionsCount", Math.max(0, Number(e.target.value) || 0))}
              className="num"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              ระบบจะเพิ่มจุดส่งแก้ไขในไทม์ไลน์อัตโนมัติ ระหว่างวันเริ่มถึงวันจบงาน
            </p>
          </Field>
        </Section>
      )}

      {/* Payment terms */}
      {show("payment") && (
        <Section icon={<Wallet className="h-3.5 w-3.5" />} title="เงื่อนไขการชำระ">
          <div className="grid grid-cols-4 gap-1.5">
            {[30, 50, 70, 100].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setField("depositPreset", p as Quotation["depositPreset"])}
                className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-all ${
                  q.depositPreset === p
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/40"
                }`}
              >
                {p === 100 ? "จ่ายเต็ม" : `${p}%`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[11px] text-muted-foreground whitespace-nowrap">
              หรือกำหนดเอง:
            </Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={q.depositPreset}
              onChange={(e) => {
                const raw = Number(e.target.value);
                const clamped = Math.max(0, Math.min(100, Number.isFinite(raw) ? raw : 0));
                setField("depositPreset", clamped as Quotation["depositPreset"]);
              }}
              className="h-8 w-20 text-xs num"
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            มัดจำที่จะเรียกเก็บ: {q.depositPreset}% ของยอดรวมสุทธิ
          </p>
          <Select value={q.paymentTerms} onValueChange={(v) => setField("paymentTerms", v)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_TERMS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {q.paymentTerms === "ชำระมัดจำก่อนเริ่มงาน" && (
            <Field label="วันครบกำหนดชำระมัดจำ (ก่อนเริ่มงาน)">
              <Input
                type="date"
                value={q.depositDueDate ?? ""}
                max={q.startDate || undefined}
                onChange={(e) => setField("depositDueDate", e.target.value || undefined)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                ระบุวันที่ลูกค้าต้องจ่ายมัดจำก่อนวันเริ่มโปรเจกต์
                {q.startDate ? ` (ต้องไม่เกิน ${q.startDate})` : ""}
              </p>
              {q.depositDueDate && q.startDate && q.depositDueDate > q.startDate && (
                <p className="text-[11px] text-destructive mt-1" role="alert">
                  วันชำระมัดจำต้องไม่เกินวันเริ่มงาน
                </p>
              )}
            </Field>
          )}
        </Section>
      )}

      {/* Due date & late fee */}
      {show("due") && (
        <Section icon={<AlertTriangle className="h-3.5 w-3.5" />} title="กำหนดชำระ & ค่าปรับ">
          <label className="flex items-start gap-2.5 rounded-lg border border-border/50 px-3 py-2.5 cursor-pointer">
            <Checkbox
              checked={lateFeeFieldsOpen}
              onCheckedChange={(v) => {
                const enabled = v === true;
                setLateFeeFieldsOpen(enabled);
                if (!enabled) patch({ dueDate: undefined, lateFeePercent: 0 });
              }}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">ต้องการให้มีค่าปรับเมื่อเกินกำหนดชำระ</p>
              <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                ตั้งวันครบกำหนดและ % ค่าปรับเมื่อเกินกำหนด
              </p>
            </div>
          </label>
          {lateFeeFieldsOpen && (
            <>
              <Field label="วันครบกำหนดชำระ">
                <Input
                  type="date"
                  value={q.dueDate ?? ""}
                  onChange={(e) => setField("dueDate", e.target.value || undefined)}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  ใช้คำนวณ "เกินกำหนด" และเปิดใช้ปุ่มทวงเงินใน Dashboard
                </p>
              </Field>
              <Field label="ค่าปรับเมื่อเกินกำหนด (% ของยอดรวม)">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={q.lateFeePercent || ""}
                  onChange={(e) => setField("lateFeePercent", Number(e.target.value) || 0)}
                  placeholder="0"
                  className="num"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  เช่น 1.5% ต่อเดือน — ระบบจะรวมค่าปรับเข้าในยอดทวงอัตโนมัติ
                </p>
              </Field>
            </>
          )}
        </Section>
      )}

      {/* Brief picker dialog */}
      <AttachBriefDialog
        open={briefDialogOpen}
        onOpenChange={setBriefDialogOpen}
        onPick={handlePickBrief}
        currentBriefId={q.briefId}
      />

      {/* Client picker dialog */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{mode === "select" ? "เลือกลูกค้า" : "เพิ่มลูกค้าใหม่"}</DialogTitle>
          </DialogHeader>

          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setMode("select")}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${
                mode === "select" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              ลูกค้าที่บันทึกไว้ ({clients.length})
            </button>
            <button
              type="button"
              onClick={() => setMode("new")}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${
                mode === "new" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              เพิ่มใหม่
            </button>
          </div>

          {mode === "select" ? (
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
              {clients.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  ยังไม่มีลูกค้าที่บันทึก — กด "เพิ่มใหม่" เพื่อเริ่มต้น
                </p>
              ) : (
                clients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => applyClient(c)}
                    className="w-full text-left rounded-lg border border-border/60 hover:border-primary/60 hover:bg-primary/5 transition-all p-2.5 space-y-1"
                  >
                    <p className="text-sm font-medium leading-tight">{c.name}</p>
                    {c.address && (
                      <p className="text-[11px] text-muted-foreground leading-snug whitespace-pre-line line-clamp-2">
                        {c.address}
                      </p>
                    )}
                    <div className="text-[11px] text-muted-foreground flex items-center gap-x-3 gap-y-0.5 flex-wrap">
                      {c.phone && <span>📞 {c.phone}</span>}
                      {c.lineId && <span>LINE: {c.lineId}</span>}
                      {c.email && <span className="truncate max-w-[160px]">✉ {c.email}</span>}
                    </div>
                    {c.taxId && (
                      <p className="text-[10px] text-muted-foreground num">
                        เลขผู้เสียภาษี {c.taxId}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              <Field label="ชื่อลูกค้า *">
                <Input
                  value={draftClient.name}
                  onChange={(e) => setDraftClient((d) => ({ ...d, name: e.target.value }))}
                  maxLength={80}
                  autoFocus
                />
              </Field>
              <Field label="เบอร์โทร">
                <Input
                  value={draftClient.phone}
                  onChange={(e) => setDraftClient((d) => ({ ...d, phone: e.target.value }))}
                  maxLength={30}
                />
              </Field>
              <Field label="Line ID">
                <Input
                  value={draftClient.lineId}
                  onChange={(e) => setDraftClient((d) => ({ ...d, lineId: e.target.value }))}
                  maxLength={50}
                />
              </Field>
              <Field label="Email">
                <Input
                  value={draftClient.email}
                  onChange={(e) => setDraftClient((d) => ({ ...d, email: e.target.value }))}
                  maxLength={120}
                />
              </Field>
              <Field label="ที่อยู่">
                <Textarea
                  rows={2}
                  value={draftClient.address}
                  onChange={(e) => setDraftClient((d) => ({ ...d, address: e.target.value }))}
                  maxLength={300}
                />
              </Field>
              <Field label="เลขประจำตัว/นิติบุคคล">
                <Input
                  value={draftClient.taxId}
                  onChange={(e) => setDraftClient((d) => ({ ...d, taxId: e.target.value }))}
                  maxLength={30}
                />
              </Field>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPickerOpen(false)}>
              ยกเลิก
            </Button>
            {mode === "new" && (
              <Button
                onClick={saveNewClient}
                disabled={savingClient}
                className="bg-primary hover:bg-primary/90"
              >
                {savingClient ? "กำลังบันทึก…" : "บันทึก & เลือก"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CollapsibleSection({
  icon,
  title,
  children,
  defaultOpen = false,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-xl border border-border/50 overflow-hidden"
    >
      <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors">
        <h3 className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
          <span className="text-primary">{icon}</span>
          {title}
        </h3>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
        <div className="px-3 pb-3 pt-2 space-y-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <div className="px-3 py-2 bg-muted/30 border-b border-border/40">
        <h3 className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
          <span className="text-primary">{icon}</span>
          {title}
        </h3>
      </div>
      <div className="px-3 py-3 space-y-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label
        className={`text-[11px] text-muted-foreground ${required ? "after:content-['*'] after:text-destructive after:ml-0.5" : ""}`}
      >
        {label}
      </Label>
      {children}
    </div>
  );
}
