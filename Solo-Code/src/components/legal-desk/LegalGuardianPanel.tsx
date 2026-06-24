import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Scale, FileText, MessageSquare, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLegalDocuments } from "@/store/legalUsageRights";
import { LEGAL_DISCLAIMER } from "@/lib/usageRightsSchema";
import { trackFeature } from "@/lib/featureUsage";
import type { Quotation } from "@/store/quotations";
import type { UsageRightsInput } from "@/lib/usageRightsSchema";

const QUICK_PROMPTS = [
  {
    id: "review",
    label: "ตรวจสัญญา",
    prompt: "ช่วยตรวจสอบความเสี่ยงในสัญญา/เงื่อนไขนี้ และแนะนำข้อความที่ควรเพิ่ม",
  },
  { id: "debt", label: "ทวงเงิน", prompt: "ช่วยร่างข้อความทวงเงินลูกค้าอย่างสุภาพแต่ชัดเจน" },
  {
    id: "copyright",
    label: "อธิบายลิขสิทธิ์",
    prompt: "อธิบายสิทธิ์ลูกค้าใช้งานงานนี้แบบเข้าใจง่าย",
  },
];

export function LegalGuardianPanel({
  quotation,
  usageRights,
}: {
  quotation?: Quotation | null;
  usageRights?: UsageRightsInput | null;
}) {
  const { save: saveDoc, documents } = useLegalDocuments();
  const [prompt, setPrompt] = React.useState("");
  const [reply, setReply] = React.useState("");
  const [contractDraft, setContractDraft] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [genContract, setGenContract] = React.useState(false);

  const contextBlock = React.useMemo(() => {
    if (!quotation) return "";
    return JSON.stringify(
      {
        project: quotation.projectName,
        client: quotation.clientName,
        status: quotation.status,
        contractAccepted: quotation.contractAccepted,
        usageRights: usageRights ?? null,
      },
      null,
      2,
    );
  }, [quotation, usageRights]);

  const askGuardian = async (text: string) => {
    setLoading(true);
    setReply("");
    try {
      const fullPrompt = [
        contextBlock ? `บริบทโปรเจกต์:\n${contextBlock}` : "",
        text,
        "ตอบเป็นภาษาไทย แบ่งหัวข้อ: ประเด็นความเสี่ยง, ข้อความแนะนำ, คำเตือน",
        `ปิดท้ายด้วย: "${LEGAL_DISCLAIMER}"`,
      ]
        .filter(Boolean)
        .join("\n\n");

      const { data, error } = await supabase.functions.invoke("ai-design-chat", {
        body: {
          messages: [
            {
              role: "system",
              content:
                'คุณคือ "The Guardian" — ที่ปรึกษากฎหมายเบื้องต้นสำหรับฟรีแลนซ์ไทย ด้านลิขสิทธิ์ สัญญา และการทวงเงิน',
            },
            { role: "user", content: fullPrompt },
          ],
        },
      });
      if (error) throw error;
      const content =
        (data as { reply?: string; content?: string })?.reply ??
        (data as { content?: string })?.content ??
        "ไม่ได้รับคำตอบ";
      setReply(content);
      void trackFeature("legal.guardian.ask");
      await saveDoc({
        title: text.slice(0, 80),
        body: content,
        docType: "guardian_note",
        quotationId: quotation?.id,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ปรึกษาไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const generateContract = async () => {
    if (!quotation) {
      toast.error("เลือกใบเสนอราคาก่อน");
      return;
    }
    setGenContract(true);
    setContractDraft("");
    try {
      const { data, error } = await supabase.functions.invoke("generate-contract", {
        body: {
          type: "project",
          hirer_name: quotation.clientName,
          hirer_id: quotation.clientTaxId || undefined,
          contractor_name: undefined,
          job_title: quotation.projectName,
          scope: quotation.notes || quotation.projectName,
          payment_terms: quotation.paymentTerms,
          ip_owner: usageRights?.transferOn === "never" ? "contractor" : "hirer",
          extra_notes: usageRights ? JSON.stringify(usageRights) : undefined,
        },
      });
      if (error) throw error;
      const draft = (data as { draft?: string })?.draft ?? "";
      setContractDraft(draft);
      void trackFeature("legal.contract.generate");
      await saveDoc({
        title: `ร่างสัญญา — ${quotation.projectName}`,
        body: draft,
        docType: "contract_draft",
        quotationId: quotation.id,
      });
      toast.success("ร่างสัญญาแล้ว — ตรวจสอบก่อนใช้จริง");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ร่างสัญญาไม่สำเร็จ");
    } finally {
      setGenContract(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" />
          AI The Guardian
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">ปรึกษาเรื่องสัญญา ลิขสิทธิ์ และทวงเงิน</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((q) => (
            <Button
              key={q.id}
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              disabled={loading}
              onClick={() => {
                setPrompt(q.prompt);
                void askGuardian(q.prompt);
              }}
            >
              {q.label}
            </Button>
          ))}
          {quotation && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] gap-1"
              disabled={genContract}
              onClick={() => void generateContract()}
            >
              {genContract ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <FileText className="h-3 w-3" />
              )}
              ร่างสัญญาเต็มฉบับ
            </Button>
          )}
        </div>

        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="ถาม Guardian เช่น ลูกค้าขอไฟล์ต้นฉบับก่อนจ่าย ทำยังไง?"
          rows={2}
          className="text-xs resize-none"
        />
        <Button
          size="sm"
          className="gap-1.5"
          disabled={loading || !prompt.trim()}
          onClick={() => void askGuardian(prompt.trim())}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <MessageSquare className="h-3.5 w-3.5" />
          )}
          ปรึกษา
        </Button>

        {reply && (
          <div className="rounded-lg border bg-muted/30 p-3 text-xs whitespace-pre-wrap leading-relaxed">
            {reply}
          </div>
        )}

        {contractDraft && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">
            <p className="font-semibold mb-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> ร่างสัญญา
            </p>
            {contractDraft}
          </div>
        )}

        {documents.length > 0 && (
          <div className="text-[10px] text-muted-foreground">
            บันทึกล่าสุด {documents.length} ฉบับในประวัติ
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">⚖️ {LEGAL_DISCLAIMER}</p>
      </CardContent>
    </Card>
  );
}
