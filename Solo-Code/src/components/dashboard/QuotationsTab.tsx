import * as React from "react";
import {
  useQuotations,
  computeTotals,
  type Quotation,
  type QuotationStatus,
  type DocKind,
} from "@/store/quotations";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { sendTransactionalEmail } from "@/lib/email/send";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search } from "lucide-react";
import { QuotationEditor } from "./quotations/QuotationEditor";
import { toast } from "sonner";
import { DOC_TYPES, belongsTo } from "./quotations/docTypes";
import { DocSidebar } from "./quotations/DocSidebar";
import { EmptyState } from "./quotations/DocListShared";
import { DocList } from "./quotations/DocList";
import { BulkActionBar } from "./quotations/BulkActionBar";
import { QuotationMockupDialog } from "./quotations/QuotationMockupDialog";
import { celebrateFromEdges } from "@/lib/celebrate";
import { PageFooterActions } from "./PageFooterActions";
import {
  ANTHEM_HANDOFF_EVENT,
  STUDIO_HANDOFF_EVENT,
  consumeAnthemQuotationHandoff,
  consumeStudioQuotationHandoff,
} from "@/lib/ecosystemHandoff";
import type { IssuerSnapshot } from "@/lib/quotationKinds";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/auth/AuthProvider";
import type { DocumentThemeInput } from "@/lib/documentTheme";
import { canUseStudioQuote } from "@/lib/inhouseAccess";
import { ensureSavedClient } from "@/lib/ensureSavedClient";

export function QuotationsTab() {
  const { list, create, remove, duplicate, advanceStatus, update } = useQuotations();
  const { tier } = useSubscription();
  const { profile, user } = useAuth();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | QuotationStatus>("all");
  const [docType, setDocType] = React.useState<DocKind>("quotation");
  const [confirmDel, setConfirmDel] = React.useState<{ id: string; num: string } | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [confirmBulkDel, setConfirmBulkDel] = React.useState(false);
  const [mockupId, setMockupId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  // Hand-off from Smart Brief → auto-create OR refresh existing linked quotation.
  // Wait until `list` is loaded (so we can detect a pre-existing quotation tied to the brief).
  const handoffConsumedRef = React.useRef(false);
  const anthemHandoffConsumedRef = React.useRef(false);
  const studioHandoffConsumedRef = React.useRef(false);
  const [anthemHandoffVersion, setAnthemHandoffVersion] = React.useState(0);
  const [studioHandoffVersion, setStudioHandoffVersion] = React.useState(0);
  const [studioUpgradeOpen, setStudioUpgradeOpen] = React.useState(false);
  const openIdConsumedRef = React.useRef(false);
  const listLoaded = React.useRef(false);

  React.useEffect(() => {
    if (!editingId) return;
    try {
      sessionStorage.setItem("so1o.editingQuotationId", editingId);
    } catch {
      /* noop */
    }
  }, [editingId]);

  React.useEffect(() => {
    if (editingId) return;
    try {
      const saved = sessionStorage.getItem("so1o.editingQuotationId");
      if (saved && list.some((q) => q.id === saved)) {
        setEditingId(saved);
      }
    } catch {
      /* noop */
    }
  }, [editingId, list]);

  React.useEffect(() => {
    if (openIdConsumedRef.current) return;
    let id: string | null = null;
    try {
      id = sessionStorage.getItem("so1o.openQuotationId");
    } catch {
      /* noop */
    }
    if (!id) return;
    const found = list.find((q) => q.id === id);
    if (!found && list.length === 0) return;
    openIdConsumedRef.current = true;
    try {
      sessionStorage.removeItem("so1o.openQuotationId");
    } catch {
      /* noop */
    }
    if (found) setEditingId(id);
  }, [list]);

  React.useEffect(() => {
    const onHandoff = () => {
      anthemHandoffConsumedRef.current = false;
      setAnthemHandoffVersion((v) => v + 1);
    };
    const onStudio = () => {
      studioHandoffConsumedRef.current = false;
      setStudioHandoffVersion((v) => v + 1);
    };
    window.addEventListener(ANTHEM_HANDOFF_EVENT, onHandoff);
    window.addEventListener(STUDIO_HANDOFF_EVENT, onStudio);
    return () => {
      window.removeEventListener(ANTHEM_HANDOFF_EVENT, onHandoff);
      window.removeEventListener(STUDIO_HANDOFF_EVENT, onStudio);
    };
  }, []);

  React.useEffect(() => {
    if (anthemHandoffConsumedRef.current) return;
    if (!listLoaded.current && list.length === 0) {
      const t = setTimeout(() => {
        listLoaded.current = true;
      }, 400);
      return () => clearTimeout(t);
    }
    listLoaded.current = true;
    const anthemInit = consumeAnthemQuotationHandoff();
    if (!anthemInit) return;
    anthemHandoffConsumedRef.current = true;

    const syncClient = async () => {
      if (!user?.id) return;
      const saved = await ensureSavedClient({
        userId: user.id,
        name: anthemInit.clientName,
        email: anthemInit.clientEmail,
        phone: anthemInit.clientPhone,
        sourceNote: anthemInit.requestId
          ? `จาก Pixel100 (request ${anthemInit.requestId})`
          : "จาก Pixel100 handoff",
      });
      if (saved?.created) {
        toast.success("เพิ่มลูกค้าใน CRM จากงาน Pixel100 แล้ว");
      }
    };

    const requestId = anthemInit.requestId;
    const existing = requestId
      ? list.find((q) => q.notes?.includes(`anthem_request:${requestId}`))
      : undefined;

    const noteBlock = [
      anthemInit.notes,
      anthemInit.conversationId ? `แชท Pixel100: ${anthemInit.conversationId}` : "",
      requestId ? `anthem_request:${requestId}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    if (existing) {
      void syncClient();
      update(existing.id, {
        projectName: anthemInit.projectName || existing.projectName,
        clientName: anthemInit.clientName || existing.clientName,
        clientEmail: anthemInit.clientEmail || existing.clientEmail,
        clientPhone: anthemInit.clientPhone || existing.clientPhone,
        endDate: anthemInit.endDate || existing.endDate,
        notes: noteBlock || existing.notes,
      })
        .then(() => {
          setEditingId(existing.id);
          toast.success(`เปิดใบเสนอราคา ${existing.number} จากงาน Pixel100`);
        })
        .catch((e) => toast.error(e instanceof Error ? e.message : "อัปเดตไม่สำเร็จ"));
      return;
    }

    void syncClient();
    create({
      projectName: anthemInit.projectName,
      clientName: anthemInit.clientName,
      clientEmail: anthemInit.clientEmail,
      clientPhone: anthemInit.clientPhone,
      endDate: anthemInit.endDate,
      notes: noteBlock,
    })
      .then((q) => {
        if (q?.id) {
          setEditingId(q.id);
          toast.success("สร้างใบเสนอราคาจากงาน Pixel100 แล้ว — กรอกราคาให้ครบได้เลย");
        }
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "สร้างไม่สำเร็จ"));
  }, [create, update, list, anthemHandoffVersion, user?.id]);

  React.useEffect(() => {
    if (studioHandoffConsumedRef.current) return;
    if (!listLoaded.current && list.length === 0) {
      const t = setTimeout(() => {
        listLoaded.current = true;
      }, 400);
      return () => clearTimeout(t);
    }
    listLoaded.current = true;
    const studioInit = consumeStudioQuotationHandoff();
    if (!studioInit) return;
    studioHandoffConsumedRef.current = true;

    if (!canUseStudioQuote(tier)) {
      setStudioUpgradeOpen(true);
      return;
    }

    const requestId = studioInit.requestId;
    const existing = requestId
      ? list.find((q) => q.notes?.includes(`studio_request:${requestId}`))
      : undefined;

    const ownerTheme = (profile?.document_theme ?? null) as DocumentThemeInput | null;
    const studioSnapshot: IssuerSnapshot = {
      brandName: studioInit.studioName,
      logoUrl: studioInit.studioLogoUrl ?? null,
      documentTheme: ownerTheme,
    };

    const noteBlock = [
      studioInit.notes,
      studioInit.conversationId ? `แชท Studio: ${studioInit.conversationId}` : "",
      requestId ? `studio_request:${requestId}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const afterCreate = async (q: Quotation) => {
      if (studioInit.members?.length) {
        const rows = studioInit.members.map((m, i) => ({
          quotation_id: q.id,
          user_id: m.userId ?? null,
          display_name: m.displayName,
          role: i === 0 ? "lead" : "member",
          revenue_percent: m.revenuePercent ?? null,
          sort_order: i,
        }));
        await supabase.from("quotation_collaborators").insert(rows);
      }
      setEditingId(q.id);
      toast.success("สร้างใบเสนอราคารวม Studio แล้ว");
    };

    if (existing) {
      update(existing.id, {
        projectName: studioInit.projectName || existing.projectName,
        clientName: studioInit.clientName || existing.clientName,
        clientEmail: studioInit.clientEmail || existing.clientEmail,
        clientPhone: studioInit.clientPhone || existing.clientPhone,
        endDate: studioInit.endDate || existing.endDate,
        notes: noteBlock || existing.notes,
        quotationKind: "studio",
        studioId: studioInit.studioId,
        studioSnapshot,
      })
        .then(() => {
          setEditingId(existing.id);
          toast.success(`เปิดใบเสนอราคา Studio ${existing.number}`);
        })
        .catch((e) => toast.error(e instanceof Error ? e.message : "อัปเดตไม่สำเร็จ"));
      return;
    }

    create({
      projectName: studioInit.projectName,
      clientName: studioInit.clientName,
      clientEmail: studioInit.clientEmail,
      clientPhone: studioInit.clientPhone,
      endDate: studioInit.endDate,
      notes: noteBlock,
      quotationKind: "studio",
      studioId: studioInit.studioId,
      studioSnapshot,
    })
      .then((q) => {
        if (q) void afterCreate(q);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "สร้างไม่สำเร็จ"));
  }, [create, update, list, studioHandoffVersion, tier, profile?.document_theme]);

  React.useEffect(() => {
    // Only run once the list query has resolved (even if empty)
    if (handoffConsumedRef.current) return;
    if (!listLoaded.current && list.length === 0) {
      // Give the query one tick to load; if still empty after a short delay, proceed
      const t = setTimeout(() => {
        listLoaded.current = true;
      }, 400);
      return () => clearTimeout(t);
    }
    listLoaded.current = true;
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem("so1o.openQuotationFromBrief");
    } catch {
      /* noop */
    }
    if (!raw) return;
    handoffConsumedRef.current = true;
    try {
      sessionStorage.removeItem("so1o.openQuotationFromBrief");
    } catch {
      /* noop */
    }
    let init: Partial<Quotation> & { items?: Quotation["items"]; briefId?: string } = {};
    try {
      init = JSON.parse(raw);
    } catch {
      return;
    }

    const briefId = init.briefId;
    const newItems = (init.items ?? []).map((it) => ({
      id: Math.random().toString(36).slice(2, 10),
      name: it.name ?? "รายการ",
      description: it.description,
      unitPrice: Number(it.unitPrice) || 0,
      quantity: Number(it.quantity) > 0 ? Number(it.quantity) : 1,
    }));

    // Find an existing quotation linked to this brief
    const existing = briefId ? list.find((q) => q.briefId === briefId) : undefined;

    if (existing) {
      // Merge fresh client/timeline info without clobbering user-entered prices
      const existingNamesLower = new Set(existing.items.map((i) => i.name.trim().toLowerCase()));
      const itemsToAdd = newItems.filter(
        (i) => !existingNamesLower.has(i.name.trim().toLowerCase()),
      );
      const mergedPatch: Partial<Quotation> = {
        projectName: init.projectName || existing.projectName,
        clientName: init.clientName || existing.clientName,
        clientPhone: init.clientPhone || existing.clientPhone,
        clientEmail: init.clientEmail || existing.clientEmail,
        clientLineId: init.clientLineId || existing.clientLineId,
        startDate: init.startDate || existing.startDate,
        endDate: init.endDate || existing.endDate,
        revisionsCount:
          typeof init.revisionsCount === "number" ? init.revisionsCount : existing.revisionsCount,
        notes: init.notes
          ? `${existing.notes ? existing.notes + "\n\n" : ""}--- อัปเดตจากบรีฟ ---\n${init.notes}`
          : existing.notes,
        items: itemsToAdd.length ? [...existing.items, ...itemsToAdd] : existing.items,
      };
      update(existing.id, mergedPatch)
        .then(() => {
          setEditingId(existing.id);
          toast.success(
            existing.status === "draft"
              ? `อัปเดตใบเสนอราคา ${existing.number} จากบรีฟล่าสุดแล้ว`
              : `เปิดใบเสนอราคา ${existing.number} ที่ผูกกับบรีฟนี้`,
          );
        })
        .catch((e) => toast.error(e instanceof Error ? e.message : "อัปเดตไม่สำเร็จ"));
      return;
    }

    // No existing — create fresh and link via briefId
    create({ ...init, items: newItems, briefId })
      .then((q) => {
        if (q?.id) {
          setEditingId(q.id);
          toast.success("สร้างใบเสนอราคาจากบรีฟแล้ว — กรอกราคาให้ครบได้เลย");
        }
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "สร้างไม่สำเร็จ"));
  }, [create, update, list]);

  const counts = React.useMemo(() => {
    return {
      quotation: list.length,
      invoice: list.filter((q) => belongsTo(q, "invoice")).length,
      receipt: list.filter((q) => belongsTo(q, "receipt")).length,
    } as Record<DocKind, number>;
  }, [list]);

  const filtered = React.useMemo(() => {
    const ql = query.trim().toLowerCase();
    return list
      .filter((it) => belongsTo(it, docType))
      .filter((it) => (filter !== "all" ? it.status === filter : true))
      .filter((it: Quotation) => {
        if (!ql) return true;
        return (
          it.number.toLowerCase().includes(ql) ||
          (it.invoiceNumber || "").toLowerCase().includes(ql) ||
          (it.receiptNumber || "").toLowerCase().includes(ql) ||
          it.projectName.toLowerCase().includes(ql) ||
          it.clientName.toLowerCase().includes(ql)
        );
      });
  }, [list, query, filter, docType]);

  // Reset selection when filter/docType changes
  React.useEffect(() => {
    setSelectedIds(new Set());
  }, [docType, filter]);

  if (editingId) {
    return (
      <QuotationEditor
        id={editingId}
        onBack={() => {
          try {
            sessionStorage.removeItem("so1o.editingQuotationId");
          } catch {
            /* noop */
          }
          setEditingId(null);
        }}
      />
    );
  }

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    try {
      const q = await create();
      if (!q?.id) {
        toast.error("สร้างใบเสนอราคาไม่สำเร็จ — ลองใหม่อีกครั้ง");
        return;
      }
      setEditingId(q.id);
      toast.success(`สร้าง ${q.number} แล้ว`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "สร้างใบเสนอราคาไม่สำเร็จ");
    } finally {
      setCreating(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (checked) setSelectedIds(new Set(filtered.map((q) => q.id)));
    else setSelectedIds(new Set());
  }

  function bulkStatus(s: QuotationStatus) {
    selectedIds.forEach((id) => advanceStatus(id, s));
    toast.success(`เปลี่ยนสถานะ ${selectedIds.size} รายการแล้ว`);
    setSelectedIds(new Set());
  }

  function bulkDuplicate() {
    selectedIds.forEach((id) => duplicate(id));
    toast.success(`คัดลอก ${selectedIds.size} รายการแล้ว`);
    setSelectedIds(new Set());
  }

  function bulkDelete() {
    const n = selectedIds.size;
    selectedIds.forEach((id) => remove(id));
    toast.success(`ลบ ${n} รายการแล้ว`);
    setSelectedIds(new Set());
    setConfirmBulkDel(false);
  }

  function bulkExport() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (ids.length === 1) {
      setMockupId(ids[0]);
      return;
    }
    toast.info(`เปิด ${ids.length} รายการเพื่อพิมพ์ทีละใบ — กดบันทึก PDF ในแต่ละหน้า`);
    setMockupId(ids[0]);
  }

  const meta = DOC_TYPES.find((d) => d.value === docType)!;
  const mockupQ = mockupId ? (list.find((q) => q.id === mockupId) ?? null) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <DocSidebar docType={docType} setDocType={setDocType} counts={counts} />

      <div className="lg:col-span-9 xl:col-span-9 space-y-4">
        <Card className="glass border-border shadow-soft">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">{meta.label}</h2>
                <p className="text-xs text-muted-foreground">
                  {docType === "quotation"
                    ? "รายการใบเสนอราคาทั้งหมด · จัดการได้ในที่เดียว"
                    : docType === "invoice"
                      ? "รายการใบแจ้งหนี้ที่ส่งให้ลูกค้าแล้ว"
                      : "ใบเสร็จรับเงินที่ออกให้ลูกค้าแล้ว"}
                </p>
              </div>
              {docType === "quotation" && (
                <Button
                  onClick={() => void handleCreate()}
                  disabled={creating}
                  className="gap-1.5 bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" /> {creating ? "กำลังสร้าง…" : "ทำใบเสนอราคา"}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ค้นหาเลขที่ / ชื่อโครงการ / ลูกค้า"
                  className="pl-9 h-9"
                />
              </div>
              <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="draft">ฉบับร่าง</SelectItem>
                  <SelectItem value="pending_approval">รออนุมัติ</SelectItem>
                  <SelectItem value="pending_payment">รอเก็บเงิน</SelectItem>
                  <SelectItem value="pending_receipt">รอทำใบเสร็จ</SelectItem>
                  <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                  <SelectItem value="rejected">ปฏิเสธ</SelectItem>
                  <SelectItem value="expired">หมดอายุ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <BulkActionBar
              count={selectedIds.size}
              onClear={() => setSelectedIds(new Set())}
              onBulkStatus={bulkStatus}
              onBulkDuplicate={bulkDuplicate}
              onBulkDelete={() => setConfirmBulkDel(true)}
              onBulkExport={bulkExport}
            />

            {filtered.length === 0 ? (
              <EmptyState docType={docType} onCreate={handleCreate} />
            ) : (
              <DocList
                items={filtered}
                docType={docType}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleAll={toggleAll}
                onOpen={(id) => setEditingId(id)}
                onDuplicate={(id) => {
                  duplicate(id);
                  toast.success("คัดลอกแล้ว");
                }}
                onDelete={(id, num) => setConfirmDel({ id, num })}
                onAdvance={(id, next) => {
                  advanceStatus(id, next);
                  if (next === "pending_payment") toast.success("สร้างใบแจ้งหนี้แล้ว");
                  else if (next === "pending_receipt") toast.success("สร้างใบเสร็จรับเงินแล้ว");
                  else if (next === "completed") {
                    toast.success("ปิดงานเรียบร้อย — ซิงค์รายได้แล้ว 🎉");
                    celebrateFromEdges();
                    // Fire payment-success email to the freelancer (idempotent per quotation).
                    const q = list.find((x) => x.id === id);
                    if (q) {
                      supabase.auth.getUser().then(({ data }) => {
                        const email = data.user?.email;
                        const name = (data.user?.user_metadata as any)?.full_name as
                          | string
                          | undefined;
                        if (!email) return;
                        const totals = computeTotals(q);
                        sendTransactionalEmail({
                          templateName: "payment-success",
                          recipientEmail: email,
                          idempotencyKey: `payment-success-${q.id}`,
                          templateData: {
                            recipientName: name || "คุณ",
                            clientName: q.clientName || "ลูกค้า",
                            projectName: q.projectName || q.number,
                            amount: totals.grandTotal,
                            currency: "THB",
                            paymentDate: new Date().toLocaleDateString("th-TH"),
                            invoiceNumber: q.receiptNumber || q.invoiceNumber || q.number,
                            receiptUrl: `${window.location.origin}/dashboard`,
                          },
                        });
                      });
                    }
                  }
                }}
              />
            )}
          </CardContent>
        </Card>

        <PageFooterActions feature="ใบเสนอราคา" label="Quotation / Invoice" />
      </div>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบเอกสารนี้?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDel?.num} จะถูกลบถาวร — การกระทำนี้ย้อนกลับไม่ได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDel) {
                  remove(confirmDel.id);
                  toast.success("ลบแล้ว");
                }
                setConfirmDel(null);
              }}
            >
              ลบเอกสาร
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmBulkDel} onOpenChange={setConfirmBulkDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบ {selectedIds.size} รายการ?</AlertDialogTitle>
            <AlertDialogDescription>
              เอกสารทั้งหมดที่เลือกจะถูกลบถาวร — การกระทำนี้ย้อนกลับไม่ได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={bulkDelete}
            >
              ลบทั้งหมด
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <QuotationMockupDialog
        q={mockupQ}
        docKind={docType}
        open={!!mockupQ}
        onOpenChange={(o) => !o && setMockupId(null)}
      />

      <AlertDialog open={studioUpgradeOpen} onOpenChange={setStudioUpgradeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ใบเสนอราคารวม Studio</AlertDialogTitle>
            <AlertDialogDescription>
              ฟีเจอร์นี้ใช้ได้เฉพาะแพ็ก In-House — อัปเกรดเพื่อรับ handoff จาก Pixel100
              และจัดการทีมใน So1o
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ปิด</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                window.location.href = "/dashboard?tab=settings&section=subscription";
              }}
            >
              ดูแพ็ก In-House
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
