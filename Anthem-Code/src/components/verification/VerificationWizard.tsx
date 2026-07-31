import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Home,
  IdCard,
  Landmark,
  Loader2,
  RefreshCw,
  SwitchCamera,
  User,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyKycRequests, useSubmitKycVerification } from "@/hooks/useKyc";
import { uploadKycDocument, KYC_FILE_ACCEPT, KYC_FILE_HINT, type KycDocType } from "@/lib/kycUpload";
import { LEGAL_DPO_EMAIL } from "@/lib/legalConfig";
import {
  formatThaiNationalId,
  formatThaiIdLaserCode,
  isAdultDateOfBirth,
  isKycExpired,
  isValidThaiIdLaserCode,
  isValidThaiNationalId,
  isValidThaiPhone,
  KYC_CONFIRM_PHRASE,
  maskThaiNationalId,
  needsPepEdd,
  resolveKycExpiresAt,
  type KycAddress,
  type KycPepEddFields,
  type KycPepStatus,
  type KycSanctionsEddFields,
  type KycSanctionsStatus,
} from "@/lib/kycIdentity";
import { maskBankAccount, KYC_PDPA_CONSENT_VERSION } from "@/lib/kycPdpa";
import { SelfieCapture } from "@/components/verification/SelfieCapture";
import { BookBankPageExample } from "@/components/verification/BookBankPageExample";
import { SelfieExample } from "@/components/verification/KycDocExamples";
import { KycOcrStatusPanel } from "@/components/verification/KycOcrStatusPanel";
import { KycAiValidationPanel } from "@/components/verification/KycAiValidationPanel";
import { KycReviewSubmitPanel } from "@/components/verification/KycReviewSubmitPanel";
import { KycPdpaConsentReader } from "@/components/verification/KycPdpaConsentReader";
import { isDemoMode } from "@/lib/demoMode";
import { mergeOcrFields, runKycIdOcr, type KycOcrFields } from "@/lib/kycOcr";
import {
  analyzeKycImageQuality,
  type KycQualityDocKind,
  type KycQualityResult,
} from "@/lib/kycImageQuality";
import { cn } from "@/lib/utils";

const STEPS = ["ติดต่อ", "ตัวตน", "บัญชี", "ส่งตรวจ"] as const;

const DOC_LABELS: Record<KycDocType, string> = {
  id_front: "บัตรประชาชน (ด้านหน้า) *",
  id_back: "บัตรประชาชน (ด้านหลัง) *",
  selfie: "Selfie ใบหน้า *",
  bank_book: "Book Bank Page [หน้าสมุดบัญชี] *",
};

type DocState = Partial<Record<KycDocType, string>>;
type PreviewState = Partial<Record<KycDocType, string>>;
type PreviewKindState = Partial<Record<KycDocType, "image" | "pdf">>;

const emptyPepEdd = (): KycPepEddFields => ({
  position: "",
  organization: "",
  leftAt: "",
  relationship: "",
});

const emptySanctionsEdd = (): KycSanctionsEddFields => ({
  detail: "",
  listName: "",
  country: "",
});

function maskThaiNationalIdReview(value: string): string {
  const d = value.replace(/\D/g, "");
  if (d.length < 5) return maskThaiNationalId(value);
  return `${d[0]}-${d.slice(1, 5)}-xxxxx-xx-x`;
}

function maskContactEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  if (local.length <= 3) return `${local}...`;
  return `${local.slice(0, Math.min(8, local.length))}...`;
}

function maskThaiPhoneReview(value: string): string {
  const d = value.replace(/\D/g, "");
  if (d.length < 4) return "··········";
  return `${d.slice(0, 3)}-xxx-${d.slice(-4)}`;
}

function normalizePersonName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ก-๙]/g, "");
}

function accountNameLooksMatched(accountName: string, legalName: string): boolean {
  const a = normalizePersonName(accountName);
  const b = normalizePersonName(legalName);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function faceMatchPercent(quality: KycQualityResult | null): number | null {
  if (!quality?.checks.length) return null;
  const scores = quality.checks.map((c) => c.score).filter((n) => Number.isFinite(n));
  if (!scores.length) return null;
  return Math.round(scores.reduce((s, n) => s + n, 0) / scores.length);
}

function DocUploadTile({
  docType,
  preview,
  previewKind,
  uploading,
  uploaded,
  onPick,
  allowCamera = false,
}: {
  docType: KycDocType;
  preview?: string;
  previewKind?: "image" | "pdf";
  uploading: boolean;
  uploaded: boolean;
  onPick: (file: File | undefined) => void;
  allowCamera?: boolean;
}) {
  const label = DOC_LABELS[docType];
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  useEffect(() => () => stopCamera(), []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraOn(true);
      } catch {
        setCameraError("เปิดกล้องไม่ได้ — ใช้อัปโหลดไฟล์แทน");
        stopCamera();
      }
    }
  };

  const snap = () => {
    const video = videoRef.current;
    if (!video || !cameraOn) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stopCamera();
        onPick(new File([blob], `${docType}-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  };

  if (allowCamera && cameraOn) {
    return (
      <div className="rounded-xl border border-border overflow-hidden bg-black">
        <video ref={videoRef} playsInline muted className="w-full h-40 object-cover" />
        <div className="p-2 flex gap-2 bg-background">
          <Button type="button" size="sm" variant="outline" className="rounded-full text-sm h-10" onClick={stopCamera}>
            ยกเลิก
          </Button>
          <Button type="button" size="sm" className="rounded-full flex-1 text-sm h-10" onClick={snap} disabled={uploading}>
            <Camera className="w-4 h-4 mr-1" /> ถ่ายภาพ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border border-dashed border-border overflow-hidden min-h-[140px]",
        preview || uploaded ? "border-primary/40" : "",
      )}
    >
      {preview && previewKind === "image" ? (
        <img src={preview} alt={label} className="w-full h-28 object-cover" />
      ) : preview && previewKind === "pdf" ? (
        <div className="flex flex-col items-center justify-center gap-2 flex-1 p-4 min-h-[112px] bg-muted/30">
          <FileText className="w-8 h-8 text-primary" />
          <span className="text-sm text-muted-foreground">PDF พร้อมอัปโหลด</span>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 flex-1 p-4 min-h-[88px]">
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          ) : uploaded ? (
            <CheckCircle2 className="w-6 h-6 text-primary" />
          ) : (
            <Camera className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
      )}
      <p className="text-sm text-center text-muted-foreground px-2 py-1.5 bg-background/80">{label}</p>
      {cameraError && <p className="text-sm text-destructive text-center px-2 pb-1">{cameraError}</p>}
      <div className="flex gap-1.5 p-2 pt-0">
        {allowCamera && (
          <Button
            type="button"
            size="sm"
            className="rounded-full flex-1 h-10 text-sm px-2"
            onClick={() => void startCamera()}
            disabled={uploading}
          >
            <SwitchCamera className="w-4 h-4 mr-1" /> เปิดกล้อง
          </Button>
        )}
        <label className="flex-1">
          <input
            type="file"
            accept={KYC_FILE_ACCEPT}
            className="hidden"
            onChange={(e) => {
              onPick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <span className="inline-flex w-full h-10 items-center justify-center rounded-full border border-input bg-background px-2 text-sm cursor-pointer hover:bg-muted/40">
            {preview || uploaded ? (
              <>
                <RefreshCw className="w-3 h-3 mr-1" /> เปลี่ยนไฟล์
              </>
            ) : (
              "อัปโหลด"
            )}
          </span>
        </label>
      </div>
    </div>
  );
}

const emptyAddress = (): KycAddress => ({
  line1: "",
  subdistrict: "",
  district: "",
  province: "",
  postalCode: "",
});

const VerificationWizard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: requests = [] } = useMyKycRequests();
  const submit = useSubmitKycVerification();

  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [legalName, setLegalName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [laserCode, setLaserCode] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [idExpiry, setIdExpiry] = useState("");
  const [phone, setPhone] = useState("");
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [lineId, setLineId] = useState("");
  const [address, setAddress] = useState<KycAddress>(emptyAddress);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [docs, setDocs] = useState<DocState>({});
  const [previews, setPreviews] = useState<PreviewState>({});
  const [previewKinds, setPreviewKinds] = useState<PreviewKindState>({});
  const [uploading, setUploading] = useState<KycDocType | null>(null);
  const [pdpaConsent, setPdpaConsent] = useState(false);
  const [pdpaReadComplete, setPdpaReadComplete] = useState(false);
  const [pepStatus, setPepStatus] = useState<KycPepStatus | "">("");
  const [pepEdd, setPepEdd] = useState<KycPepEddFields>(emptyPepEdd);
  const [sanctionsStatus, setSanctionsStatus] = useState<KycSanctionsStatus | "">("");
  const [sanctionsEdd, setSanctionsEdd] = useState<KycSanctionsEddFields>(emptySanctionsEdd);
  const [sanctionsAttested, setSanctionsAttested] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrFields, setOcrFields] = useState<KycOcrFields>({});
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<"idle" | "running" | "done" | "failed">("idle");
  const [aiResult, setAiResult] = useState<KycQualityResult | null>(null);
  const [aiDocLabel, setAiDocLabel] = useState("");
  const [aiDocType, setAiDocType] = useState<KycDocType | null>(null);
  const [selfieQuality, setSelfieQuality] = useState<KycQualityResult | null>(null);

  const profileRec = profile as {
    is_verified?: boolean;
    kyc_expires_at?: string | null;
    phone?: string | null;
    line_id?: string | null;
  } | null | undefined;
  const expiresAt = resolveKycExpiresAt({
    kyc_expires_at: profileRec?.kyc_expires_at ?? requests.find((r) => r.status === "approved")?.kyc_expires_at,
    reviewed_at: requests.find((r) => r.status === "approved")?.reviewed_at,
  });
  const expired = isKycExpired(expiresAt);
  const isVerified = !!(profileRec?.is_verified) && !expired;
  const pending = requests.find((r) => r.status === "pending");
  const latestRejected = requests.find((r) => r.status === "rejected");

  useEffect(() => {
    if (user?.email && !contactEmail) setContactEmail(user.email);
  }, [user?.email, contactEmail]);

  useEffect(() => {
    if (profileRec?.phone && !phone) setPhone(profileRec.phone);
    if (profileRec?.line_id && !lineId) setLineId(profileRec.line_id);
  }, [profileRec?.phone, profileRec?.line_id, phone, lineId]);

  useEffect(() => {
    return () => {
      Object.values(previews).forEach((url) => {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, [previews]);

  const applyOcrAutofill = (fields: KycOcrFields) => {
    setOcrFields((prev) => mergeOcrFields(prev, fields));
    if (fields.legalName) setLegalName(fields.legalName);
    if (fields.nationalId) setNationalId(formatThaiNationalId(fields.nationalId));
    if (fields.laserCode) setLaserCode(formatThaiIdLaserCode(fields.laserCode));
    if (fields.dateOfBirth) setDateOfBirth(fields.dateOfBirth);
    if (fields.expiryDate) setIdExpiry(fields.expiryDate);
  };

  const runOcrForDoc = async (docType: "id_front" | "id_back", file: File) => {
    setOcrStatus("running");
    setOcrProgress(0);
    setOcrError(null);
    try {
      const result = await runKycIdOcr(file, {
        side: docType === "id_front" ? "front" : "back",
        onProgress: (p) => setOcrProgress(p.progress),
      });
      applyOcrAutofill(result);
      setOcrStatus("done");
      if (result.fieldsFound.length > 0) {
        toast.success(`OCR อ่านได้ ${result.fieldsFound.length} ฟิลด์ — กรอกให้อัตโนมัติแล้ว`);
      } else {
        toast.message("OCR อ่านได้ไม่ชัด — กรอกเองได้");
      }
    } catch (e) {
      setOcrStatus("error");
      setOcrError(e instanceof Error ? e.message : "OCR ล้มเหลว");
      toast.error("OCR อ่านบัตรไม่สำเร็จ — กรอกเองได้");
    }
  };

  const qualityKindFor = (docType: KycDocType): KycQualityDocKind => {
    if (docType === "selfie") return "selfie";
    if (docType === "bank_book") return "bank_book";
    return "id_card";
  };

  const clearDocSlot = (docType: KycDocType) => {
    setPreviews((p) => {
      const prev = p[docType];
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      const next = { ...p };
      delete next[docType];
      return next;
    });
    setPreviewKinds((k) => {
      const next = { ...k };
      delete next[docType];
      return next;
    });
    setDocs((d) => {
      const next = { ...d };
      delete next[docType];
      return next;
    });
    if (docType === "selfie") setSelfieQuality(null);
  };

  const handleUpload = async (docType: KycDocType, file: File | undefined) => {
    if (!file || !user) return;
    const isPdf = (file.type || "").toLowerCase() === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const localUrl = isPdf ? "" : URL.createObjectURL(file);
    setPreviews((p) => {
      const prev = p[docType];
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return isPdf ? { ...p, [docType]: "pdf" } : { ...p, [docType]: localUrl };
    });
    setPreviewKinds((k) => ({ ...k, [docType]: isPdf ? "pdf" : "image" }));
    setUploading(docType);
    setAiDocLabel(DOC_LABELS[docType].replace(" *", ""));
    setAiDocType(docType);
    setAiStatus("running");
    setAiResult(null);

    try {
      const quality = await analyzeKycImageQuality(file, qualityKindFor(docType));
      setAiResult(quality);
      if (!quality.passed) {
        setAiStatus("failed");
        clearDocSlot(docType);
        toast.error("กรุณาถ่ายใหม่");
        return;
      }
      setAiStatus("done");

      const path = await uploadKycDocument(file, user.id, docType);
      setDocs((d) => ({ ...d, [docType]: path }));
      if (docType === "selfie") setSelfieQuality(quality);
      toast.success(`อัปโหลด${DOC_LABELS[docType].replace(" *", "")}แล้ว`);
      if (!isPdf && (docType === "id_front" || docType === "id_back")) {
        void runOcrForDoc(docType, file);
      }
    } catch (e) {
      clearDocSlot(docType);
      setAiStatus("failed");
      setAiResult({
        passed: false,
        checks: [],
        message: "กรุณาถ่ายใหม่",
      });
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(null);
    }
  };

  const idDocsOk = !!(docs.id_front && docs.id_back && docs.selfie);

  const step0Ok =
    pdpaReadComplete &&
    pdpaConsent &&
    isValidThaiPhone(phone) &&
    contactEmail.trim().includes("@");

  const step1Ok =
    legalName.trim() &&
    isValidThaiNationalId(nationalId) &&
    isValidThaiIdLaserCode(laserCode) &&
    isAdultDateOfBirth(dateOfBirth) &&
    isValidThaiPhone(phone) &&
    contactEmail.trim().includes("@") &&
    address.line1.trim() &&
    address.subdistrict.trim() &&
    address.district.trim() &&
    address.province.trim() &&
    address.postalCode.trim().length >= 5 &&
    idDocsOk;

  const step2Ok =
    bankName.trim() && accountNumber.trim().length >= 10 && accountName.trim() && docs.bank_book;

  const demoFlow = isDemoMode() || import.meta.env.DEV;
  const canNextStep0 = demoFlow
    ? pdpaReadComplete && pdpaConsent
    : !!step0Ok;
  const canNextStep1 = demoFlow || !!step1Ok;
  const canNextStep2 = demoFlow || !!step2Ok;

  const pepEddOk =
    !needsPepEdd(pepStatus) ||
    (pepEdd.position.trim() && pepEdd.organization.trim() && pepEdd.relationship.trim());

  // Selecting a PEP status counts as attestation that the declaration is true.
  const declarationsOk = !!pepStatus && !!pepEddOk && sanctionsAttested;

  const canSubmit =
    step1Ok &&
    step2Ok &&
    declarationsOk &&
    confirmText.trim().toUpperCase() === KYC_CONFIRM_PHRASE;

  const faceMatchPct = faceMatchPercent(selfieQuality);
  const livenessPassed = !!selfieQuality?.passed;
  const bankNameMatched = accountNameLooksMatched(accountName, legalName);

  const handleSubmit = () => {
    if (!canSubmit) return;
    const documents = (["id_front", "id_back", "selfie", "bank_book"] as KycDocType[])
      .filter((t) => docs[t])
      .map((doc_type) => ({ doc_type, storage_path: docs[doc_type]! }));

    submit.mutate(
      {
        legalName: legalName.trim(),
        idType: "national_id",
        nationalIdNumber: nationalId.replace(/\D/g, ""),
        phone: phone.replace(/\D/g, ""),
        contactEmail: contactEmail.trim(),
        address,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
        dateOfBirth,
        nationality: "TH",
        pepDeclaration: !!pepStatus,
        sanctionsDeclaration: sanctionsAttested,
        documents,
        submissionMeta: {
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
          locale: typeof navigator !== "undefined" ? navigator.language : "",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          submitted_from: "verification_wizard_v3_th",
          pdpa_consent_version: KYC_PDPA_CONSENT_VERSION,
          line_id: lineId.trim() || undefined,
          id_laser_code: laserCode.toUpperCase().replace(/[^A-Z0-9]/g, ""),
          id_expiry: idExpiry || undefined,
          ocr_fields: ocrFields,
          ocr_autofill: ocrStatus === "done",
          face_match_pct: faceMatchPct ?? undefined,
          liveness_passed: livenessPassed || undefined,
          account_name_matched: bankNameMatched || undefined,
          pep_status: pepStatus,
          pep_edd: needsPepEdd(pepStatus) ? pepEdd : undefined,
          sanctions_status: sanctionsStatus || "none",
          sanctions_edd: undefined,
          edd_required: needsPepEdd(pepStatus),
          ai_quality: (selfieQuality ?? aiResult)
            ? {
                passed: (selfieQuality ?? aiResult)!.passed,
                checks: (selfieQuality ?? aiResult)!.checks.map((c) => ({ id: c.id, pass: c.pass, score: c.score })),
              }
            : undefined,
        },
      },
      {
        onSuccess: () => setSubmitted(true),
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  if (isVerified) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl glass-panel p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
          <h1 className="mt-3 text-xl font-semibold">ยืนยันตัวตนแล้ว</h1>
          <p className="text-sm text-muted-foreground mt-1">
            พร้อมเปิดรับจ้างบนผลงาน และรับเงินค่าจ้างผ่าน Omise ตามเงื่อนไขแพลตฟอร์ม
          </p>
          {expiresAt && (
            <p className="text-sm text-muted-foreground mt-2">
              หมดอายุ {new Date(expiresAt).toLocaleDateString("th-TH")} (ต้องยืนยันใหม่ทุก 2 ปี)
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full flex-1" onClick={() => navigate("/hire/start")}>
            กลับหน้า Hiring
          </Button>
          <Button className="rounded-full flex-1" onClick={() => navigate("/portfolio")}>
            <User className="w-4 h-4 mr-1" /> ไปโปรไฟล์
          </Button>
        </div>
      </div>
    );
  }

  if (submitted || pending) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl glass-panel p-6 text-center space-y-3">
          <Clock className="w-12 h-12 text-amber-500 mx-auto" />
          <h1 className="text-xl font-semibold">ขอบคุณที่ส่งข้อมูลให้เรา</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            ทีมงานจะตรวจสอบภายใน <strong>1–3 วันทำการ</strong>
            <br />
            เมื่ออนุมัติหรือปฏิเสธ เราจะแจ้งให้ทราบผ่านแอปและอีเมล
          </p>
          {pending?.submitted_at && (
            <p className="text-sm text-muted-foreground">
              ส่งเมื่อ {new Date(pending.submitted_at).toLocaleString("th-TH")}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full flex-1" onClick={() => navigate("/")}>
            <Home className="w-4 h-4 mr-1" /> หน้าแรก
          </Button>
          <Button className="rounded-full flex-1" onClick={() => navigate("/hire/start")}>
            กลับหน้า Hiring
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-base [&_label]:text-base [&_h2]:text-xl [&_input]:!text-base">
      {expired && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-base">
          <p className="font-medium text-amber-700 dark:text-amber-400">การยืนยันตัวตนหมดอายุแล้ว</p>
          <p className="text-muted-foreground mt-1">กรุณายื่น KYC ใหม่เพื่อถอนเงินและเปิดรับจ้างต่อ</p>
        </div>
      )}

      {latestRejected && !expired && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 flex gap-2 text-base">
          <XCircle className="w-5 h-5 text-destructive shrink-0" />
          <div>
            <p className="font-medium">คำขอก่อนหน้าถูกปฏิเสธ</p>
            <p className="text-muted-foreground mt-1">
              {latestRejected.reject_reason_label || latestRejected.admin_note || "กรุณาตรวจสอบและยื่นใหม่"}
            </p>
            <p className="text-sm text-primary mt-2 flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> กรอกข้อมูลด้านล่างเพื่อยื่นคำขอใหม่
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl glass-panel p-5">
        <div className="flex gap-1 mb-4">
          {STEPS.map((label, i) => (
            <div key={label} className={cn("flex-1 h-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-medium flex items-center gap-2.5">
              <User className="w-5 h-5 text-primary shrink-0" aria-hidden />
              ยืนยันตัวตนเพื่อรับจ้างและรับเงิน
            </h2>

            <div className="space-y-3">
              <p className="text-sm font-medium">ข้อมูลติดต่อ *</p>
              <p className="text-sm text-muted-foreground -mt-1">
                ใช้ติดต่อกรณีเอกสารไม่ชัด หรือขอยืนยันเพิ่ม — ไม่แสดงบนโปรไฟล์สาธารณะจากหน้านี้
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>เบอร์โทร *</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08x-xxx-xxxx" inputMode="tel" />
                  {phone.trim() && !isValidThaiPhone(phone) && (
                    <p className="text-sm text-destructive">เบอร์โทรไม่ถูกต้อง</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>อีเมลติดต่อ *</Label>
                  <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} type="email" placeholder="you@email.com" />
                  {contactEmail.trim() && !contactEmail.includes("@") && (
                    <p className="text-sm text-destructive">อีเมลไม่ถูกต้อง</p>
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>LINE ID (ถ้ามี)</Label>
                  <Input
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value.trimStart())}
                    placeholder="เช่น @username หรือ ID ของคุณ"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>

            <KycPdpaConsentReader
              readComplete={pdpaReadComplete}
              onReadComplete={() => setPdpaReadComplete(true)}
            />
            <label
              className={cn(
                "flex items-start gap-3 rounded-xl border border-border p-4",
                pdpaReadComplete ? "cursor-pointer hover:bg-muted/30" : "opacity-60 cursor-not-allowed",
              )}
            >
              <Checkbox
                checked={pdpaConsent}
                disabled={!pdpaReadComplete}
                onCheckedChange={(v) => {
                  if (!pdpaReadComplete) return;
                  setPdpaConsent(v === true);
                }}
                className="mt-0.5"
              />
              <span className="text-sm leading-relaxed text-muted-foreground">
                {pdpaReadComplete
                  ? "ข้าพเจ้าได้อ่านเอกสารจนจบ และยินยอมให้เก็บและใช้ข้อมูลส่วนบุคคลข้างต้น ตาม "
                  : "โปรดเลื่อนอ่านเอกสารจนถึงท้ายก่อน จึงจะยินยอมได้ — อ่านเพิ่มใน "}
                <Link to="/legal/privacy" className="text-primary underline" target="_blank">
                  นโยบาย PDPA
                </Link>{" "}
                และ{" "}
                <Link to="/legal/rights" className="text-primary underline" target="_blank">
                  สิทธิเจ้าของข้อมูล
                </Link>
                . ติดต่อ DPO:{" "}
                <a href={`mailto:${LEGAL_DPO_EMAIL}`} className="text-primary underline">
                  {LEGAL_DPO_EMAIL}
                </a>
              </span>
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-medium flex items-center gap-2.5">
              <IdCard className="w-5 h-5 text-primary shrink-0" aria-hidden />
              ข้อมูลส่วนตัวและเอกสาร
            </h2>

            <div className="space-y-3">
              <p className="text-sm font-medium">อัปโหลดบัตรประชาชน *</p>
              <p className="text-sm text-muted-foreground">อัปโหลดได้เฉพาะไฟล์ JPG หรือ PNG</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>เลขบัตรประชาชน *</Label>
                  <Input
                    value={nationalId}
                    onChange={(e) => setNationalId(formatThaiNationalId(e.target.value))}
                    placeholder="1-2345-67890-12-3"
                    inputMode="numeric"
                  />
                  {nationalId.replace(/\D/g, "").length === 13 && !isValidThaiNationalId(nationalId) && (
                    <p className="text-sm text-destructive">เลขบัตรไม่ถูกต้อง</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>เลขหลังบัตร (Laser) *</Label>
                  <Input
                    value={laserCode}
                    onChange={(e) => setLaserCode(formatThaiIdLaserCode(e.target.value))}
                    placeholder="JT0-1234567-89"
                    className="font-mono uppercase"
                    autoComplete="off"
                  />
                  {laserCode.replace(/[^A-Za-z0-9]/g, "").length >= 12 && !isValidThaiIdLaserCode(laserCode) && (
                    <p className="text-sm text-destructive">รูปแบบเลขหลังบัตรไม่ถูกต้อง</p>
                  )}
                </div>
              </div>

              {aiDocType && aiDocType !== "selfie" && (
                <KycAiValidationPanel status={aiStatus} result={aiResult} docLabel={aiDocLabel} />
              )}
              <KycOcrStatusPanel status={ocrStatus} progress={ocrProgress} fields={ocrFields} error={ocrError} />

              <div className="grid gap-3 sm:grid-cols-2">
                <DocUploadTile
                  docType="id_front"
                  preview={previews.id_front}
                  previewKind={previewKinds.id_front}
                  uploading={uploading === "id_front"}
                  uploaded={!!docs.id_front}
                  onPick={(f) => handleUpload("id_front", f)}
                  allowCamera
                />
                <DocUploadTile
                  docType="id_back"
                  preview={previews.id_back}
                  previewKind={previewKinds.id_back}
                  uploading={uploading === "id_back"}
                  uploaded={!!docs.id_back}
                  onPick={(f) => handleUpload("id_back", f)}
                  allowCamera
                />
              </div>
            </div>

            <div className="border-t border-border/40" role="separator" />

            <div className="space-y-3 pt-1">
              <p className="text-sm font-medium">ข้อมูลจากบัตร</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>ชื่อ-นามสกุล (ตามบัตร) *</Label>
                  <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="เช่น สมชาย ใจดี" />
                </div>
                <div className="space-y-2">
                  <Label>วันเกิด *</Label>
                  <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
                  {dateOfBirth && !isAdultDateOfBirth(dateOfBirth) && (
                    <p className="text-sm text-destructive">ต้องมีอายุอย่างน้อย 18 ปี</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>วันหมดอายุบัตร {idExpiry ? "" : "(ถ้ามี)"}</Label>
                  <Input type="date" value={idExpiry} onChange={(e) => setIdExpiry(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>ที่อยู่ตามบัตร (บ้านเลขที่/หมู่/ซอย) *</Label>
                  <Input
                    value={address.line1}
                    onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
                    placeholder="เช่น 123/4 หมู่ 5 ซอยสุขุม"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ตำบล/แขวง *</Label>
                  <Input
                    value={address.subdistrict}
                    onChange={(e) => setAddress((a) => ({ ...a, subdistrict: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>อำเภอ/เขต *</Label>
                  <Input value={address.district} onChange={(e) => setAddress((a) => ({ ...a, district: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>จังหวัด *</Label>
                  <Input value={address.province} onChange={(e) => setAddress((a) => ({ ...a, province: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>รหัสไปรษณีย์ *</Label>
                  <Input
                    value={address.postalCode}
                    onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value.replace(/\D/g, "").slice(0, 5) }))}
                    inputMode="numeric"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border/40" role="separator" />

            <div className="space-y-2 pt-1">
              <p className="text-sm font-medium">Selfie · ถ่ายภาพใบหน้าของคุณ *</p>
              <SelfieCapture
                previewUrl={previews.selfie}
                uploading={uploading === "selfie"}
                onCapture={(f) => void handleUpload("selfie", f)}
              />
              {aiDocType === "selfie" && (
                <KycAiValidationPanel status={aiStatus} result={aiResult} docLabel="AI ตรวจใบหน้า" />
              )}
              <SelfieExample />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-medium flex items-center gap-2.5">
              <Landmark className="w-5 h-5 text-primary shrink-0" aria-hidden />
              บัญชีรับเงิน
            </h2>
            <div className="space-y-2">
              <Label>ธนาคาร *</Label>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="เช่น กสิกรไทย" />
            </div>
            <div className="space-y-2">
              <Label>เลขบัญชี *</Label>
              <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} inputMode="numeric" />
            </div>
            <div className="space-y-2">
              <Label>ชื่อบัญชี *</Label>
              <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="ต้องตรงกับเอกสาร" />
            </div>
            <DocUploadTile
              docType="bank_book"
              preview={previews.bank_book}
              previewKind={previewKinds.bank_book}
              uploading={uploading === "bank_book"}
              uploaded={!!docs.bank_book}
              onPick={(f) => handleUpload("bank_book", f)}
            />
            <p className="text-sm text-muted-foreground">{KYC_FILE_HINT}</p>
            <BookBankPageExample />
          </div>
        )}

        {step === 3 && (
          <KycReviewSubmitPanel
            legalName={legalName}
            nationalIdMasked={maskThaiNationalIdReview(nationalId)}
            bankName={bankName}
            accountMasked={maskBankAccount(accountNumber)}
            accountName={accountName}
            contactPhone={phone.trim() ? maskThaiPhoneReview(phone) : ""}
            contactEmail={maskContactEmail(contactEmail.trim() || user?.email || "")}
            contactLine={lineId.trim() || undefined}
            pepStatus={pepStatus}
            pepEdd={pepEdd}
            sanctionsStatus={sanctionsStatus}
            sanctionsEdd={sanctionsEdd}
            sanctionsAttested={sanctionsAttested}
            confirmText={confirmText}
            onPepStatusChange={setPepStatus}
            onPepEddChange={(patch) => setPepEdd((p) => ({ ...p, ...patch }))}
            onSanctionsStatusChange={setSanctionsStatus}
            onSanctionsEddChange={(patch) => setSanctionsEdd((p) => ({ ...p, ...patch }))}
            onSanctionsAttestedChange={setSanctionsAttested}
            onConfirmChange={setConfirmText}
            onEditIdentity={() => setStep(1)}
            onEditBank={() => setStep(2)}
            onEditContact={() => setStep(0)}
          />
        )}

        <div className="flex gap-2 mt-6">
          {step > 0 && (
            <Button variant="outline" className="rounded-full" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> {step === STEPS.length - 1 ? "Back" : "ย้อนกลับ"}
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button
              className="rounded-full flex-1 bg-primary text-primary-foreground"
              onClick={() => setStep((s) => s + 1)}
              disabled={
                (step === 0 && !canNextStep0) || (step === 1 && !canNextStep1) || (step === 2 && !canNextStep2)
              }
            >
              ถัดไป <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              className="rounded-full flex-1 bg-primary text-primary-foreground"
              onClick={handleSubmit}
              disabled={!canSubmit || submit.isPending}
            >
              {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Verification"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerificationWizard;
