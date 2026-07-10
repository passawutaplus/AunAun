import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  Home,
  Loader2,
  RefreshCw,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import { InlineLoader } from "@/components/ui/BanterLoader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useCreatorEligibility } from "@/hooks/useCreatorEligibility";
import { useMyKycRequests, useSubmitKycVerification } from "@/hooks/useKyc";
import CreatorEligibilityProgress from "@/components/verification/CreatorEligibilityProgress";
import { uploadKycDocument, type KycDocType } from "@/lib/kycUpload";
import { KYC_PDPA_PURPOSES, KYC_PDPA_RETENTION_NOTE } from "@/lib/kycPdpa";
import { LEGAL_DPO_EMAIL } from "@/lib/legalConfig";
import {
  formatKycAddress,
  formatThaiNationalId,
  isValidThaiNationalId,
  KYC_CONFIRM_PHRASE,
  maskThaiNationalId,
  type KycAddress,
} from "@/lib/kycIdentity";
import { maskBankAccount } from "@/lib/kycPdpa";
import { cn } from "@/lib/utils";

const STEPS = ["เงื่อนไข", "ตัวตน", "บัญชี", "ส่งตรวจ"] as const;

const DOC_LABELS: Record<KycDocType, string> = {
  id_front: "บัตรประชาชน (ด้านหน้า) *",
  id_back: "บัตรประชาชน (ด้านหลัง) *",
  selfie: "รูปถ่ายคู่บัตร (Selfie) *",
  bank_book: "สมุดบัญชี *",
};

type DocState = Partial<Record<KycDocType, string>>;
type PreviewState = Partial<Record<KycDocType, string>>;

function DocUploadTile({
  docType,
  preview,
  uploading,
  uploaded,
  onPick,
}: {
  docType: KycDocType;
  preview?: string;
  uploading: boolean;
  uploaded: boolean;
  onPick: (file: File | undefined) => void;
}) {
  return (
    <label
      className={cn(
        "relative flex flex-col rounded-xl border border-dashed border-border overflow-hidden cursor-pointer hover:bg-muted/40 min-h-[140px]",
        preview ? "border-primary/40" : "",
      )}
    >
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {preview ? (
        <img src={preview} alt={docType} className="w-full h-28 object-cover" />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 flex-1 p-4 min-h-[112px]">
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          ) : uploaded ? (
            <CheckCircle2 className="w-6 h-6 text-primary" />
          ) : (
            <Camera className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
      )}
      <p className="text-[10px] text-center text-muted-foreground px-2 py-2 bg-background/80">
        {DOC_LABELS[docType]}
        {preview && <span className="text-primary ml-1">· แตะเพื่อเปลี่ยน</span>}
      </p>
    </label>
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
  const {
    data: eligibility,
    isLoading: eligLoading,
    isError: eligError,
    error: eligErr,
    refetch: refetchElig,
  } = useCreatorEligibility(user?.id);
  const { data: requests = [] } = useMyKycRequests();
  const submit = useSubmitKycVerification();

  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [legalName, setLegalName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [address, setAddress] = useState<KycAddress>(emptyAddress);
  const [idType] = useState<"national_id" | "passport">("national_id");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [docs, setDocs] = useState<DocState>({});
  const [previews, setPreviews] = useState<PreviewState>({});
  const [uploading, setUploading] = useState<KycDocType | null>(null);
  const [pdpaConsent, setPdpaConsent] = useState(false);

  const isVerified = !!(profile as { is_verified?: boolean } | null | undefined)?.is_verified;
  const pending = requests.find((r) => r.status === "pending");
  const latestRejected = requests.find((r) => r.status === "rejected");

  useEffect(() => {
    if (user?.email && !contactEmail) setContactEmail(user.email);
  }, [user?.email, contactEmail]);

  useEffect(() => {
    return () => {
      Object.values(previews).forEach((url) => {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, [previews]);

  const handleUpload = async (docType: KycDocType, file: File | undefined) => {
    if (!file || !user) return;
    const localUrl = URL.createObjectURL(file);
    setPreviews((p) => {
      const prev = p[docType];
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return { ...p, [docType]: localUrl };
    });
    setUploading(docType);
    try {
      const path = await uploadKycDocument(file, user.id, docType);
      setDocs((d) => ({ ...d, [docType]: path }));
      toast.success(`อัปโหลด${DOC_LABELS[docType].replace(" *", "")}แล้ว`);
    } catch (e) {
      setPreviews((p) => {
        const next = { ...p };
        delete next[docType];
        return next;
      });
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(null);
    }
  };

  const idDocsOk = docs.id_front && docs.id_back && docs.selfie;
  const step1Ok =
    legalName.trim() &&
    isValidThaiNationalId(nationalId) &&
    phone.trim().length >= 9 &&
    contactEmail.trim().includes("@") &&
    address.line1.trim() &&
    address.district.trim() &&
    address.province.trim() &&
    address.postalCode.trim().length >= 5 &&
    idDocsOk;

  const step2Ok =
    bankName.trim() && accountNumber.trim().length >= 10 && accountName.trim() && docs.bank_book;

  const canSubmit =
    step1Ok &&
    step2Ok &&
    confirmText.trim().toUpperCase() === KYC_CONFIRM_PHRASE;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const documents = (["id_front", "id_back", "selfie", "bank_book"] as KycDocType[])
      .filter((t) => docs[t])
      .map((doc_type) => ({ doc_type, storage_path: docs[doc_type]! }));

    submit.mutate(
      {
        legalName: legalName.trim(),
        idType,
        nationalIdNumber: nationalId.replace(/\D/g, ""),
        phone: phone.trim(),
        contactEmail: contactEmail.trim(),
        address,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
        documents,
      },
      {
        onSuccess: () => setSubmitted(true),
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  if (eligLoading) {
    return <InlineLoader />;
  }

  if (eligError) {
    return (
      <div className="py-16 text-center space-y-4 px-4">
        <XCircle className="w-10 h-10 text-destructive mx-auto" />
        <p className="text-muted-foreground">โหลดข้อมูลไม่สำเร็จ</p>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          {eligErr instanceof Error ? eligErr.message : "ลองใหม่อีกครั้ง"}
        </p>
        <Button type="button" variant="outline" className="rounded-full" onClick={() => refetchElig()}>
          <RefreshCw className="w-4 h-4 mr-1" /> ลองอีกครั้ง
        </Button>
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl glass-panel p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
          <h1 className="mt-3 text-xl font-semibold">ยืนยันตัวตนแล้ว</h1>
          <p className="text-sm text-muted-foreground mt-1">ถอนเงินได้เมื่อครบเงื่อนไขผู้ติดตามและยอด earned</p>
        </div>
        {eligibility && <CreatorEligibilityProgress data={eligibility} />}
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full flex-1" onClick={() => navigate("/")}>
            <Home className="w-4 h-4 mr-1" /> หน้าแรก
          </Button>
          <Button className="rounded-full flex-1" onClick={() => navigate("/portfolio")}>
            <User className="w-4 h-4 mr-1" /> โปรไฟล์
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
            <p className="text-xs text-muted-foreground">
              ส่งเมื่อ {new Date(pending.submitted_at).toLocaleString("th-TH")}
            </p>
          )}
        </div>
        {eligibility && <CreatorEligibilityProgress data={eligibility} />}
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full flex-1" onClick={() => navigate("/")}>
            <Home className="w-4 h-4 mr-1" /> หน้าแรก
          </Button>
          <Button className="rounded-full flex-1" onClick={() => navigate("/portfolio")}>
            <User className="w-4 h-4 mr-1" /> โปรไฟล์
          </Button>
        </div>
      </div>
    );
  }

  if (eligibility && !eligibility.canStartKyc) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl glass-panel p-6 text-center">
          <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="mt-3 text-xl font-semibold">ยังไม่พร้อมยืนยันตัวตน</h1>
          <p className="text-sm text-muted-foreground mt-1">ทำ Welcome Bonus และเผยแพร่ผลงานก่อน</p>
        </div>
        <CreatorEligibilityProgress data={eligibility} defaultOpen />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {latestRejected && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 flex gap-2 text-sm">
          <XCircle className="w-5 h-5 text-destructive shrink-0" />
          <div>
            <p className="font-medium">คำขอก่อนหน้าถูกปฏิเสธ</p>
            <p className="text-muted-foreground mt-1">
              {latestRejected.reject_reason_label || latestRejected.admin_note || "กรุณาตรวจสอบและยื่นใหม่"}
            </p>
            <p className="text-xs text-primary mt-2 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> กรอกข้อมูลด้านล่างเพื่อยื่นคำขอใหม่
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
            <h2 className="font-medium">ยืนยันตัวตนเพื่อถอนเงิน</h2>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3 text-sm">
              <p className="font-medium text-foreground">ข้อมูลที่เราจะเก็บ (ตาม PDPA)</p>
              <ul className="text-muted-foreground space-y-1.5 list-disc pl-5">
                <li>ชื่อ-นามสกุล เลขบัตรประชาชน ที่อยู่ เบอร์โทร อีเมล</li>
                <li>รูปบัตร selfie สมุดบัญชี (บังคับ)</li>
                <li>ข้อมูลบัญชีธนาคารสำหรับถอนเงิน</li>
              </ul>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-5">
                {KYC_PDPA_PURPOSES.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">{KYC_PDPA_RETENTION_NOTE}</p>
            </div>
            <label className="flex items-start gap-3 rounded-xl border border-border p-4 cursor-pointer hover:bg-muted/30">
              <Checkbox checked={pdpaConsent} onCheckedChange={(v) => setPdpaConsent(v === true)} className="mt-0.5" />
              <span className="text-xs leading-relaxed text-muted-foreground">
                ข้าพเจ้ายินยอมให้เก็บและใช้ข้อมูลส่วนบุคคลข้างต้น ตาม{" "}
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
            {eligibility && <CreatorEligibilityProgress data={eligibility} compact />}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-medium">ข้อมูลส่วนตัวและเอกสาร</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>ชื่อ-นามสกุล (ตามบัตร) *</Label>
                <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="เช่น สมชาย ใจดี" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>เลขบัตรประชาชน *</Label>
                <Input
                  value={nationalId}
                  onChange={(e) => setNationalId(formatThaiNationalId(e.target.value))}
                  placeholder="1-2345-67890-12-3"
                  inputMode="numeric"
                />
                {nationalId.replace(/\D/g, "").length === 13 && !isValidThaiNationalId(nationalId) && (
                  <p className="text-xs text-destructive">เลขบัตรไม่ถูกต้อง</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>เบอร์โทร *</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08x-xxx-xxxx" inputMode="tel" />
              </div>
              <div className="space-y-2">
                <Label>อีเมลติดต่อ *</Label>
                <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} type="email" />
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
            <div className="grid gap-3 sm:grid-cols-2">
              {(["id_front", "id_back", "selfie"] as KycDocType[]).map((docType) => (
                <DocUploadTile
                  key={docType}
                  docType={docType}
                  preview={previews[docType]}
                  uploading={uploading === docType}
                  uploaded={!!docs[docType]}
                  onPick={(f) => handleUpload(docType, f)}
                />
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-medium">บัญชีรับเงิน</h2>
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
              <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="ต้องตรงกับบัตร" />
            </div>
            <DocUploadTile
              docType="bank_book"
              preview={previews.bank_book}
              uploading={uploading === "bank_book"}
              uploaded={!!docs.bank_book}
              onPick={(f) => handleUpload("bank_book", f)}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-medium">สรุปและส่งตรวจ</h2>
            <dl className="text-sm space-y-2 bg-muted/30 rounded-xl p-4">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">ชื่อตามบัตร</dt>
                <dd className="font-medium text-right">{legalName}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">เลขบัตร</dt>
                <dd className="font-medium font-mono">{maskThaiNationalId(nationalId)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">ติดต่อ</dt>
                <dd className="font-medium text-right text-xs">{phone} · {contactEmail}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">ที่อยู่</dt>
                <dd className="font-medium text-right text-xs max-w-[60%]">{formatKycAddress(address)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">ธนาคาร</dt>
                <dd className="font-medium">{bankName}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">เลขบัญชี</dt>
                <dd className="font-medium font-mono">{maskBankAccount(accountNumber)}</dd>
              </div>
            </dl>
            <div className="grid grid-cols-4 gap-1.5">
              {(["id_front", "id_back", "selfie", "bank_book"] as KycDocType[]).map((t) =>
                previews[t] ? (
                  <img key={t} src={previews[t]} alt={t} className="h-16 w-full object-cover rounded-lg border border-border" />
                ) : null,
              )}
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground leading-relaxed">
              ข้าพเจ้าขอรับรองว่าข้อมูลและเอกสารทั้งหมดเป็นความจริง ตรงกับตัวตนของข้าพเจ้า
              หากข้อมูลไม่ตรงจริง แพลตฟอร์มมีสิทธิระงับบัญชีและรายได้ตามข้อกำหนด
            </div>
            <div className="space-y-2">
              <Label>พิมพ์ {KYC_CONFIRM_PHRASE} เพื่อยืนยัน *</Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={KYC_CONFIRM_PHRASE}
                className="font-mono uppercase"
                autoComplete="off"
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-6">
          {step > 0 && (
            <Button variant="outline" className="rounded-full" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> ย้อนกลับ
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button
              className="rounded-full flex-1 bg-primary text-primary-foreground"
              onClick={() => setStep((s) => s + 1)}
              disabled={
                (step === 0 && !pdpaConsent) ||
                (step === 1 && !step1Ok) ||
                (step === 2 && !step2Ok)
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
              {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "ส่งตรวจสอบ"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerificationWizard;
