import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Brain,
  Save,
  AlertTriangle,
  CheckSquare,
  HelpCircle,
  Copy,
  Printer,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DesignBrief, BriefAiAnalysis } from "@/lib/briefSchema";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  brief: DesignBrief;
  onSaved: (analysis: BriefAiAnalysis) => void;
}

function buildPrompt(b: DesignBrief): string {
  const summary = {
    title: b.title,
    project: b.project_overview,
    client: { name: b.client_info.client_name, brand: b.client_info.brand_name },
    audience: b.audience,
    design: b.design_direction,
    tech: b.tech_specs,
    timeline: b.timeline_budget,
    notes: b.notes,
  };
  return [
    "ในฐานะ Senior Art Director สรุปบรีฟนี้เป็นใบเสร็จสำหรับฟรีแลนซ์เอาไปใช้งานได้ทันที — ใช้ Markdown 3 หัวข้อนี้เท่านั้น แต่ละ bullet สั้น กระชับ ตรงประเด็น (ไม่เกิน 14 คำต่อข้อ):",
    "",
    "## Action Items",
    "(ขั้นตอนทำงาน 5-7 ข้อเรียงตามลำดับ ขึ้นต้นด้วยกริยา เช่น 'ออกแบบ…', 'ส่ง…')",
    "",
    "## Red Flags",
    "(จุดเสี่ยง scope creep / งานงอก / ราคาต่ำเกิน — ระบุเป็น bullet ไม่เกิน 5 ข้อ)",
    "",
    "## คำถามต้องเคลียร์",
    "(ข้อมูลที่ยังขาด ถามลูกค้าเพิ่ม — bullet ไม่เกิน 5 ข้อ)",
    "",
    "บรีฟ:",
    "```json",
    JSON.stringify(summary, null, 2),
    "```",
  ].join("\n");
}

function parseAnalysis(text: string): BriefAiAnalysis {
  const grab = (label: RegExp) => {
    const m = text.match(label);
    if (!m) return "";
    const start = m.index! + m[0].length;
    const rest = text.slice(start);
    const next = rest.search(/\n##\s+/);
    return (next === -1 ? rest : rest.slice(0, next)).trim();
  };
  return {
    key_takeaways: grab(/##\s+Action Items[^\n]*/i),
    red_flags: grab(/##\s+Red Flags[^\n]*/i),
    questions: grab(/##\s+คำถาม[^\n]*/i),
    generated_at: new Date().toISOString(),
  };
}

export function AiAnalysisSheet({ open, onOpenChange, brief, onSaved }: Props) {
  const [analysis, setAnalysis] = React.useState<BriefAiAnalysis | null>(brief.ai_analysis ?? null);
  const [busy, setBusy] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [raw, setRaw] = React.useState("");
  const ctrlRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    if (open) setAnalysis(brief.ai_analysis ?? null);
  }, [open, brief.ai_analysis]);

  const generate = async () => {
    setBusy(true);
    setRaw("");
    setAnalysis(null);
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-design-chat`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: buildPrompt(brief), stream: true }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "AI ไม่ตอบสนอง");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const j = JSON.parse(data);
            const delta = j?.choices?.[0]?.delta?.content ?? j?.delta ?? "";
            if (delta) {
              acc += delta;
              setRaw(acc);
            }
          } catch {
            /* ignore */
          }
        }
      }
      const parsed = parseAnalysis(acc);
      setAnalysis(parsed);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast.error("วิเคราะห์ไม่สำเร็จ: " + (e as Error).message);
      }
    } finally {
      setBusy(false);
    }
  };

  const stop = () => {
    ctrlRef.current?.abort();
    setBusy(false);
  };

  const saveAnalysis = async () => {
    if (!analysis) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("design_briefs")
        .update({ ai_analysis: analysis as any })
        .eq("id", brief.id);
      if (error) throw error;
      onSaved(analysis);
      toast.success("บันทึกผลวิเคราะห์ลงในบรีฟแล้ว");

      // Fire project-alert email (analysis_complete) to the freelancer.
      const { sendTransactionalEmail } = await import("@/lib/email/send");
      const { data: u } = await supabase.auth.getUser();
      const email = u.user?.email;
      const name = (u.user?.user_metadata as any)?.full_name as string | undefined;
      if (email) {
        sendTransactionalEmail({
          templateName: "project-alert",
          recipientEmail: email,
          idempotencyKey: `brief-analysis-${brief.id}`,
          templateData: {
            recipientName: name || "คุณ",
            projectName: brief.title || "บรีฟของคุณ",
            alertType: "analysis_complete",
            message:
              "AI วิเคราะห์บรีฟเสร็จเรียบร้อย — เปิดดู Action Items, Red Flags และคำถามที่ต้องเคลียร์กับลูกค้าได้เลย",
            actionUrl: `${window.location.origin}/dashboard`,
          },
        });
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" /> AI วิเคราะห์บรีฟ
          </SheetTitle>
          <SheetDescription>
            So1o Mentor จะช่วยมองหา Key Takeaway, Red Flag และคำถามที่ควรถามลูกค้าเพิ่ม
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex gap-2">
            {!busy ? (
              <Button onClick={generate} className="flex-1">
                <Brain className="h-4 w-4 mr-1.5" />
                {analysis ? "วิเคราะห์ใหม่" : "เริ่มวิเคราะห์"}
              </Button>
            ) : (
              <Button onClick={stop} variant="outline" className="flex-1">
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> หยุด
              </Button>
            )}
            {analysis && !busy && (
              <Button onClick={saveAnalysis} disabled={saving} variant="secondary">
                <Save className="h-4 w-4 mr-1.5" />
                {saving ? "กำลังบันทึก…" : "บันทึก"}
              </Button>
            )}
          </div>

          {busy && raw && (
            <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
              {raw}
              <span className="inline-block w-1.5 h-3.5 bg-primary ml-0.5 animate-pulse" />
            </div>
          )}

          {!busy && analysis && <ReceiptView analysis={analysis} brief={brief} />}

          {!busy && !analysis && (
            <p className="text-xs text-muted-foreground text-center py-6">
              กดปุ่ม "เริ่มวิเคราะห์" เพื่อให้ So1o Mentor ช่วยอ่านบรีฟ
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ReceiptView({ analysis, brief }: { analysis: BriefAiAnalysis; brief: DesignBrief }) {
  const ref = React.useRef<HTMLDivElement>(null);

  const copyAll = async () => {
    const text = [
      `SO1O AI BRIEF RECEIPT — ${brief.title}`,
      `วิเคราะห์เมื่อ ${analysis.generated_at ? new Date(analysis.generated_at).toLocaleString("th-TH") : "-"}`,
      "",
      "✅ ACTION ITEMS",
      analysis.key_takeaways || "—",
      "",
      "⚠️ RED FLAGS",
      analysis.red_flags || "—",
      "",
      "❓ คำถามต้องเคลียร์",
      analysis.questions || "—",
    ].join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("คัดลอกผลวิเคราะห์แล้ว");
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="ghost" onClick={copyAll}>
          <Copy className="h-3.5 w-3.5 mr-1" /> คัดลอก
        </Button>
      </div>
      <div
        ref={ref}
        className="rounded-2xl border-2 border-dashed border-border bg-card p-4 space-y-3 font-sans"
      >
        <div className="text-center border-b border-dashed border-border pb-2">
          <div className="text-[9px] font-mono tracking-[0.3em] text-muted-foreground">
            SO1O · AI BRIEF RECEIPT
          </div>
          <div className="text-sm font-bold mt-0.5 truncate">{brief.title}</div>
          <div className="text-[10px] text-muted-foreground font-mono">
            {analysis.generated_at ? new Date(analysis.generated_at).toLocaleString("th-TH") : "—"}
          </div>
        </div>

        <ReceiptSection
          icon={<CheckSquare className="h-3.5 w-3.5" />}
          label="ACTION ITEMS"
          tone="text-emerald-600 dark:text-emerald-400"
        >
          {analysis.key_takeaways}
        </ReceiptSection>
        <div className="border-t border-dashed border-border" />
        <ReceiptSection
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          label="RED FLAGS"
          tone="text-amber-600 dark:text-amber-400"
        >
          {analysis.red_flags}
        </ReceiptSection>
        <div className="border-t border-dashed border-border" />
        <ReceiptSection
          icon={<HelpCircle className="h-3.5 w-3.5" />}
          label="คำถามต้องเคลียร์"
          tone="text-blue-600 dark:text-blue-400"
        >
          {analysis.questions}
        </ReceiptSection>

        <div className="border-t border-dashed border-border pt-2 text-center text-[9px] font-mono text-muted-foreground tracking-wider">
          — END OF RECEIPT —
        </div>
      </div>
    </div>
  );
}

function ReceiptSection({
  icon,
  label,
  tone,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  tone: string;
  children?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div
        className={`flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-wider ${tone}`}
      >
        {icon} {label}
      </div>
      <div className="text-[13px] whitespace-pre-wrap leading-relaxed pl-1">
        {children?.trim() || <em className="text-muted-foreground/70">— ไม่มีข้อมูล —</em>}
      </div>
    </div>
  );
}
