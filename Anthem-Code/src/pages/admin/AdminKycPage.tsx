import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ExternalLink, Bot, ImageIcon, FileText } from "lucide-react";
import { toast } from "sonner";
import { CompactLoader } from "@/components/ui/BanterLoader";
import SectionHeader from "@/components/admin/SectionHeader";
import KpiCard from "@/components/admin/KpiCard";
import {
  AdminKycGuidePanel,
  AdminKycReviewChecklist,
} from "@/components/admin/AdminKycReviewGuide";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  useAdminKycList,
  useAdminKycCounts,
  useAdminKycDocuments,
  useAdminApproveKyc,
  useAdminRejectKyc,
  type KycRequest,
} from "@/hooks/useKyc";
import { getKycSignedUrl } from "@/lib/kycUpload";
import { maskBankAccount } from "@/lib/kycPdpa";
import { logKycAdminAccess } from "@/lib/adminAudit";
import { formatThaiDate } from "@/lib/format";
import { formatKycAddress, formatThaiNationalId, maskThaiIdLaserCode, KYC_PEP_STATUS_LABELS, KYC_SANCTIONS_STATUS_LABELS, type KycSanctionsStatus } from "@/lib/kycIdentity";
import { KYC_REJECT_REASONS, KYC_REJECT_REASON_GROUPS } from "@/lib/kycRejectReasons";
import {
  allKycReviewChecksPassed,
  emptyKycReviewChecks,
  type KycReviewCheckId,
} from "@/lib/adminKycReviewGuide";
import { kycRiskTone, kycScoreClass } from "@/lib/reportAiTriage";

type Status = "pending" | "approved" | "rejected";

const Avatar = ({ url, name }: { url?: string | null; name?: string | null }) =>
  url ? (
    <img loading="lazy" decoding="async" src={url} alt="" className="w-7 h-7 rounded-full object-cover" />
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
          คะแนน {item.ai_risk_score}/100
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
      {docs.data.map((d) => {
        const isPdf = d.storage_path.toLowerCase().endsWith(".pdf");
        return (
        <a
          key={d.doc_type}
          href={urls[d.doc_type]}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => void logKycAdminAccess(requestId, "document_open", { doc_type: d.doc_type })}
          className="block rounded-lg border border-admin-border overflow-hidden bg-admin-hover/30 hover:ring-2 hover:ring-admin-accent/40"
        >
          {urls[d.doc_type] && !isPdf ? (
            <img loading="lazy" decoding="async" src={urls[d.doc_type]} alt={d.doc_type} className="w-full h-28 object-cover" />
          ) : (
            <div className="h-28 flex flex-col items-center justify-center gap-1 text-admin-muted">
              {isPdf ? <FileText className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
              {isPdf && <span className="text-[10px]">เปิด PDF</span>}
            </div>
          )}
          <p className="text-[10px] px-2 py-1 text-admin-muted">
            {d.doc_type === "id_front"
              ? "บัตรด้านหน้า"
              : d.doc_type === "id_back"
                ? "บัตรด้านหลัง"
                : d.doc_type === "selfie"
                  ? "เซลฟี่ถือบัตร"
                  : d.doc_type === "bank_book"
                    ? "สมุดบัญชี"
                    : d.doc_type}
          </p>
        </a>
        );
      })}
    </div>
  );
}

export default function AdminKycPage() {
  const [tab, setTab] = useState<Status>("pending");
  const list = useAdminKycList(tab);
  const counts = useAdminKycCounts();
  const approve = useAdminApproveKyc();
  const reject = useAdminRejectKyc();

  const [reviewItem, setReviewItem] = useState<(KycRequest & { profile?: any }) | null>(null);
  const [note, setNote] = useState("");
  const [rejectIntent, setRejectIntent] = useState(false);
  const [rejectReasons, setRejectReasons] = useState<string[]>([]);
  const [reviewChecks, setReviewChecks] = useState(emptyKycReviewChecks);

  const openReview = (r: KycRequest & { profile?: any }) => {
    setReviewItem(r);
    setNote("");
    setRejectIntent(false);
    setRejectReasons([]);
    setReviewChecks(emptyKycReviewChecks());
    void logKycAdminAccess(r.id, "review_open");
  };

  const setCheck = (id: KycReviewCheckId, value: boolean) => {
    setReviewChecks((prev) => ({ ...prev, [id]: value }));
  };

  const markAllChecks = () => {
    const next = emptyKycReviewChecks();
    (Object.keys(next) as KycReviewCheckId[]).forEach((id) => {
      next[id] = true;
    });
    setReviewChecks(next);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="security"
        title="KYC — ยืนยันตัวตนผู้ใช้"
        description="AI สรุปความเสี่ยงให้แล้ว — แอดมินตรวจเอกสารและกดอนุมัติ (เข้าถึงข้อมูลส่วนบุคคลตาม PDPA เท่าที่จำเป็น)"
      />

      <AdminKycGuidePanel />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <button type="button" className="text-left" onClick={() => setTab("approved")}>
          <KpiCard
            label="ผ่านแล้ว"
            value={counts.data?.verified ?? "—"}
            icon={ShieldCheck}
            accent
            delta="โปรไฟล์ที่ยืนยันแล้ว"
          />
        </button>
        <button type="button" className="text-left" onClick={() => setTab("pending")}>
          <KpiCard label="รอตรวจสอบ" value={counts.data?.pending ?? "—"} delta="คิวตรวจ" />
        </button>
        <button type="button" className="text-left" onClick={() => setTab("rejected")}>
          <KpiCard label="ถูกปฏิเสธ" value={counts.data?.rejected ?? "—"} />
        </button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Status)}>
        <TabsList>
          <TabsTrigger value="pending">รอตรวจสอบ ({counts.data?.pending ?? 0})</TabsTrigger>
          <TabsTrigger value="approved">อนุมัติแล้ว ({counts.data?.approved ?? 0})</TabsTrigger>
          <TabsTrigger value="rejected">ถูกปฏิเสธ ({counts.data?.rejected ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <div className="border border-admin-border rounded-sm overflow-hidden bg-admin-surface">
            {list.isLoading ? (
              <div className="py-10">
                <CompactLoader label="กำลังโหลดคำขอ..." labelClassName="text-admin-muted" />
              </div>
            ) : list.isError ? (
              <p className="text-center py-8 text-sm text-destructive px-4">
                โหลดรายการไม่สำเร็จ — รีเฟรชแล้วลองใหม่
              </p>
            ) : (
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
                    return (a.ai_risk_score ?? 100) - (b.ai_risk_score ?? 100);
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
                        <span className={kycScoreClass(r.ai_risk_score)}>
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
                          onClick={() => openReview(r)}
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
            )}
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
                  <dt className="text-muted-foreground text-xs">ชื่อตามเอกสาร</dt>
                  <dd>{reviewItem.legal_name || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">เลขบัตรประชาชน</dt>
                  <dd className="font-mono tracking-wide">
                    {reviewItem.national_id_number
                      ? formatThaiNationalId(reviewItem.national_id_number)
                      : "—"}
                  </dd>
                </div>
                {typeof reviewItem.submission_meta?.id_laser_code === "string" &&
                  reviewItem.submission_meta.id_laser_code.trim() && (
                  <div>
                    <dt className="text-muted-foreground text-xs">เลขหลังบัตร (คำขอเก่า)</dt>
                    <dd className="font-mono">
                      {maskThaiIdLaserCode(reviewItem.submission_meta.id_laser_code)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted-foreground text-xs">วันเกิด / สัญชาติ</dt>
                  <dd className="text-xs">
                    {reviewItem.date_of_birth || "—"} · {reviewItem.nationality || "TH"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">PEP / Sanctions</dt>
                  <dd className="text-xs space-y-1">
                    {(() => {
                      const meta = (reviewItem.submission_meta ?? {}) as Record<string, unknown>;
                      const pepStatus = typeof meta.pep_status === "string" ? (meta.pep_status as string) : null;
                      const sanctionsStatus =
                        typeof meta.sanctions_status === "string" ? (meta.sanctions_status as KycSanctionsStatus) : null;
                      const pepEdd = meta.pep_edd as Record<string, string> | undefined;
                      const sanctionsEdd = meta.sanctions_edd as Record<string, string> | undefined;
                      const pepLabel =
                        pepStatus === "yes" || pepStatus === "self" || pepStatus === "associate"
                          ? KYC_PEP_STATUS_LABELS.yes
                          : pepStatus === "none"
                            ? KYC_PEP_STATUS_LABELS.none
                            : null;
                      return (
                        <>
                          <p>
                            PEP:{" "}
                            {pepLabel
                              ? pepLabel
                              : reviewItem.pep_declaration
                                ? "รับรองข้อมูลแล้ว"
                                : "—"}
                          </p>
                          {pepEdd && (pepEdd.position || pepEdd.organization) && (
                            <p className="text-muted-foreground">
                              EDD PEP: {[pepEdd.position, pepEdd.organization, pepEdd.relationship].filter(Boolean).join(" · ")}
                              {pepEdd.leftAt ? ` · พ้นตำแหน่ง ${pepEdd.leftAt}` : ""}
                            </p>
                          )}
                          <p>
                            Sanctions:{" "}
                            {sanctionsStatus && KYC_SANCTIONS_STATUS_LABELS[sanctionsStatus]
                              ? KYC_SANCTIONS_STATUS_LABELS[sanctionsStatus]
                              : reviewItem.sanctions_declaration
                                ? "รับรองข้อมูลแล้ว"
                                : "—"}
                          </p>
                          {sanctionsEdd?.detail && (
                            <p className="text-muted-foreground">
                              EDD Sanctions: {sanctionsEdd.detail}
                              {[sanctionsEdd.listName, sanctionsEdd.country].filter(Boolean).length
                                ? ` · ${[sanctionsEdd.listName, sanctionsEdd.country].filter(Boolean).join(" / ")}`
                                : ""}
                            </p>
                          )}
                          {!!meta.edd_required && (
                            <p className="text-amber-600 dark:text-amber-400 font-medium">ต้อง Enhanced Due Diligence</p>
                          )}
                        </>
                      );
                    })()}
                  </dd>
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
                {reviewItem.kyc_expires_at && (
                  <div className="col-span-2">
                    <dt className="text-muted-foreground text-xs">KYC หมดอายุ</dt>
                    <dd className="text-xs">{formatThaiDate(reviewItem.kyc_expires_at)}</dd>
                  </div>
                )}
              </dl>
              <KycDocumentGrid requestId={reviewItem.id} />
              <AdminKycReviewChecklist
                checks={reviewChecks}
                onChange={setCheck}
                onMarkAll={markAllChecks}
                onClearAll={() => setReviewChecks(emptyKycReviewChecks())}
              />
              <div className="space-y-2 rounded-lg border border-border p-3">
                <label htmlFor="kyc-reject-intent" className="flex items-start gap-2.5 cursor-pointer">
                  <Checkbox
                    id="kyc-reject-intent"
                    checked={rejectIntent}
                    onCheckedChange={(v) => {
                      const on = v === true;
                      setRejectIntent(on);
                      if (!on) setRejectReasons([]);
                    }}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="text-sm font-medium">จะปฏิเสธคำขอนี้</span>
                    <span className="block text-[11px] text-muted-foreground mt-0.5">
                      ติ๊กก่อน แล้วเลือกเหตุผลได้หลายข้อ จึงกดปฏิเสธได้
                    </span>
                  </span>
                </label>
                {rejectIntent && (
                  <div className="space-y-3 pt-1 pl-6">
                    <Label className="text-xs text-muted-foreground">เหตุผลปฏิเสธ (เลือกได้หลายข้อ)</Label>
                    <div className="space-y-3">
                      {KYC_REJECT_REASON_GROUPS.map((group) => (
                        <div key={group.heading} className="border-t border-border pt-2 first:border-t-0 first:pt-0">
                          <p className="text-[11px] font-medium text-muted-foreground mb-1.5">
                            {group.heading}
                          </p>
                          <ul className="divide-y divide-border/80 rounded-md border border-border/70 overflow-hidden">
                            {group.codes.map((code) => {
                              const r = KYC_REJECT_REASONS.find((item) => item.code === code);
                              if (!r) return null;
                              const id = `kyc-reject-${r.code}`;
                              const checked = rejectReasons.includes(r.code);
                              return (
                                <li key={r.code} className="bg-background">
                                  <label
                                    htmlFor={id}
                                    className="flex items-start gap-2 cursor-pointer text-sm px-2.5 py-2 hover:bg-muted/40"
                                  >
                                    <Checkbox
                                      id={id}
                                      checked={checked}
                                      onCheckedChange={(v) => {
                                        const on = v === true;
                                        setRejectReasons((prev) =>
                                          on ? [...prev, r.code] : prev.filter((c) => c !== r.code),
                                        );
                                      }}
                                      className="mt-0.5"
                                    />
                                    <span>{r.label}</span>
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Textarea
                placeholder={
                  rejectIntent
                    ? rejectReasons.includes("other")
                      ? "ระบุเหตุผลในการปฏิเสธ"
                      : "บันทึกแอดมิน (ทางเลือก)"
                    : "บันทึกแอดมิน (ทางเลือก)"
                }
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
                if (!rejectIntent) {
                  toast.error("ติ๊ก “จะปฏิเสธคำขอนี้” ก่อน");
                  return;
                }
                const reasons = KYC_REJECT_REASONS.filter((r) => rejectReasons.includes(r.code));
                if (!reasons.length) {
                  toast.error("เลือกเหตุผลปฏิเสธอย่างน้อย 1 ข้อ");
                  return;
                }
                if (reasons.some((r) => r.code === "other") && !note.trim()) {
                  toast.error("กรุณาระบุเหตุผลในหมายเหตุ");
                  return;
                }
                reject.mutate(
                  {
                    id: reviewItem.id,
                    note,
                    reasonCodes: reasons.map((r) => r.code),
                    reasonLabels: reasons.map((r) => r.label),
                  },
                  {
                    onSuccess: () => {
                      toast.success("ปฏิเสธคำขอแล้ว");
                      setReviewItem(null);
                      setNote("");
                      setRejectIntent(false);
                      setRejectReasons([]);
                      setReviewChecks(emptyKycReviewChecks());
                    },
                    onError: (e: Error) => toast.error(e.message),
                  },
                );
              }}
              disabled={
                reject.isPending ||
                approve.isPending ||
                !rejectIntent ||
                rejectReasons.length === 0 ||
                (rejectReasons.includes("other") && !note.trim())
              }
            >
              ปฏิเสธ
            </Button>
            <Button
              onClick={() => {
                if (!reviewItem) return;
                if (rejectIntent) {
                  toast.error("เอาติ๊กปฏิเสธออกก่อนถ้าจะอนุมัติ");
                  return;
                }
                if (!allKycReviewChecksPassed(reviewChecks)) {
                  toast.error("ติ๊ก checklist ให้ครบ 8 ข้อก่อนอนุมัติ");
                  return;
                }
                approve.mutate(
                  { id: reviewItem.id, note },
                  {
                    onSuccess: () => {
                      toast.success("ยืนยันตัวตนแล้ว");
                      setReviewItem(null);
                      setNote("");
                      setRejectIntent(false);
                      setRejectReasons([]);
                      setReviewChecks(emptyKycReviewChecks());
                    },
                    onError: (e: Error) => toast.error(e.message),
                  },
                );
              }}
              disabled={approve.isPending || reject.isPending || rejectIntent}
            >
              อนุมัติ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
