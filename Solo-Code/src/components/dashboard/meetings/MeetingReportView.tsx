import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Download, FileText, Loader2, Receipt, Save } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import type { DesignBrief } from "@/lib/briefSchema";
import type { AiBriefExtractResult } from "@/lib/briefExtractTypes";
import { aiMeetingBriefExtract } from "@/lib/aiMeetingBriefExtract.functions";
import {
  handoffBriefToQuotation,
  saveBriefFromExtractResult,
} from "@/lib/briefFromExtractResult";
import { meetingExtractCredits } from "@/lib/meetingCredits";
import { StructuredBriefReview } from "@/components/dashboard/briefs/StructuredBriefReview";
import { MeetingReportPdfDialog } from "./MeetingReportPdfDialog";
import type { MeetingCaptureRow } from "./MeetingReportPdfTemplate";

function rowToBrief(r: Record<string, unknown>): DesignBrief {
  return {
    id: r.id as string,
    user_id: r.user_id as string,
    project_id: (r.project_id as string | null) ?? null,
    share_token: r.share_token as string,
    title: r.title as string,
    status: r.status as DesignBrief["status"],
    client_info: (r.client_info as DesignBrief["client_info"]) ?? {},
    project_overview: (r.project_overview as DesignBrief["project_overview"]) ?? {},
    audience: (r.audience as DesignBrief["audience"]) ?? {},
    design_direction: (r.design_direction as DesignBrief["design_direction"]) ?? { moods: [] },
    tech_specs: (r.tech_specs as DesignBrief["tech_specs"]) ?? { formats: [] },
    timeline_budget: (r.timeline_budget as DesignBrief["timeline_budget"]) ?? {},
    notes: (r.notes as string) ?? "",
    references: (r.references as DesignBrief["references"]) ?? [],
    ai_analysis: (r.ai_analysis as DesignBrief["ai_analysis"]) ?? null,
    confirmed_at: (r.confirmed_at as string | null) ?? null,
    confirmed_by_name: (r.confirmed_by_name as string | null) ?? null,
    confirmed_signature: (r.confirmed_signature as string | null) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

export function MeetingReportView({
  capture,
  reportMarkdown,
  onReportChange,
  onSaved,
  onBriefCreated,
}: {
  capture: MeetingCaptureRow;
  reportMarkdown: string;
  onReportChange: (v: string) => void;
  onSaved?: () => void;
  onBriefCreated?: (brief: DesignBrief) => void;
}) {
  const { user } = useAuth();
  const extractFn = useServerFn(aiMeetingBriefExtract);
  const [saving, setSaving] = React.useState(false);
  const [pdfOpen, setPdfOpen] = React.useState(false);
  const [briefOpen, setBriefOpen] = React.useState(false);
  const [extractBusy, setExtractBusy] = React.useState(false);
  const [extractResult, setExtractResult] = React.useState<AiBriefExtractResult | null>(
    (capture.extract_result as AiBriefExtractResult | null) ?? null,
  );
  const [qualityIssues, setQualityIssues] = React.useState<string[]>([]);
  const [briefSaving, setBriefSaving] = React.useState(false);
  const [briefId, setBriefId] = React.useState<string | null>(capture.brief_id);

  const title = capture.title || "สรุปการประชุม";
  const dur = capture.duration_sec ?? 0;

  const saveReport = async () => {
    if (!reportMarkdown.trim()) {
      toast.error("รายงานว่างเปล่า");
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("meeting_captures")
        .update({
          report_markdown: reportMarkdown,
          transcript: capture.transcript,
          title: capture.title,
        })
        .eq("id", capture.id);
      if (error) throw new Error(error.message);
      toast.success("บันทึกรายงานแล้ว");
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const runBriefExtract = async () => {
    if (extractResult) {
      setBriefOpen(true);
      return;
    }
    if (!capture.transcript?.trim()) {
      toast.error("ไม่มี transcript");
      return;
    }
    setExtractBusy(true);
    try {
      const res = await extractFn({
        data: { captureId: capture.id, transcript: capture.transcript },
      });
      setExtractResult(res.result);
      setQualityIssues(res.quality.issues);
      setBriefOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "สรุปบรีฟไม่สำเร็จ");
    } finally {
      setExtractBusy(false);
    }
  };

  const saveBrief = async (): Promise<DesignBrief | null> => {
    if (!user || !extractResult) return null;
    setBriefSaving(true);
    try {
      const brief = await saveBriefFromExtractResult({
        userId: user.id,
        result: extractResult,
        titleOverride: capture.title ?? undefined,
        noteText: `[Meeting Report]\n${reportMarkdown.slice(0, 2000)}`,
      });
      await (supabase as any)
        .from("meeting_captures")
        .update({ brief_id: brief.id })
        .eq("id", capture.id);
      setBriefId(brief.id);
      toast.success("บันทึกบรีฟแล้ว");
      onBriefCreated?.(brief);
      return brief;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกบรีฟไม่สำเร็จ");
      return null;
    } finally {
      setBriefSaving(false);
    }
  };

  const createQuotation = async () => {
    if (briefId) {
      const { data } = await supabase
        .from("design_briefs")
        .select("*")
        .eq("id", briefId)
        .maybeSingle();
      if (data) {
        handoffBriefToQuotation(rowToBrief(data as Record<string, unknown>));
        toast.success("ดึงข้อมูลบรีฟไปสร้างใบเสนอราคา...");
        setBriefOpen(false);
      }
      return;
    }
    let result = extractResult;
    if (!result) {
      if (!capture.transcript?.trim()) {
        toast.error("ไม่มี transcript");
        return;
      }
      setExtractBusy(true);
      try {
        const res = await extractFn({
          data: { captureId: capture.id, transcript: capture.transcript },
        });
        result = res.result;
        setExtractResult(res.result);
        setQualityIssues(res.quality.issues);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "สรุปบรีฟไม่สำเร็จ");
        return;
      } finally {
        setExtractBusy(false);
      }
    }
    if (!user || !result) return;
    setBriefSaving(true);
    try {
      const brief = await saveBriefFromExtractResult({
        userId: user.id,
        result,
        titleOverride: capture.title ?? undefined,
        noteText: `[Meeting Report]\n${reportMarkdown.slice(0, 2000)}`,
      });
      await (supabase as any)
        .from("meeting_captures")
        .update({ brief_id: brief.id })
        .eq("id", capture.id);
      setBriefId(brief.id);
      handoffBriefToQuotation(brief);
      toast.success("ดึงข้อมูลบรีฟไปสร้างใบเสนอราคา...");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "สร้างใบเสนอราคาไม่สำเร็จ");
    } finally {
      setBriefSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-[11px] text-muted-foreground">แก้รายงานได้ก่อนบันทึกหรือส่งออก PDF</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPdfOpen(true)}>
            <Download className="h-4 w-4" />
            PDF
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => void saveReport()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            บันทึก
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">รายงานสรุป (Markdown)</Label>
        <Textarea
          value={reportMarkdown}
          onChange={(e) => onReportChange(e.target.value)}
          rows={18}
          className="text-sm font-mono leading-relaxed"
        />
      </div>

      <div className="rounded-xl border border-dashed border-border p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">ทางเลือก — หักเครดิตเมื่อกดเท่านั้น</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={extractBusy}
            onClick={() => void runBriefExtract()}
          >
            {extractBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            สร้าง Smart Brief
            {!extractResult && dur > 0 && (
              <span className="text-[10px] text-muted-foreground">
                (~{meetingExtractCredits(dur)} เครดิต)
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => void createQuotation()}
            disabled={briefSaving || extractBusy}
          >
            <Receipt className="h-4 w-4" />
            สร้างใบเสนอราคา
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          ใบเสนอราคาต้องมีบรีฟ — ระบบจะสร้างบรีฟจากรายงานให้อัตโนมัติถ้ายังไม่มี
        </p>
      </div>

      <MeetingReportPdfDialog
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        title={title}
        reportMarkdown={reportMarkdown}
        createdAt={capture.created_at}
        durationSec={capture.duration_sec}
      />

      <Sheet open={briefOpen} onOpenChange={setBriefOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>ตรวจบรีฟจากการประชุม</SheetTitle>
          </SheetHeader>
          {extractResult && (
            <div className="mt-4">
              <StructuredBriefReview
                result={extractResult}
                onChange={(k, v) =>
                  setExtractResult((prev) => (prev ? { ...prev, [k]: v } : prev))
                }
                transcript={capture.transcript ?? ""}
                qualityIssues={qualityIssues}
                onSave={() => void saveBrief().then((b) => b && setBriefOpen(false))}
                saving={briefSaving}
                extraActions={
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 gap-2"
                    disabled={briefSaving}
                    onClick={() => void createQuotation()}
                  >
                    <Receipt className="h-4 w-4" />
                    สร้างใบเสนอราคา
                  </Button>
                }
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
