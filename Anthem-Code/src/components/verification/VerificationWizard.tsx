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
  WalletCards,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyKycRequests, useMyKycDocuments, useSubmitKycVerification } from "@/hooks/useKyc";
import { uploadKycDocument, prepareKycImage, KYC_FILE_HINT, KYC_ID_FILE_HINT, acceptForKycDoc, getKycSignedUrl, type KycDocType } from "@/lib/kycUpload";
import { LEGAL_DPO_EMAIL } from "@/lib/legalConfig";
import {
  formatThaiNationalId,
  isAdultDateOfBirth,
  isKycExpired,
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
import { BookBankPageExample } from "@/components/verification/BookBankPageExample";
import { SelfieExample } from "@/components/verification/KycDocExamples";
import { KycAiValidationPanel } from "@/components/verification/KycAiValidationPanel";
import { KycReviewSubmitPanel } from "@/components/verification/KycReviewSubmitPanel";
import { KycPdpaConsentReader } from "@/components/verification/KycPdpaConsentReader";
import ProfileAddressEditor from "@/components/profile/ProfileAddressEditor";
import {
  analyzeKycImageQuality,
  type KycQualityDocKind,
  type KycQualityResult,
} from "@/lib/kycImageQuality";
import { cn } from "@/lib/utils";
import { buildKycResubmitPrefill, type KycClearKey } from "@/lib/kycPrefill";
import kycCreatorVerifyBg from "@/assets/kyc-creator-verify-bg.jpg";
import kycSubmittedBg from "@/assets/kyc-submitted-bg.jpg";
import kycVerifiedBg from "@/assets/kyc-verified-bg.jpg";

const STEPS = ["ติดต่อ", "ตัวตน", "บัญชี", "ส่งตรวจ"] as const;

/** Recessed fill so fields read against the white wizard card. */
const KYC_INPUT_CLASS =
  "bg-muted border-border placeholder:text-muted-foreground/55";

const DOC_LABELS: Record<KycDocType, string> = {
  id_front: "บัตรประชาชน (ด้านหน้า)",
  id_back: "บัตรประชาชน (ด้านหลัง)",
  selfie: "เซลฟี่ถือบัตร",
  bank_book: "Book Bank Page [หน้าสมุดบัญชี]",
};

function ReqStar() {
  return (
    <span className="text-primary" aria-hidden="true">
      {" *"}
    </span>
  );
}

const KYC_ERROR_CLASS = "border-destructive focus-visible:ring-destructive";

function kycFieldClass(invalid: boolean, extra?: string) {
  return cn(KYC_INPUT_CLASS, invalid && KYC_ERROR_CLASS, extra);
}

function RejectFixHint({ show }: { show: boolean }) {
  if (!show) return null;
  return <p className="text-xs text-destructive mt-1">แก้ตามเหตุผลปฏิเสธ — กรอกหรืออัปใหม่</p>;
}

/** Empty required fields turn red after Next; filled-but-wrong is red immediately. */
function requiredInvalid(attempted: boolean, ok: boolean, hasValue = false) {
  if (ok) return false;
  return attempted || hasValue;
}

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

function KycDoneNav({ showWallet = false }: { showWallet?: boolean }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button variant="outline" className="rounded-full flex-1 bg-background/95" onClick={() => navigate("/")}>
          <Home className="w-4 h-4 mr-1" aria-hidden /> กลับหน้าแรก
        </Button>
        <Button className="rounded-full flex-1" onClick={() => navigate("/portfolio")}>
          <User className="w-4 h-4 mr-1" aria-hidden /> ไปหน้าโปรไฟล์
        </Button>
      </div>
      {showWallet ? (
        <Button
          variant="outline"
          className="rounded-full w-full bg-background/95"
          onClick={() => navigate("/earnings")}
        >
          <WalletCards className="w-4 h-4 mr-1" aria-hidden /> กระเป๋าเงิน
        </Button>
      ) : null}
    </div>
  );
}

function DocUploadTile({
  docType,
  preview,
  previewKind,
  uploading,
  uploaded,
  onPick,
  allowCamera = false,
  cameraFacing = "environment",
  invalid = false,
}: {
  docType: KycDocType;
  preview?: string;
  previewKind?: "image" | "pdf";
  uploading: boolean;
  uploaded: boolean;
  onPick: (file: File | undefined) => void;
  allowCamera?: boolean;
  cameraFacing?: "user" | "environment";
  invalid?: boolean;
}) {
  const label = DOC_LABELS[docType];
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const selfieCam = cameraFacing === "user";

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
        video: {
          facingMode: selfieCam ? "user" : { ideal: "environment" },
          width: { ideal: selfieCam ? 1280 : 1920 },
          height: { ideal: selfieCam ? 720 : 1080 },
        },
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
    if (selfieCam) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
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
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full h-40 object-cover"
          style={selfieCam ? { transform: "scaleX(-1)" } : undefined}
        />
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
      data-kyc-error={invalid ? "true" : undefined}
      className={cn(
        "relative flex flex-col rounded-xl border border-dashed overflow-hidden min-h-[140px]",
        invalid ? "border-destructive" : preview || uploaded ? "border-primary/40" : "border-border",
      )}
    >
      {preview && previewKind === "image" ? (
        <div className="relative bg-muted/40">
          <img loading="lazy" decoding="async" src={preview} alt={label} className="w-full h-44 object-contain" />
          {uploading && (
            <div className="absolute inset-0 grid place-items-center bg-background/55">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          {uploaded && !uploading && (
            <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-emerald-600 drop-shadow" aria-hidden />
          )}
        </div>
      ) : preview && previewKind === "pdf" ? (
        <div className="relative flex flex-col items-center justify-center gap-2 h-44 bg-muted/40">
          {uploading ? (
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          ) : (
            <>
              <FileText className="w-8 h-8 text-primary" aria-hidden />
              <span className="text-sm text-muted-foreground">PDF พร้อมอัปโหลด</span>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 flex-1 p-4 min-h-[11rem]">
          {uploading ? (
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          ) : uploaded ? (
            <CheckCircle2 className="w-12 h-12 text-emerald-600" aria-label="อัปโหลดแล้ว" />
          ) : (
            <Camera className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
      )}
      <p className="text-sm text-center text-muted-foreground px-2 py-1.5 bg-background/80">
        {label}
        <ReqStar />
      </p>
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
            accept={acceptForKycDoc(docType)}
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
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: requests = [] } = useMyKycRequests();
  const latestRejectedRow = requests.find((r) => r.status === "rejected");
  const rejectedDocsQuery = useMyKycDocuments(latestRejectedRow?.id);
  const submit = useSubmitKycVerification();

  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [nationalId, setNationalId] = useState("");
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
  const previewsRef = useRef(previews);
  previewsRef.current = previews;
  const [previewKinds, setPreviewKinds] = useState<PreviewKindState>({});
  const [uploading, setUploading] = useState<KycDocType | null>(null);
  const [pdpaConsent, setPdpaConsent] = useState(false);
  const [pdpaReadComplete, setPdpaReadComplete] = useState(false);
  const [pepStatus, setPepStatus] = useState<KycPepStatus | "">("");
  const [pepEdd, setPepEdd] = useState<KycPepEddFields>(emptyPepEdd);
  const [sanctionsStatus, setSanctionsStatus] = useState<KycSanctionsStatus | "">("");
  const [sanctionsEdd, setSanctionsEdd] = useState<KycSanctionsEddFields>(emptySanctionsEdd);
  const [sanctionsAttested, setSanctionsAttested] = useState(false);
  const [idFrontCheck, setIdFrontCheck] = useState<"idle" | "running" | "done" | "failed">("idle");
  const [idFrontQuality, setIdFrontQuality] = useState<KycQualityResult | null>(null);
  const [selfieCheck, setSelfieCheck] = useState<"idle" | "running" | "done" | "failed">("idle");
  const [selfieQuality, setSelfieQuality] = useState<KycQualityResult | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [prefillCleared, setPrefillCleared] = useState<Set<KycClearKey>>(() => new Set());
  const prefillIdRef = useRef<string | null>(null);

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
    if (pending || isVerified || submitted) return;
    if (!latestRejected) return;
    if (prefillIdRef.current === latestRejected.id) return;
    if (rejectedDocsQuery.isLoading) return;
    prefillIdRef.current = latestRejected.id;
    const prefill = buildKycResubmitPrefill({
      legal_name: latestRejected.legal_name,
      national_id_number: latestRejected.national_id_number,
      date_of_birth: latestRejected.date_of_birth,
      phone: latestRejected.phone,
      contact_email: latestRejected.contact_email,
      bank_name: latestRejected.bank_name,
      account_number: latestRejected.account_number,
      account_name: latestRejected.account_name,
      address_json: latestRejected.address_json ?? null,
      reject_reason_code: latestRejected.reject_reason_code,
      reject_reason_codes: latestRejected.reject_reason_codes,
      reject_reason_label: latestRejected.reject_reason_label,
      submission_meta: latestRejected.submission_meta,
      documents: rejectedDocsQuery.data ?? [],
    });
    setGivenName(prefill.givenName);
    setFamilyName(prefill.familyName);
    setNationalId(prefill.nationalId ? formatThaiNationalId(prefill.nationalId) : "");
    setDateOfBirth(prefill.dateOfBirth);
    setIdExpiry(prefill.idExpiry);
    if (prefill.phone) setPhone(prefill.phone);
    if (prefill.contactEmail) setContactEmail(prefill.contactEmail);
    if (prefill.lineId) setLineId(prefill.lineId);
    setAddress(prefill.address);
    setBankName(prefill.bankName);
    setAccountNumber(prefill.accountNumber);
    setAccountName(prefill.accountName);
    setDocs(prefill.docs);
    setPrefillCleared(prefill.cleared);
    void (async () => {
      const nextPreviews: PreviewState = {};
      const nextKinds: PreviewKindState = {};
      for (const [type, path] of Object.entries(prefill.docs) as [KycDocType, string][]) {
        if (!path) continue;
        const url = await getKycSignedUrl(path);
        if (!url) continue;
        nextPreviews[type] = url;
        nextKinds[type] = path.toLowerCase().endsWith(".pdf") ? "pdf" : "image";
      }
      setPreviews((p) => ({ ...p, ...nextPreviews }));
      setPreviewKinds((k) => ({ ...k, ...nextKinds }));
    })();
  }, [
    pending,
    isVerified,
    submitted,
    latestRejected,
    rejectedDocsQuery.isLoading,
    rejectedDocsQuery.data,
  ]);

  useEffect(() => {
    return () => {
      Object.values(previewsRef.current).forEach((url) => {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, []);

  const qualityKindFor = (docType: KycDocType): KycQualityDocKind => {
    if (docType === "selfie") return "selfie";
    if (docType === "bank_book") return "bank_book";
    return "id_card";
  };

  const setQualitySlot = (
    docType: KycDocType,
    status: "idle" | "running" | "done" | "failed",
    result: KycQualityResult | null = null,
  ) => {
    if (docType === "selfie") {
      setSelfieCheck(status);
      setSelfieQuality(result);
    } else if (docType === "id_front") {
      setIdFrontCheck(status);
      setIdFrontQuality(result);
    }
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
  };

  const handleUpload = async (docType: KycDocType, file: File | undefined) => {
    if (!file) return;
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบก่อนอัปโหลด");
      return;
    }
    const isPdf = (file.type || "").toLowerCase() === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    let working = file;
    if (!isPdf) {
      try {
        working = await prepareKycImage(file);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "ไฟล์นี้ใช้ไม่ได้");
        return;
      }
    }
    const localUrl = URL.createObjectURL(working);
    setPreviews((p) => {
      const prev = p[docType];
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return { ...p, [docType]: localUrl };
    });
    setPreviewKinds((k) => ({ ...k, [docType]: isPdf ? "pdf" : "image" }));
    setUploading(docType);
    if (docType === "selfie" || docType === "id_front") setQualitySlot(docType, "running", null);

    try {
      const quality = await analyzeKycImageQuality(working, qualityKindFor(docType));
      if (!quality.passed) {
        if (docType === "selfie" || docType === "id_front") setQualitySlot(docType, "failed", quality);
        setDocs((d) => {
          const next = { ...d };
          delete next[docType];
          return next;
        });
        toast.error(docType === "bank_book" ? "อัปภาพหน้าสมุดบัญชีหรือภาพจากแอปธนาคารให้ชัด" : "กรุณาถ่ายใหม่");
        return;
      }
      if (docType === "selfie" || docType === "id_front") setQualitySlot(docType, "done", quality);

      const path = await uploadKycDocument(working, user.id, docType);
      setDocs((d) => ({ ...d, [docType]: path }));
      toast.success(`อัปโหลด${DOC_LABELS[docType].replace(" *", "")}แล้ว`);
    } catch (e) {
      if (docType === "selfie" || docType === "id_front") {
        setQualitySlot(docType, "failed", { passed: false, checks: [], message: "กรุณาถ่ายใหม่" });
      }
      clearDocSlot(docType);
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(null);
    }
  };

  const idDocsOk = !!(docs.id_front && docs.selfie);
  const legalName = [givenName, familyName].map((s) => s.trim()).filter(Boolean).join(" ");

  const step0Ok =
    pdpaReadComplete &&
    pdpaConsent &&
    isValidThaiPhone(phone) &&
    contactEmail.trim().includes("@");

  const step1Ok =
    givenName.trim() &&
    familyName.trim() &&
    isValidThaiNationalId(nationalId) &&
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

  const canNextStep0 = !!step0Ok;
  const canNextStep1 = !!step1Ok;
  const canNextStep2 = !!step2Ok;
  const canNext = step === 0 ? canNextStep0 : step === 1 ? canNextStep1 : step === 2 ? canNextStep2 : false;

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

  const phoneOk = isValidThaiPhone(phone);
  const emailOk = contactEmail.trim().includes("@");
  const phoneInvalid = requiredInvalid(attempted, phoneOk, !!phone.trim());
  const emailInvalid = requiredInvalid(attempted, emailOk, !!contactEmail.trim());
  const consentInvalid = requiredInvalid(attempted, pdpaReadComplete && pdpaConsent);
  const nationalIdOk = isValidThaiNationalId(nationalId);
  const dobOk = isAdultDateOfBirth(dateOfBirth);
  const postalOk = address.postalCode.trim().length >= 5;
  const nationalIdInvalid = requiredInvalid(attempted, nationalIdOk, nationalId.replace(/\D/g, "").length > 0);
  const givenNameInvalid = requiredInvalid(attempted, !!givenName.trim());
  const familyNameInvalid = requiredInvalid(attempted, !!familyName.trim());
  const dobInvalid = requiredInvalid(attempted, dobOk, !!dateOfBirth);
  const line1Invalid = requiredInvalid(attempted, !!address.line1.trim());
  const subdistrictInvalid = requiredInvalid(attempted, !!address.subdistrict.trim());
  const districtInvalid = requiredInvalid(attempted, !!address.district.trim());
  const provinceInvalid = requiredInvalid(attempted, !!address.province.trim());
  const postalInvalid = requiredInvalid(attempted, postalOk, !!address.postalCode.trim());
  const idFrontInvalid = requiredInvalid(attempted, !!docs.id_front);
  const selfieInvalid = requiredInvalid(attempted, !!docs.selfie);
  const bankNameInvalid = requiredInvalid(attempted, !!bankName.trim());
  const accountNumberOk = accountNumber.trim().length >= 10;
  const accountNumberInvalid = requiredInvalid(attempted, accountNumberOk, !!accountNumber.trim());
  const accountNameInvalid = requiredInvalid(attempted, !!accountName.trim());
  const bankBookInvalid = requiredInvalid(attempted, !!docs.bank_book);

  const revealMissing = () => {
    setAttempted(true);
    window.setTimeout(() => {
      document.querySelector<HTMLElement>("[data-kyc-error='true']")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 40);
  };

  const goNext = () => {
    if (!canNext) {
      revealMissing();
      return;
    }
    setAttempted(false);
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setAttempted(false);
    setStep((s) => s - 1);
  };

  const faceMatchPct = faceMatchPercent(selfieQuality);
  const livenessPassed = !!selfieQuality?.passed;
  const bankNameMatched = accountNameLooksMatched(accountName, legalName);

  const handleSubmit = () => {
    if (!canSubmit) {
      revealMissing();
      return;
    }
    const documents = (["id_front", "selfie", "bank_book"] as KycDocType[])
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
          given_name: givenName.trim(),
          family_name: familyName.trim(),
          line_id: lineId.trim() || undefined,
          id_expiry: idExpiry || undefined,
          ocr_autofill: false,
          face_match_pct: faceMatchPct ?? undefined,
          liveness_passed: livenessPassed || undefined,
          account_name_matched: bankNameMatched || undefined,
          pep_status: pepStatus,
          pep_edd: needsPepEdd(pepStatus) ? pepEdd : undefined,
          sanctions_status: sanctionsStatus || "none",
          sanctions_edd: undefined,
          edd_required: needsPepEdd(pepStatus),
          quality_checks: {
            id_front: idFrontQuality
              ? {
                  passed: idFrontQuality.passed,
                  checks: idFrontQuality.checks.map((c) => ({ id: c.id, pass: c.pass, score: c.score })),
                }
              : undefined,
            selfie: selfieQuality
              ? {
                  passed: selfieQuality.passed,
                  checks: selfieQuality.checks.map((c) => ({ id: c.id, pass: c.pass, score: c.score })),
                }
              : undefined,
          },
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
      <div className="relative overflow-hidden rounded-2xl">
        <img loading="lazy" decoding="async"
          src={kycVerifiedBg}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20"
          aria-hidden
        />
        <div className="relative space-y-5 px-4 py-8 sm:px-5">
          <div className="rounded-2xl glass-panel p-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
            <h1 className="mt-3 text-xl font-semibold">ยืนยันตัวตนแล้ว</h1>
            <p className="text-sm text-muted-foreground mt-1">
              พร้อมเปิดรับจ้างบนผลงาน และรับเงินค่าจ้างตามเงื่อนไขแพลตฟอร์ม
            </p>
            {expiresAt && (
              <p className="text-sm text-muted-foreground mt-2">
                หมดอายุ {new Date(expiresAt).toLocaleDateString("th-TH")} (ต้องยืนยันใหม่ทุก 2 ปี)
              </p>
            )}
          </div>
          <KycDoneNav showWallet />
        </div>
      </div>
    );
  }

  if (submitted || pending) {
    return (
      <div className="relative overflow-hidden rounded-2xl">
        <img loading="lazy" decoding="async"
          src={kycSubmittedBg}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/25"
          aria-hidden
        />
        <div className="relative space-y-5 px-4 py-8 sm:px-5">
          <div className="rounded-2xl glass-panel p-6 text-center space-y-3">
            <Clock className="w-12 h-12 text-amber-500 mx-auto" />
            <h1 className="text-xl font-semibold">ได้รับข้อมูลของคุณเรียบร้อยแล้ว</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ขณะนี้ทีมงานกำลังตรวจสอบข้อมูล โดยใช้เวลาประมาณ 1–3 วันทำการ
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              เมื่อการตรวจสอบเสร็จสิ้น เราจะแจ้งผลให้คุณทราบผ่านแจ้งเตือนแพลตฟอร์ม และอีเมลของท่าน
            </p>
            {pending?.submitted_at && (
              <p className="text-sm text-muted-foreground">
                ส่งเมื่อ {new Date(pending.submitted_at).toLocaleString("th-TH")}
              </p>
            )}
          </div>
          <KycDoneNav />
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
              <RefreshCw className="w-3.5 h-3.5" /> ข้อมูลที่ยังใช้ได้ถูกใส่ไว้แล้ว — แก้เฉพาะจุดที่มีปัญหา
            </p>
          </div>
        </div>
      )}

      <div className="relative">
      {step === 0 && (
        <div className="relative overflow-hidden rounded-2xl px-4 pt-5 pb-20 text-white">
          <img loading="lazy" decoding="async"
            src={kycCreatorVerifyBg}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover brightness-110 contrast-[0.98] saturate-105"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/5"
            aria-hidden
          />
          <div className="relative space-y-1.5 pb-2">
            <p className="text-3xl sm:text-4xl font-semibold tracking-tight [text-shadow:0_1px_10px_rgb(90_25_0_/_0.45)]">
              Creator Verify
            </p>
            <p className="text-sm leading-relaxed text-white [text-shadow:0_1px_8px_rgb(90_25_0_/_0.4)]">
              ยืนยันตัวตนและบัญชีรับเงินก่อน จึงรับงานจ้างและรับค่าจ้างได้
            </p>
          </div>
        </div>
      )}

      <div className={cn("relative z-10 rounded-2xl glass-panel p-5", step === 0 && "-mt-12")}>
        <div className="flex gap-1 mb-4">
          {STEPS.map((label, i) => (
            <div key={label} className={cn("flex-1 h-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-medium flex items-center gap-2.5">
              <User className="w-5 h-5 text-primary shrink-0" aria-hidden />
              ยืนยันตัวตนเพื่อเปิดรับรายได้
            </h2>

            <div className="space-y-3">
              <p className="text-sm font-medium">
                ข้อมูลติดต่อ
                <ReqStar />
              </p>
              <p className="text-sm text-muted-foreground -mt-1">
                ใช้ติดต่อกรณีเอกสารไม่ชัด หรือขอยืนยันเพิ่ม — ไม่แสดงบนโปรไฟล์สาธารณะจากหน้านี้
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2" data-kyc-error={phoneInvalid ? "true" : undefined}>
                  <Label>
                    เบอร์โทร
                    <ReqStar />
                  </Label>
                  <Input
                    className={kycFieldClass(phoneInvalid)}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08x-xxx-xxxx"
                    inputMode="tel"
                    aria-invalid={phoneInvalid}
                  />
                  {phone.trim() && !phoneOk && (
                    <p className="text-sm text-destructive">เบอร์โทรไม่ถูกต้อง</p>
                  )}
                  {attempted && !phone.trim() && (
                    <p className="text-sm text-destructive">กรอกเบอร์โทร</p>
                  )}
                </div>
                <div className="space-y-2" data-kyc-error={emailInvalid ? "true" : undefined}>
                  <Label>
                    อีเมลติดต่อ
                    <ReqStar />
                  </Label>
                  <Input
                    className={kycFieldClass(emailInvalid)}
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    type="email"
                    placeholder="you@email.com"
                    aria-invalid={emailInvalid}
                  />
                  {contactEmail.trim() && !emailOk && (
                    <p className="text-sm text-destructive">อีเมลไม่ถูกต้อง</p>
                  )}
                  {attempted && !contactEmail.trim() && (
                    <p className="text-sm text-destructive">กรอกอีเมลติดต่อ</p>
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>LINE ID (ถ้ามี)</Label>
                  <Input
                    className={KYC_INPUT_CLASS}
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
              data-kyc-error={consentInvalid ? "true" : undefined}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4",
                consentInvalid ? "border-destructive" : "border-border",
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
            {attempted && !pdpaConsent && (
              <p className="text-sm text-destructive -mt-2">ต้องยินยอมก่อนไปขั้นตอนถัดไป</p>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-medium flex items-center gap-2.5">
              <IdCard className="w-5 h-5 text-primary shrink-0" aria-hidden />
              ข้อมูลส่วนตัวและเอกสาร
            </h2>

            <div className="space-y-3">
              <p className="text-sm font-medium">
                อัปโหลดบัตรประชาชนและเซลฟี่ถือบัตร
                <ReqStar />
              </p>
              <p className="text-sm text-muted-foreground">
                {KYC_ID_FILE_HINT} · กรอกข้อมูลจากบัตรด้วยตนเองด้านล่าง
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                <DocUploadTile
                  docType="id_front"
                  preview={previews.id_front}
                  previewKind={previewKinds.id_front}
                  uploading={uploading === "id_front"}
                  uploaded={!!docs.id_front}
                  onPick={(f) => handleUpload("id_front", f)}
                  allowCamera
                  invalid={idFrontInvalid}
                />
                <RejectFixHint show={prefillCleared.has("idFront")} />
                </div>
                <div className="space-y-1">
                <DocUploadTile
                  docType="selfie"
                  preview={previews.selfie}
                  previewKind={previewKinds.selfie}
                  uploading={uploading === "selfie"}
                  uploaded={!!docs.selfie}
                  onPick={(f) => handleUpload("selfie", f)}
                  allowCamera
                  cameraFacing="user"
                  invalid={selfieInvalid}
                />
                <RejectFixHint show={prefillCleared.has("selfie")} />
                </div>
              </div>
              {(idFrontCheck !== "idle" || selfieCheck !== "idle") && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <KycAiValidationPanel status={idFrontCheck} result={idFrontQuality} keepSlot />
                  <KycAiValidationPanel status={selfieCheck} result={selfieQuality} keepSlot />
                </div>
              )}
              <SelfieExample />
            </div>

            <div className="border-t border-border/40" role="separator" />

            <div className="space-y-3 pt-1">
              <p className="text-sm font-medium">ข้อมูลจากบัตร</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2" data-kyc-error={nationalIdInvalid ? "true" : undefined}>
                  <Label>
                    เลขบัตรประชาชน
                    <ReqStar />
                  </Label>
                  <Input
                    className={kycFieldClass(nationalIdInvalid)}
                    value={nationalId}
                    onChange={(e) => setNationalId(formatThaiNationalId(e.target.value))}
                    placeholder="1-2345-67890-12-3"
                    inputMode="numeric"
                    aria-invalid={nationalIdInvalid}
                  />
                  {nationalId.replace(/\D/g, "").length === 13 && !nationalIdOk && (
                    <p className="text-sm text-destructive">เลขบัตรไม่ถูกต้อง</p>
                  )}
                  {attempted && !nationalId.trim() && (
                    <p className="text-sm text-destructive">กรอกเลขบัตรประชาชน</p>
                  )}
                  <RejectFixHint show={prefillCleared.has("nationalId")} />
                </div>
                <div className="space-y-2" data-kyc-error={givenNameInvalid ? "true" : undefined}>
                  <Label>
                    ชื่อ (ตามบัตร)
                    <ReqStar />
                  </Label>
                  <Input
                    className={kycFieldClass(givenNameInvalid)}
                    value={givenName}
                    onChange={(e) => setGivenName(e.target.value)}
                    placeholder="เช่น ภาสวุฒิ"
                    aria-invalid={givenNameInvalid}
                  />
                  <RejectFixHint show={prefillCleared.has("givenName")} />
                </div>
                <div className="space-y-2" data-kyc-error={familyNameInvalid ? "true" : undefined}>
                  <Label>
                    นามสกุล (ตามบัตร)
                    <ReqStar />
                  </Label>
                  <Input
                    className={kycFieldClass(familyNameInvalid)}
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    placeholder="เช่น แซ่ล้อ"
                    aria-invalid={familyNameInvalid}
                  />
                  <RejectFixHint show={prefillCleared.has("familyName")} />
                </div>
                <div className="space-y-2" data-kyc-error={dobInvalid ? "true" : undefined}>
                  <Label>
                    วันเกิด
                    <ReqStar />
                  </Label>
                  <Input
                    className={kycFieldClass(dobInvalid)}
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    aria-invalid={dobInvalid}
                  />
                  {dateOfBirth && !dobOk && (
                    <p className="text-sm text-destructive">ต้องมีอายุอย่างน้อย 18 ปี</p>
                  )}
                  {attempted && !dateOfBirth && (
                    <p className="text-sm text-destructive">กรอกวันเกิด</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>วันหมดอายุบัตร {idExpiry ? "" : "(ถ้ามี)"}</Label>
                  <Input className={KYC_INPUT_CLASS} type="date" value={idExpiry} onChange={(e) => setIdExpiry(e.target.value)} />
                </div>
              </div>

              <ProfileAddressEditor
                idPrefix="kyc-address"
                value={address}
                onChange={setAddress}
                required
                hideHeader
                line1Label="ที่อยู่ตามบัตร (บ้านเลขที่/หมู่/ซอย)"
                fieldClassName="bg-muted"
                invalid={{
                  line1: line1Invalid,
                  province: provinceInvalid,
                  district: districtInvalid,
                  subdistrict: subdistrictInvalid,
                  postalCode: postalInvalid,
                }}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-medium flex items-center gap-2.5">
              <Landmark className="w-5 h-5 text-primary shrink-0" aria-hidden />
              บัญชีรับเงิน
            </h2>
            <div className="space-y-2" data-kyc-error={bankNameInvalid ? "true" : undefined}>
              <Label>
                ธนาคาร
                <ReqStar />
              </Label>
              <Input
                className={kycFieldClass(bankNameInvalid)}
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="เช่น กสิกรไทย"
                aria-invalid={bankNameInvalid}
              />
              <RejectFixHint show={prefillCleared.has("bankName")} />
            </div>
            <div className="space-y-2" data-kyc-error={accountNumberInvalid ? "true" : undefined}>
              <Label>
                เลขบัญชี
                <ReqStar />
              </Label>
              <Input
                className={kycFieldClass(accountNumberInvalid)}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                inputMode="numeric"
                aria-invalid={accountNumberInvalid}
              />
              {attempted && accountNumber.trim() && !accountNumberOk && (
                <p className="text-sm text-destructive">เลขบัญชีต้องมีอย่างน้อย 10 หลัก</p>
              )}
              <RejectFixHint show={prefillCleared.has("accountNumber")} />
            </div>
            <div className="space-y-2" data-kyc-error={accountNameInvalid ? "true" : undefined}>
              <Label>
                ชื่อบัญชี
                <ReqStar />
              </Label>
              <Input
                className={kycFieldClass(accountNameInvalid)}
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="ต้องตรงกับเอกสาร"
                aria-invalid={accountNameInvalid}
              />
              <RejectFixHint show={prefillCleared.has("accountName")} />
            </div>
            <div className="space-y-1">
            <DocUploadTile
              docType="bank_book"
              preview={previews.bank_book}
              previewKind={previewKinds.bank_book}
              uploading={uploading === "bank_book"}
              uploaded={!!docs.bank_book}
              onPick={(f) => handleUpload("bank_book", f)}
              invalid={bankBookInvalid}
              allowCamera
            />
            <RejectFixHint show={prefillCleared.has("bankBook")} />
            </div>
            <p className="text-sm text-muted-foreground">{KYC_FILE_HINT}</p>
            <BookBankPageExample />
          </div>
        )}

        {step === 3 && (
          <KycReviewSubmitPanel
            givenName={givenName}
            familyName={familyName}
            nationalIdMasked={maskThaiNationalIdReview(nationalId)}
            identityUploads={[
              {
                label: "บัตรประชาชน (ด้านหน้า)",
                preview: previews.id_front,
                previewKind: previewKinds.id_front,
                uploaded: !!docs.id_front,
              },
              {
                label: "เซลฟี่ถือบัตร",
                preview: previews.selfie,
                previewKind: previewKinds.selfie,
                uploaded: !!docs.selfie,
              },
            ]}
            bankName={bankName}
            accountMasked={maskBankAccount(accountNumber)}
            accountName={accountName}
            bankUpload={{
              label: "หน้าสมุดบัญชี",
              preview: previews.bank_book,
              previewKind: previewKinds.bank_book,
              uploaded: !!docs.bank_book,
            }}
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
            onEditIdentity={() => {
              setAttempted(false);
              setStep(1);
            }}
            onEditBank={() => {
              setAttempted(false);
              setStep(2);
            }}
            onEditContact={() => {
              setAttempted(false);
              setStep(0);
            }}
            showErrors={attempted}
          />
        )}

        <div className="mt-6 space-y-2">
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" className="rounded-full" onClick={goBack}>
                <ArrowLeft className="w-4 h-4 mr-1" /> {step === STEPS.length - 1 ? "Back" : "ย้อนกลับ"}
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                className={cn("rounded-full flex-1 bg-primary text-primary-foreground", !canNext && "opacity-50")}
                onClick={goNext}
                aria-disabled={!canNext}
              >
                ถัดไป <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                className={cn(
                  "rounded-full flex-1 bg-primary text-primary-foreground",
                  !canSubmit && !submit.isPending && "opacity-50",
                )}
                onClick={handleSubmit}
                disabled={submit.isPending}
                aria-disabled={!canSubmit || submit.isPending}
              >
                {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Verification"}
              </Button>
            )}
          </div>
          {attempted && step < STEPS.length - 1 && !canNext && (
            <p className="text-sm text-destructive">กรอกช่องที่มี * ให้ครบก่อนไปขั้นตอนถัดไป</p>
          )}
          {attempted && step === STEPS.length - 1 && !canSubmit && !submit.isPending && (
            <p className="text-sm text-destructive">กรอกช่องที่มี * และพิมพ์คำยืนยันให้ครบก่อนส่ง</p>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default VerificationWizard;
