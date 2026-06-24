import * as React from "react";
import { Scale, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageFooterActions } from "@/components/dashboard/PageFooterActions";
import {
  CLIENT_MESSAGE_TEMPLATES,
  LEGAL_INTRO,
  LEGAL_SCENARIOS,
  PRE_DELIVERY_CHECKLIST,
} from "@/data/legalScenarios";
import { LEGAL_DISCLAIMER } from "@/lib/usageRightsSchema";
import { LegalScenarioCards } from "./LegalScenarioCards";
import { LegalChecklist } from "./LegalChecklist";
import { LegalGuardianPanel } from "./LegalGuardianPanel";
import { toast } from "sonner";

export function LegalDeskTab({
  onNavigate,
}: {
  onNavigate?: (section: string, sub?: string) => void;
}) {
  const [copied, setCopied] = React.useState<string | null>(null);

  const copyTemplate = async (id: string, body: string) => {
    await navigator.clipboard.writeText(body);
    setCopied(id);
    toast.success("คัดลอกข้อความแล้ว");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          Legal Desk
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          ศูนย์กลางกฎหมายและลิขสิทธิ์สำหรับฟรีแลนซ์ — อ่านง่าย ไม่น่ากลัว
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 text-[11px] text-muted-foreground">
          ⚖️ {LEGAL_DISCLAIMER}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{LEGAL_INTRO.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {LEGAL_INTRO.points.map((p) => (
            <div key={p.term} className="rounded-lg border px-3 py-2">
              <p className="text-xs font-semibold text-primary">{p.term}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">สถานการณ์จริงที่เจอบ่อย</h3>
        <LegalScenarioCards scenarios={LEGAL_SCENARIOS} onNavigate={onNavigate} />
      </section>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">เช็กลิสต์ก่อนส่งงาน</CardTitle>
        </CardHeader>
        <CardContent>
          <LegalChecklist checklistId="pre_delivery_v1" items={PRE_DELIVERY_CHECKLIST} />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">ข้อความส่งลูกค้า (คัดลอกได้)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CLIENT_MESSAGE_TEMPLATES.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold">{t.title}</p>
                <p className="text-[11px] text-muted-foreground whitespace-pre-wrap line-clamp-4">
                  {t.body}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] gap-1"
                  onClick={() => void copyTemplate(t.id, t.body)}
                >
                  {copied === t.id ? (
                    <Check className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  คัดลอก
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <LegalGuardianPanel />

      <p className="text-[11px] text-muted-foreground px-1">
        ตั้งสิทธิลิขสิทธิ์ใน Pipeline → เปิดดีล → ปุ่ม &quot;ตั้งสิทธิ์ลิขสิทธิ์&quot;
      </p>

      <PageFooterActions feature="legal-desk" label="Legal Desk" />
    </div>
  );
}
