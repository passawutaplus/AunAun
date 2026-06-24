import * as React from "react";
import {
  useQuotations,
  computeTotals,
  formatBaht,
  statusLabel,
  type Quotation,
  type QuotationStatus,
  type DocKind,
} from "@/store/quotations";
import { useFinance } from "@/store/finance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Download,
  Save,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Eye,
  Link2,
  User,
  FileText,
  ListTree,
  CalendarRange,
  PanelRight,
  ImageIcon,
  StickyNote,
  Coins,
  PenLine,
  Users,
} from "lucide-react";
import { StickyToolbar, type ToolbarAction } from "../shared/StickyToolbar";
import { SettingsPanel } from "./SettingsPanel";
import { ServicesPanel } from "./ServicesPanel";
import { TimelinePanel } from "./TimelinePanel";
import { PreviewPanel } from "./PreviewPanel";
import { EscrowQuotationActions } from "./EscrowQuotationActions";
import { QuotationHeaderBannerField } from "./QuotationHeaderBannerField";
import { QuotationCollaboratorsPanel } from "./QuotationCollaboratorsPanel";
import { QuotationCollapsibleBlock, QuotationFormCard } from "./QuotationFormCard";
import { useQuotationCollaborators } from "@/hooks/useQuotationCollaborators";
import { QuotationMockupDialog } from "./QuotationMockupDialog";
import {
  QuotationExportOptionsDialog,
  type QuotationExportChoice,
} from "./QuotationExportOptionsDialog";
import { ShareTrackerDialog } from "./ShareTrackerDialog";
import { ShareSignLinkDialog } from "./ShareSignLinkDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { toast } from "sonner";
import { cssAboveMobileBottomNav } from "@/lib/layoutConstants";
interface Props {
  id: string;
  onBack: () => void;
}

export function QuotationEditor({ id, onBack }: Props) {
  const { get, update, markPdfExported, advanceStatus, isLoading } = useQuotations();
  const { upsertIncomeFromQuotation, removeIncomeBySource } = useFinance();
  const { user, profile } = useAuth();
  const q = get(id);
  const { data: collabs = [] } = useQuotationCollaborators(
    q?.quotationKind && q.quotationKind !== "solo" ? q.id : undefined,
  );
  const canEditCollaborators =
    !!user &&
    !!q &&
    (q.ownerUserId === user.id || collabs.some((c) => c.userId === user.id && c.role === "lead"));
  const [showMobilePreview, setShowMobilePreview] = React.useState(false);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [mockupOpen, setMockupOpen] = React.useState(false);
  const [autoPrint, setAutoPrint] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [previewOptionsOpen, setPreviewOptionsOpen] = React.useState(false);
  const [exportChoice, setExportChoice] = React.useState<QuotationExportChoice>({
    includeBrief: false,
    includeTimeline: false,
    signatureMode: "none",
    includeFreelancerSignature: false,
  });

  const [shareOpen, setShareOpen] = React.useState(false);
  const [signShareOpen, setSignShareOpen] = React.useState(false);
  const [shareInfo, setShareInfo] = React.useState<{
    share_token: string;
    tracking_code: string;
    isNew: boolean;
  } | null>(null);
  const [creatingTracker, setCreatingTracker] = React.useState(false);

  // Document kind shown in preview/print → derived from current status
  const docKind: DocKind = React.useMemo(() => {
    if (!q) return "quotation";
    if (q.status === "completed" || q.status === "pending_receipt") return "receipt";
    if (q.status === "pending_payment") return "invoice";
    return "quotation";
  }, [q]);

  const totals = React.useMemo(() => (q ? computeTotals(q) : null), [q]);

  // Auto-sync income to Tax module whenever a quotation reaches "completed"
  // Sync helper — สามารถเรียกซ้ำได้ทั้งใน effect และจากปุ่ม Resync
  const syncIncomeNow = React.useCallback(
    (quotation: typeof q) => {
      if (!quotation || quotation.status !== "completed") return;
      const totals = computeTotals(quotation);
      const monthSrc =
        quotation.paidAt ||
        quotation.receiptIssuedAt ||
        quotation.updatedAt ||
        new Date().toISOString();
      const month = monthSrc.slice(0, 7);
      upsertIncomeFromQuotation({
        sourceQuotationId: quotation.id,
        month,
        client: quotation.clientName || "ลูกค้า",
        gross: totals.preTax,
        withholding: totals.withholdingAmount,
        incomeType: "freelance",
        whtRate: quotation.whtEnabled ? quotation.whtRate : 0,
        certificateReceived: false,
        note: `จาก ${quotation.number}${quotation.invoiceNumber ? ` / ${quotation.invoiceNumber}` : ""}${quotation.receiptNumber ? ` / ${quotation.receiptNumber}` : ""}`,
      });
    },
    [upsertIncomeFromQuotation],
  );

  // Auto-sync income to Tax module whenever a quotation reaches "completed"
  React.useEffect(() => {
    syncIncomeNow(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?.status, q?.paidAt, q?.receiptNumber]);

  function handleResyncIncome() {
    if (!q) return;
    if (q.status !== "completed") {
      toast.info("ปิดงานก่อน (สถานะ 'เสร็จสิ้น') ถึงจะ sync รายได้ได้");
      return;
    }
    syncIncomeNow(q);
    toast.success("ซิงค์รายได้เข้าหมวดภาษีแล้ว");
  }

  if (!q) {
    if (isLoading) {
      return (
        <div className="text-center py-16 text-sm text-muted-foreground">กำลังโหลดใบเสนอราคา…</div>
      );
    }
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground mb-3">ไม่พบใบเสนอราคา</p>
        <Button onClick={onBack} variant="outline">
          กลับ
        </Button>
      </div>
    );
  }

  const patch = (p: Partial<Quotation>) => update(q.id, p);

  function handleSave() {
    if (!q) return;
    update(q.id, { updatedAt: new Date().toISOString() });
    toast.success("บันทึกฉบับร่างแล้ว");
  }

  function handlePrint() {
    if (!q) return;
    // Open the export-options dialog first so user can choose what to bundle
    setExportOpen(true);
  }

  function handleExportConfirm(choice: QuotationExportChoice) {
    if (!q) return;
    const patch: Partial<Quotation> = {
      signatureMode: choice.signatureMode,
      includeFreelancerSignature: choice.includeFreelancerSignature,
    };
    if (
      (choice.signatureMode === "online" || choice.signatureMode === "wet") &&
      !q.signShareToken
    ) {
      patch.signShareToken = crypto.randomUUID();
    }
    void update(q.id, patch).then(() => {
      setExportChoice(choice);
      markPdfExported(q.id);
      if (q.status === "draft") {
        toast.success("เลื่อนสถานะเป็น 'รออนุมัติ' · กำลังเตรียมไฟล์ PDF...");
      } else {
        toast.info("กำลังเตรียมไฟล์ PDF...");
      }
      setAutoPrint(true);
      setMockupOpen(true);
      if (choice.signatureMode === "online" || choice.signatureMode === "wet") {
        setSignShareOpen(true);
      }
    });
  }

  function handlePreviewConfirm(choice: QuotationExportChoice) {
    if (!q) return;
    const patch: Partial<Quotation> = {
      signatureMode: choice.signatureMode,
      includeFreelancerSignature: choice.includeFreelancerSignature,
    };
    if (
      (choice.signatureMode === "online" || choice.signatureMode === "wet") &&
      !q.signShareToken
    ) {
      patch.signShareToken = crypto.randomUUID();
    }
    void update(q.id, patch).then(() => {
      setExportChoice(choice);
      setAutoPrint(false);
      setMockupOpen(true);
    });
  }

  function handleAdvance(next: QuotationStatus) {
    if (!q) return;
    advanceStatus(q.id, next);
    if (next === "pending_payment") {
      toast.success("สร้างใบแจ้งหนี้แล้ว — กดบันทึก PDF เพื่อส่งให้ลูกค้า");
    } else if (next === "pending_receipt") {
      toast.success("สร้างใบเสร็จรับเงินแล้ว");
    } else if (next === "completed") {
      toast.success("ปิดงานเรียบร้อย — ซิงค์เข้าหมวดภาษี & รายได้แล้ว");
    }
  }

  function handleStatusManualChange(next: QuotationStatus) {
    if (!q) return;
    if (q.status === "completed" && next !== "completed") {
      removeIncomeBySource(q.id);
    }
    advanceStatus(q.id, next);
  }
  // expose to keep helper available; status changes now happen from the list
  void handleStatusManualChange;

  // Workflow CTA mapping
  const nextStep: { label: string; status: QuotationStatus; icon: React.ReactNode } | null =
    (() => {
      switch (q.status) {
        case "pending_approval":
          return {
            label: "ทำใบแจ้งหนี้",
            status: "pending_payment",
            icon: <ArrowRight className="h-4 w-4" />,
          };
        case "pending_payment":
          return {
            label: "ทำใบเสร็จรับเงิน",
            status: "pending_receipt",
            icon: <ArrowRight className="h-4 w-4" />,
          };
        case "pending_receipt":
          return {
            label: "ปิดงาน (ลูกค้าได้รับใบเสร็จ)",
            status: "completed",
            icon: <CheckCircle2 className="h-4 w-4" />,
          };
        default:
          return null;
      }
    })();

  const statusInfo = statusLabel(q.status);

  async function handleCreateOrOpenTracker() {
    if (!q || !user) return;
    const needsContract =
      q.status === "pending_payment" || q.status === "pending_receipt" || q.status === "completed";
    if (needsContract && !q.contractAccepted) {
      toast.error("ยืนยันสัญญาจ้างก่อน — เปิดจาก Pipeline > การ์ดดีล > สัญญาจ้าง");
      return;
    }
    setCreatingTracker(true);
    try {
      // ดูว่ามี job tracker ของใบนี้แล้วหรือยัง
      const { data: existing } = await supabase
        .from("job_trackers")
        .select("share_token, tracking_code")
        .eq("user_id", user.id)
        .eq("quotation_id", q.id)
        .maybeSingle();

      if (existing) {
        setShareInfo({
          share_token: existing.share_token,
          tracking_code: existing.tracking_code,
          isNew: false,
        });
        setShareOpen(true);
        return;
      }

      const totals = computeTotals(q);
      const payload = {
        user_id: user.id,
        title: q.projectName || `งานของ ${q.clientName || "ลูกค้า"}`,
        client_name: q.clientName || "",
        total_amount: Math.round(totals.grandTotal),
        deposit_percent: q.depositPreset || 0,
        payment_info: q.paymentTerms || "",
        start_date: q.startDate || null,
        deadline: q.endDate || null,
        notes: q.notes || "",
        quotation_id: q.id,
        brief_id: q.briefId ?? null,
      };
      const { data: created, error } = await supabase
        .from("job_trackers")
        .insert(payload)
        .select("share_token, tracking_code")
        .single();
      if (error) throw error;
      setShareInfo({
        share_token: created.share_token,
        tracking_code: created.tracking_code,
        isNew: true,
      });
      setShareOpen(true);
      toast.success("สร้าง Job Tracker แล้ว — คัดลอกลิงก์ส่งให้ลูกค้าได้เลย");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "สร้าง Job Tracker ไม่สำเร็จ");
    } finally {
      setCreatingTracker(false);
    }
  }

  const secondaryActions: ToolbarAction[] = [
    { label: "บันทึก", onClick: handleSave, icon: <Save className="h-4 w-4" /> },
    {
      label: "ดูตัวอย่าง",
      onClick: () => setPreviewOptionsOpen(true),
      icon: <Eye className="h-4 w-4" />,
    },
  ];
  if (q.status === "completed") {
    secondaryActions.push({
      label: "Resync รายได้",
      onClick: handleResyncIncome,
      icon: <RefreshCw className="h-4 w-4" />,
      title: "ซิงค์รายได้ใบนี้เข้าหมวดภาษีอีกครั้ง",
    });
  }

  const primaryActions: ToolbarAction[] = [];
  // workflow advance buttons removed — status is managed from the list dropdown only.
  void nextStep;
  void handleAdvance;
  if (q.status !== "draft") {
    primaryActions.push({
      label: creatingTracker ? "กำลังสร้าง..." : "สร้างลิงก์ติดตามงาน",
      onClick: handleCreateOrOpenTracker,
      icon: <Link2 className="h-4 w-4" />,
      variant: "secondary",
      title: "สร้าง/เปิดลิงก์ติดตามงานสำหรับลูกค้า (แนบใบบรีฟ + ใบเสนอราคา)",
    });
  }
  if (
    (q.signatureMode === "online" || q.signatureMode === "wet") &&
    q.signShareToken
  ) {
    primaryActions.push({
      label: "แชร์ลิงก์เซ็น",
      onClick: () => setSignShareOpen(true),
      icon: <PenLine className="h-4 w-4" />,
      variant: "secondary",
      title: "คัดลอกหรือส่งลิงก์ /sign/ ให้ลูกค้าเซ็น",
    });
  }
  primaryActions.push({
    label: "บันทึก PDF",
    onClick: handlePrint,
    icon: <Download className="h-4 w-4" />,
  });

  const formCards = (
    <div className="space-y-5">
      <QuotationFormCard
        title="ลูกค้า"
        description="เลือกหรือเพิ่มข้อมูลลูกค้าที่จะออกใบเสนอราคาให้"
        icon={<User className="h-4 w-4" />}
      >
        <SettingsPanel q={q} patch={patch} sections={["client"]} />
      </QuotationFormCard>

      <QuotationFormCard
        title="รายละเอียดเอกสาร"
        description="ข้อมูลโครงการและเงื่อนไขชำระ"
        icon={<FileText className="h-4 w-4" />}
        headerExtra={
          totals ? (
            <div className="text-right shrink-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">ยอดรวม</p>
              <p className="num text-lg font-bold text-primary leading-tight">
                ฿{formatBaht(totals.grandTotal)}
              </p>
            </div>
          ) : null
        }
      >
        <div className="rounded-xl bg-primary/5 border border-primary/15 px-4 py-3 flex items-center justify-between lg:hidden">
          <span className="text-xs text-muted-foreground">จำนวนเงินรวมทั้งสิ้น</span>
          <span className="num text-xl font-bold text-primary">
            ฿{formatBaht(totals?.grandTotal ?? 0)}
          </span>
        </div>
        <SettingsPanel q={q} patch={patch} sections={["project", "brief", "payment", "due"]} />
        <EscrowQuotationActions quotation={q} />
      </QuotationFormCard>

      <QuotationFormCard
        title="ค่าบริการ"
        description="รายการชิ้นงาน ส่วนลด ภาษี และยอดสุทธิ"
        icon={<ListTree className="h-4 w-4" />}
      >
        <ServicesPanel q={q} patch={patch} sections={["add", "items", "summary"]} />
      </QuotationFormCard>

      <QuotationFormCard
        title="ไทม์ไลน์และงวดงาน"
        description="กำหนดวันที่และลำดับส่งงาน (แสดงในใบเสนอราคาได้)"
        icon={<CalendarRange className="h-4 w-4" />}
      >
        <TimelinePanel q={q} patch={patch} sections={["dates", "milestones"]} />
      </QuotationFormCard>

      <QuotationFormCard
        title="ตั้งค่าเพิ่มเติม"
        description="ตัวเลือกราคา ผู้ร่วมงาน ตกแต่งเอกสาร และหมายเหตุภายใน"
        icon={<FileText className="h-4 w-4" />}
        defaultOpen={false}
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
      >
        <div className="space-y-4">
          <QuotationCollapsibleBlock
            title="ตัวเลือกราคาเพิ่มเติม"
            description="ความยากของลูกค้า ส่วนเพิ่ม ต้นทุนแฝง และจำนวนแก้ไขฟรี"
            icon={<Coins className="h-3.5 w-3.5" />}
          >
            <SettingsPanel q={q} patch={patch} sections={["modifiers"]} />
          </QuotationCollapsibleBlock>

          {(q.quotationKind === "inhouse" || q.quotationKind === "studio") && (
            <QuotationCollapsibleBlock
              title={
                q.quotationKind === "inhouse"
                  ? "สมาชิกทีม (In-House)"
                  : "สมาชิก Studio (Pixel100 nest)"
              }
              icon={<Users className="h-3.5 w-3.5" />}
            >
              <QuotationCollaboratorsPanel
                quotationId={q.id}
                quotationKind={q.quotationKind}
                canEdit={canEditCollaborators}
                embedded
              />
            </QuotationCollapsibleBlock>
          )}

          <QuotationCollapsibleBlock
            title="หมวดตกแต่ง"
            description="ภาพหัวเอกสาร — แสดงใน preview และตอนส่งให้ลูกค้า"
            icon={<ImageIcon className="h-3.5 w-3.5" />}
          >
            <QuotationHeaderBannerField
              value={q.headerImageUrl}
              onChange={(url) => patch({ headerImageUrl: url })}
            />
          </QuotationCollapsibleBlock>

          <QuotationCollapsibleBlock
            title="หมายเหตุภายใน"
            description="โน้ตสำหรับตัวคุณเอง — ไม่แสดงในใบเสนอราคา"
            icon={<StickyNote className="h-3.5 w-3.5" />}
          >
            <TimelinePanel q={q} patch={patch} sections={["notes"]} />
          </QuotationCollapsibleBlock>
        </div>
      </QuotationFormCard>
    </div>
  );

  return (
    <div className="space-y-3 quotation-editor-root lg:pb-3 bg-muted/20 lg:bg-transparent rounded-xl lg:rounded-none">
      <StickyToolbar
        offsetTop={60}
        leading={
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 shrink-0">
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">กลับ</span>
          </Button>
        }
        title={<span className="num">{q.number}</span>}
        badge={
          <>
            {q.quotationKind === "inhouse" && (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                ทีม In-House
              </Badge>
            )}
            {q.quotationKind === "studio" && (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                Studio Quote
              </Badge>
            )}
            <Badge
              variant="outline"
              className={`${statusInfo.tone} border-0 text-[11px] rounded-full px-2.5 py-1 shrink-0`}
            >
              {statusInfo.label}
            </Badge>
          </>
        }
        primaryActions={primaryActions}
        secondaryActions={secondaryActions}
      />

      {/* Desktop: split form + sticky preview */}
      <div className="hidden lg:grid gap-6 grid-cols-12 items-start">
        <div className="col-span-7 min-w-0">{formCards}</div>
        <div className="col-span-5 editor-inline-preview min-w-0">
          <div className="sticky z-10" style={{ top: 132 }}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2 px-1">
              Preview
            </p>
            <PreviewPanel q={q} docKind={docKind} />
          </div>
        </div>
      </div>

      {/* Mobile / tablet: optional preview + scroll form */}
      <div className="lg:hidden space-y-4 px-0.5">
        <div className="flex justify-end no-print">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setShowMobilePreview((v) => !v)}
          >
            <PanelRight className="h-3.5 w-3.5" />
            {showMobilePreview ? "ซ่อน Preview" : "แสดง Preview"}
          </Button>
        </div>
        {showMobilePreview && (
          <div className="editor-inline-preview">
            <PreviewPanel q={q} docKind={docKind} />
          </div>
        )}
        {formCards}
      </div>

      {/* Sticky bottom action bar — mobile only */}
      <div
        className="no-print lg:hidden fixed inset-x-0 z-[45] border-t border-border/60 bg-background/95 backdrop-blur px-3 py-2 flex items-center gap-2 shadow-[0_-4px_12px_-6px_rgba(0,0,0,0.15)]"
        style={{
          bottom: cssAboveMobileBottomNav(0),
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        {nextStep && (
          <Button
            onClick={() => handleAdvance(nextStep.status)}
            variant="secondary"
            className="flex-1 gap-1.5 h-10 text-xs"
          >
            {nextStep.icon} {nextStep.label}
          </Button>
        )}
        <Button
          onClick={handlePrint}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 h-10 text-xs"
        >
          <Download className="h-4 w-4" /> บันทึกเป็น PDF
        </Button>
      </div>

      <QuotationExportOptionsDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        hasBrief={!!q.briefId}
        hasTimeline={!!(q.startDate || q.endDate || (q.milestones && q.milestones.length > 0))}
        hasFreelancerSignature={!!profile?.signature_url}
        initialSignatureMode={q.signatureMode ?? "none"}
        initialIncludeFreelancerSignature={!!q.includeFreelancerSignature}
        onConfirm={handleExportConfirm}
        mode="export"
      />

      <QuotationExportOptionsDialog
        open={previewOptionsOpen}
        onOpenChange={setPreviewOptionsOpen}
        hasBrief={!!q.briefId}
        hasTimeline={!!(q.startDate || q.endDate || (q.milestones && q.milestones.length > 0))}
        hasFreelancerSignature={!!profile?.signature_url}
        initialSignatureMode={q.signatureMode ?? "none"}
        initialIncludeFreelancerSignature={!!q.includeFreelancerSignature}
        onConfirm={handlePreviewConfirm}
        mode="preview"
      />

      <QuotationMockupDialog
        q={q}
        docKind={docKind}
        open={mockupOpen}
        autoPrint={autoPrint}
        includeBrief={exportChoice.includeBrief}
        includeTimeline={exportChoice.includeTimeline}
        onOpenChange={(o) => {
          setMockupOpen(o);
          if (!o) {
            setAutoPrint(false);
            setExportChoice({
              includeBrief: false,
              includeTimeline: false,
              signatureMode: q.signatureMode ?? "none",
              includeFreelancerSignature: !!q.includeFreelancerSignature,
            });
          }
        }}
      />

      {shareInfo && (
        <ShareTrackerDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          shareToken={shareInfo.share_token}
          trackingCode={shareInfo.tracking_code}
          hasBrief={!!q.briefId}
          hasQuotation={true}
          isNew={shareInfo.isNew}
        />
      )}

      {q.signShareToken && (
        <ShareSignLinkDialog
          open={signShareOpen}
          onOpenChange={setSignShareOpen}
          signShareToken={q.signShareToken}
          quotationNumber={q.number}
          clientEmail={q.clientEmail}
        />
      )}
    </div>
  );
}
