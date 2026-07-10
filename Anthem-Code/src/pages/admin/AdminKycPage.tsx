import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ExternalLink, Bot, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { CompactLoader } from "@/components/ui/BanterLoader";
import SectionHeader from "@/components/admin/SectionHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  useAdminKycList,
  useAdminKycDocuments,
  useAdminApproveKyc,
  useAdminRejectKyc,
  type KycRequest,
} from "@/hooks/useKyc";
import { getKycSignedUrl } from "@/lib/kycUpload";
import { maskBankAccount } from "@/lib/kycPdpa";
import { logKycAdminAccess } from "@/lib/adminAudit";
import { formatThaiDate } from "@/lib/format";
import { formatKycAddress, maskThaiNationalId } from "@/lib/kycIdentity";
import { KYC_REJECT_REASONS } from "@/lib/kycRejectReasons";
import { kycRiskTone } from "@/lib/reportAiTriage";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Status = "pending" | "approved" | "rejected";

const Avatar = ({ url, name }: { url?: string | null; name?: string | null }) =>
  url ? (
    <img src={url} alt="" className="w-7 h-7 rounded-full object-cover" />
  ) : (
    <div className="w-7 h-7 rounded-full bg-admin-hover text-admin-muted flex items-center justify-center text-xs font-medium">
      {(name ?? "?")[0]}
    </div>
  );

const STATUS_CLASS: Record<Status, string> = {
  pending: "bg-amber-500/15 text-amber-600",
  approved: "bg-emerald-500/15 text-emerald-600",
  rejected: "bg-destructive/15 text-destructive",
};

const AI_REC_LABEL: Record<string, string> = {
  approve: "แนะนำอนุมัติ",
  review: "ควรตรวจสอบ",
  reject_or_review: "ความเสี่ยงสูง",
};

function AiSummaryCard({ item }: { item: KycRequest }) {
  if (item.ai_risk_score == null && !item.ai_summary) return null;
  return (
    <div className="rounded-lg border border-admin-border bg-admin-hover/20 p-3 space-y-1">
      <p className="text-xs font-medium flex items-center gap-1.5 text-admin-accent">
        <Bot className="w-3.5 h-3.5" /> AI Pre-review
      </p>
      {item.ai_risk_score != null && (
        <p className="text-xs text-admin-muted">
          ความเสี่ยง {item.ai_risk_score}/100
          {item.ai_recommendation && ` · ${AI_REC_LABEL[item.ai_recommendation] ?? item.ai_recommendation}`}
        </p>
      )}
      {item.ai_summary && <p className="text-sm">{item.ai_summary}</p>}
    </div>
  );
}

function KycDocumentGrid({ requestId }: { requestId: string }) {
  const docs = useAdminKycDocuments(requestId);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!docs.data?.length) return;
    let cancelled = false;
    void logKycAdminAccess(requestId, "documents_load", {
      doc_types: docs.data.map((d) => d.doc_type),
    });
    (async () => {
      const next: Record<string, string> = {};
      for (const d of docs.data) {
        const url = await getKycSignedUrl(d.storage_path);
        if (url) next[d.doc_type] = url;
      }
      if (!cancelled) setUrls(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [docs.data, requestId]);

  if (docs.isLoading) return <CompactLoader label="กำลังโหลดเอกสาร..." labelClassName="text-admin-muted" />;
  if (!docs.data?.length) return <p className="text-xs text-admin-muted">ไม่มีไฟล์แนบ</p>;

  return (
    <div className="grid grid-cols-2 gap-2">
      {docs.data.map((d) => (
        <a
          key={d.doc_type}
          href={urls[d.doc_type]}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => void logKycAdminAccess(requestId, "document_open", { doc_type: d.doc_type })}
          className="block rounded-lg border border-admin-border overflow-hidden bg-admin-hover/30 hover:ring-2 hover:ring-admin-accent/40"
        >
          {urls[d.doc_type] ? (
            <img src={urls[d.doc_type]} alt={d.doc_type} className="w-full h-28 object-cover" />
          ) : (
            <div className="h-28 flex items-center justify-center text-admin-muted">
              <ImageIcon className="w-6 h-6" />
            </div>
          )}
          <p className="text-[10px] px-2 py-1 text-admin-muted">{d.doc_type}</p>
        </a>
      ))}
    </div>
  );
}

export default function AdminKycPage() {
  const [tab, setTab] = useState<Status>("pending");
  const list = useAdminKycList(tab);
  const approve = useAdminApproveKyc();
  const reject = useAdminRejectKyc();

  const [reviewItem, setReviewItem] = useState<(KycRequest & { profile?: any }) | null>(null);
  const [note, setNote] = useState("");
  const [rejectReason, setRejectReason] = useState("blurry_id");
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="security"
        title="KYC — ยืนยันตัวตนผู้ใช้"
        description="AI สรุปความเสี่ยงให้แล้ว — แอดมินตรวจเอกสารและกดอนุมัติ (เข้าถึงข้อมูลส่วนบุคคลตาม PDPA เท่าที่จำเป็น)"
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Status)}>
        <TabsList>
          <TabsTrigger value="pending">รอตรวจสอบ</TabsTrigger>
          <TabsTrigger value="approved">อนุมัติแล้ว</TabsTrigger>
          <TabsTrigger value="rejected">ถูกปฏิเสธ</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <div className="border border-admin-border rounded-sm overflow-hidden bg-admin-surface">
            <table className="w-full text-sm">
              <thead className="bg-admin-hover/40 text-[11px] uppercase tracking-wider text-admin-muted">
                <tr>
                  <th className="text-left font-normal px-3 py-2">ผู้ใช้</th>
                  <th className="text-left font-normal px-3 py-2">ข้อมูล</th>
                  <th className="text-left font-normal px-3 py-2">AI</th>
                  <th className="text-left font-normal px-3 py-2">สถานะ</th>
                  <th className="text-right font-normal px-3 py-2">ส่งเมื่อ</th>
                  <th className="text-right font-normal px-3 py-2">การกระทำ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
                {[...(list.data ?? [])]
                  .sort((a, b) => {
                    if (tab !== "pending") return 0;
                    return (b.ai_risk_score ?? 0) - (a.ai_risk_score ?? 0);
                  })
                  .map((r: KycRequest & { profile?: any }) => {
                  const highRisk = tab === "pending" && kycRiskTone(r.ai_risk_score) === "high";
                  return (
                  <tr
                    key={r.id}
                    className={`hover:bg-admin-hover/30 ${highRisk ? "bg-destructive/5 ring-1 ring-inset ring-destructive/20" : ""}`}
                  >
                    <td className="px-3 py-2">
                      <Link to={`/u/${r.user_id}`} target="_blank" className="flex items-center gap-2 hover:text-admin-accent">
                        <Avatar url={r.profile?.avatar_url} name={r.profile?.display_name} />
                        <div>
                          <p className="text-sm">{r.profile?.display_name ?? r.user_id.slice(0, 8)}</p>
                          <p className="text-[11px] text-admin-muted">{r.profile?.email ?? "—"}</p>
                        </div>
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-xs text-admin-muted max-w-[200px]">
                      <p className="truncate">{r.legal_name || r.contact_note || "—"}</p>
                      {r.bank_name && (
                        <p className="truncate">
                          {r.bank_name} {maskBankAccount(r.account_number)}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.ai_risk_score != null ? (
                        <span className={r.ai_risk_score <= 15 ? "text-emerald-600" : r.ai_risk_score <= 40 ? "text-amber-600" : "text-destructive"}>
                          {r.ai_risk_score}/100
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Badge className={`${STATUS_CLASS[r.status as Status]} border-0 text-[10px]`}>{r.status}</Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-admin-muted text-right whitespace-nowrap">
                      {formatThaiDate(r.submitted_at)}
                    </td>
                    <td className="px-3 py-2 text-right space-x-1">
                      {r.status === "pending" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReviewItem(r);
                            setNote("");
                            setRejectReason("blurry_id");
                            void logKycAdminAccess(r.id, "review_open");
                          }}
                        >
                          <ShieldCheck className="w-3 h-3 mr-1" /> ตรวจสอบ
                        </Button>
                      ) : (
                        <span className="text-xs text-admin-muted">{r.admin_note || "—"}</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
                {(list.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-admin-muted text-sm">
                      ไม่มีรายการ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!reviewItem} onOpenChange={(o) => !o && setReviewItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ตรวจ KYC: {reviewItem?.profile?.display_name ?? reviewItem?.legal_name}</DialogTitle>
          </DialogHeader>
          {reviewItem && (
            <div className="space-y-4">
              <AiSummaryCard item={reviewItem} />
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs">ชื่อตามบัตร</dt>
                  <dd>{reviewItem.legal_name || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">เลขบัตร</dt>
                  <dd className="font-mono">{maskThaiNationalId(reviewItem.national_id_number)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">ติดต่อ</dt>
                  <dd>
                    {reviewItem.phone || "—"}
                    <br />
                    <span className="text-xs text-muted-foreground">{reviewItem.contact_email}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">ที่อยู่</dt>
                  <dd className="text-xs">{formatKycAddress(reviewItem.address_json)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground text-xs">บัญชี</dt>
                  <dd>
                    {reviewItem.bank_name} {reviewItem.account_number} ({reviewItem.account_name})
                  </dd>
                </div>
              </dl>
              <KycDocumentGrid requestId={reviewItem.id} />
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">เหตุผลปฏิเสธ (ถ้ากดปฏิเสธ)</Label>
                <Select value={rejectReason} onValueChange={setRejectReason}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KYC_REJECT_REASONS.map((r) => (
                      <SelectItem key={r.code} value={r.code}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="บันทึกแอดมิน (ทางเลือก) หรือเหตุผลในการปฏิเสธ"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setReviewItem(null)}>
              ยกเลิก
            </Button>
            <Button
              variant="outline"
              className="border-destructive text-destructive"
              onClick={() => {
                if (!reviewItem) return;
                const reason = KYC_REJECT_REASONS.find((r) => r.code === rejectReason)!;
                if (reason.code === "other" && !note.trim()) {
                  toast.error("กรุณาระบุเหตุผลในหมายเหตุ");
                  return;
                }
                reject.mutate(
                  {
                    id: reviewItem.id,
                    note,
                    reasonCode: reason.code,
                    reasonLabel: reason.label,
                  },
                  {
                    onSuccess: () => {
                      toast.success("ปฏิเสธคำขอแล้ว");
                      setReviewItem(null);
                      setNote("");
                    },
                    onError: (e: Error) => toast.error(e.message),
                  },
                );
              }}
              disabled={reject.isPending || approve.isPending}
            >
              ปฏิเสธ
            </Button>
            <Button
              onClick={() => {
                if (!reviewItem) return;
                approve.mutate(
                  { id: reviewItem.id, note },
                  {
                    onSuccess: () => {
                      toast.success("ยืนยันตัวตนแล้ว");
                      setReviewItem(null);
                      setNote("");
                    },
                    onError: (e: Error) => toast.error(e.message),
                  },
                );
              }}
              disabled={approve.isPending || reject.isPending}
            >
              อนุมัติ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
