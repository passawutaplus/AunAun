import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useFinance } from "@/store/finance";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { scanWhtCertificate } from "@/lib/whtScan.functions";
import { formatTHB, INCOME_TYPE_META, type IncomeType } from "@/data/mockData";
import { FileText, CheckCircle2, AlertTriangle, Search, Download } from "lucide-react";
import { escapeCSV } from "@/lib/security";
import { toast } from "sonner";
import { WhtDropzone } from "./WhtDropzone";
import { WhtScanVerifyDialog, whtDraftFromScan, type WhtDraft } from "./WhtScanVerifyDialog";
import { compressImageFile, dataUrlToBlob } from "@/lib/imageCompress";

const SIGNED_URL_TTL_SEC = 60 * 60;

function revokePreviewUrl(draft?: WhtDraft) {
  if (draft?.previewUrl) URL.revokeObjectURL(draft.previewUrl);
}

function revokeAllPreviewUrls(drafts: WhtDraft[]) {
  drafts.forEach(revokePreviewUrl);
}

export function WHTCertificates() {
  const { incomes, updateIncome, addIncome } = useFinance();
  const { user } = useAuth();
  const scanFn = useServerFn(scanWhtCertificate);
  const [filter, setFilter] = React.useState<"all" | "received" | "pending">("all");
  const [q, setQ] = React.useState("");
  const [drafts, setDrafts] = React.useState<WhtDraft[]>([]);
  const [verifyOpen, setVerifyOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState<{ current: number; total: number } | null>(null);

  function handleDraftChange(index: number, draft: WhtDraft) {
    setDrafts((prev) => {
      const next = [...prev];
      next[index] = draft;
      return next;
    });
  }

  async function handleFiles(files: File[]) {
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบก่อน");
      return;
    }
    setBusy(true);
    const newDrafts: WhtDraft[] = [];
    let okCount = 0;
    let failCount = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        let previewUrl: string | undefined;
        setProgress({ current: i + 1, total: files.length });
        try {
          let blob: Blob = f;
          let contentType = f.type || "application/octet-stream";
          let ext = (f.name.split(".").pop() ?? "bin").toLowerCase();
          previewUrl = URL.createObjectURL(f);
          if (f.type.startsWith("image/") && f.type !== "image/svg+xml") {
            const dataUrl = await compressImageFile(f);
            blob = dataUrlToBlob(dataUrl);
            contentType = "image/jpeg";
            ext = "jpg";
          }
          const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("wht-certificates")
            .upload(path, blob, { upsert: false, contentType });
          if (upErr) throw upErr;

          const { data: signed, error: sErr } = await supabase.storage
            .from("wht-certificates")
            .createSignedUrl(path, SIGNED_URL_TTL_SEC);
          if (sErr || !signed) throw sErr ?? new Error("signed url failed");

          try {
            const scan = await scanFn({ data: { storagePath: path, mimeType: contentType } });
            newDrafts.push(whtDraftFromScan(signed.signedUrl, f.name, contentType, scan, previewUrl));
            okCount++;
          } catch (e) {
            failCount++;
            const msg = e instanceof Error ? e.message : "AI อ่านไม่สำเร็จ";
            newDrafts.push({
              fileUrl: signed.signedUrl,
              previewUrl,
              fileName: f.name,
              mimeType: contentType,
              scan: null,
              error: msg,
              payerName: "",
              payerTaxId: "",
              payeeName: "",
              payeeTaxId: "",
              certificateNo: "",
              issueDate: new Date().toISOString().slice(0, 10),
              incomeType: "freelance",
              grossAmount: 0,
              whtRate: 3,
              whtAmount: 0,
              whtAmountTextThai: "",
              formType: "",
            });
          }
        } catch (e) {
          failCount++;
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          toast.error(`อัปโหลด ${f.name} ไม่สำเร็จ: ${e instanceof Error ? e.message : ""}`);
        }
      }
      if (newDrafts.length > 0) {
        setDrafts(newDrafts);
        setVerifyOpen(true);
        if (failCount === 0) {
          toast.success(`AI อ่าน ${okCount} ใบสำเร็จ · ตรวจสอบก่อนบันทึก`);
        } else if (okCount === 0) {
          toast.warning(`AI อ่านไม่สำเร็จ ${failCount} ใบ · กรุณาตรวจหรือกรอกเอง`);
        } else {
          toast.warning(`อ่านสำเร็จ ${okCount} ใบ · ล้มเหลว ${failCount} ใบ · ตรวจสอบก่อนบันทึก`);
        }
      }
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  function handleConfirm(d: WhtDraft) {
    const noteParts = [`อัปโหลดด้วย AI Scan · ${d.fileName}`];
    if (d.payeeName) noteParts.push(`ผู้ถูกหัก: ${d.payeeName}`);
    if (d.formType) noteParts.push(`ฟอร์ม: ${d.formType}`);
    addIncome({
      month: (d.issueDate || new Date().toISOString()).slice(0, 7),
      client: d.payerName,
      gross: d.grossAmount,
      withholding: d.whtAmount,
      incomeType: d.incomeType,
      whtRate: d.whtRate,
      certificateNo: d.certificateNo,
      certificateReceived: true,
      note: noteParts.join(" · "),
    });
    toast.success(`บันทึก ${d.payerName} แล้ว`);
    advance();
  }
  function handleSkip() {
    advance();
  }
  function advance() {
    setDrafts((arr) => {
      const [removed, ...next] = arr;
      revokePreviewUrl(removed);
      if (next.length === 0) setVerifyOpen(false);
      return next;
    });
  }

  function handleVerifyOpenChange(open: boolean) {
    setVerifyOpen(open);
    if (!open) {
      setDrafts((arr) => {
        revokeAllPreviewUrls(arr);
        return [];
      });
    }
  }

  // Only incomes that have withholding > 0 are eligible for 50 ทวิ
  const rows = React.useMemo(() => {
    return incomes
      .filter((i) => (i.withholding ?? 0) > 0)
      .filter((i) => {
        if (filter === "received") return !!i.certificateReceived;
        if (filter === "pending") return !i.certificateReceived;
        return true;
      })
      .filter((i) => {
        if (!q.trim()) return true;
        const s = q.toLowerCase();
        return (
          i.client.toLowerCase().includes(s) || (i.certificateNo ?? "").toLowerCase().includes(s)
        );
      })
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [incomes, filter, q]);

  const totalWithheld = rows.reduce((s, i) => s + i.withholding, 0);
  const pendingCount = incomes.filter(
    (i) => (i.withholding ?? 0) > 0 && !i.certificateReceived,
  ).length;

  function exportCSV() {
    const headers = [
      "เดือน",
      "ลูกค้า",
      "ประเภทเงินได้",
      "มาตรา",
      "ยอด Gross",
      "อัตรา WHT",
      "หัก ณ ที่จ่าย",
      "เลขใบ 50ทวิ",
      "สถานะ",
    ];
    const data = rows.map((i) => {
      const meta = INCOME_TYPE_META[(i.incomeType ?? "freelance") as IncomeType];
      return [
        i.month,
        i.client,
        meta.label,
        meta.section,
        i.gross.toFixed(2),
        `${i.whtRate ?? 3}%`,
        i.withholding.toFixed(2),
        i.certificateNo ?? "",
        i.certificateReceived ? "ได้รับแล้ว" : "รอใบ",
      ];
    });
    const csv = [headers, ...data].map((r) => r.map(escapeCSV).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wht-certificates-${new Date().getFullYear()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("ดาวน์โหลด CSV ใบ 50 ทวิ เรียบร้อย");
  }

  return (
    <Card className="animate-fade-up">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            ใบหักภาษี ณ ที่จ่าย (50 ทวิ)
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs">
          <span className="text-muted-foreground">รวมหัก ณ ที่จ่าย</span>
          <span className="num font-semibold text-success">฿{formatTHB(totalWithheld)}</span>
          {pendingCount > 0 && (
            <Badge
              variant="outline"
              className="ml-auto bg-warning/10 text-warning border-warning/30 gap-1"
            >
              <AlertTriangle className="h-3 w-3" /> รอใบ {pendingCount} รายการ
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <WhtDropzone onFiles={handleFiles} busy={busy} progress={progress} />
        <WhtScanVerifyDialog
          open={verifyOpen}
          onOpenChange={handleVerifyOpenChange}
          drafts={drafts}
          onDraftChange={handleDraftChange}
          onConfirm={handleConfirm}
          onSkip={handleSkip}
        />

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาลูกค้า / เลขใบ"
              className="h-8 pl-7 text-sm"
            />
          </div>
          <div className="flex gap-1">
            {(["all", "received", "pending"] as const).map((k) => (
              <Button
                key={k}
                size="sm"
                variant={filter === k ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => setFilter(k)}
              >
                {k === "all" ? "ทั้งหมด" : k === "received" ? "ได้รับแล้ว" : "รอใบ"}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5 max-h-[320px] overflow-auto">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">ไม่มีรายการ</p>
          ) : (
            rows.map((i) => {
              const meta = INCOME_TYPE_META[(i.incomeType ?? "freelance") as IncomeType];
              return (
                <div
                  key={i.id}
                  className="flex items-center gap-3 rounded-xl border border-border/60 p-2.5 hover:border-primary/40 transition-colors"
                >
                  <div
                    className={`rounded-lg p-2 ${i.certificateReceived ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}
                  >
                    {i.certificateReceived ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{i.client}</p>
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        {meta.section}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground num">
                      {i.month} • {meta.label}
                      {i.certificateNo && <> • #{i.certificateNo}</>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="num text-sm font-semibold">฿{formatTHB(i.withholding)}</p>
                    <p className="text-[10px] text-muted-foreground num">
                      {i.whtRate ?? 3}% ของ ฿{formatTHB(i.gross)}
                    </p>
                  </div>
                  <Switch
                    checked={!!i.certificateReceived}
                    onCheckedChange={(v) => updateIncome(i.id, { certificateReceived: v })}
                  />
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
