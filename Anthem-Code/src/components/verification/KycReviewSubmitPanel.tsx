import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Building2, CheckCircle2, ClipboardCheck, FileText, IdCard, Info, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  KYC_CONFIRM_PHRASE,
  KYC_EDD_NOTICE,
  KYC_PEP_STATUS_LABELS,
  needsPepEdd,
  type KycPepEddFields,
  type KycPepStatus,
  type KycSanctionsEddFields,
  type KycSanctionsStatus,
} from "@/lib/kycIdentity";
import { LEGAL_DPO_EMAIL } from "@/lib/legalConfig";
import { cn } from "@/lib/utils";

const KYC_INPUT_CLASS =
  "bg-muted border-border placeholder:text-muted-foreground/55";
const KYC_ERROR_CLASS = "border-destructive focus-visible:ring-destructive";

function ReqStar() {
  return (
    <span className="text-primary" aria-hidden="true">
      {" *"}
    </span>
  );
}

function kycFieldClass(invalid: boolean, extra?: string) {
  return cn(KYC_INPUT_CLASS, invalid && KYC_ERROR_CLASS, extra);
}

export type KycReviewUpload = {
  label: string;
  preview?: string;
  previewKind?: "image" | "pdf";
  uploaded: boolean;
};

type Props = {
  givenName: string;
  familyName: string;
  nationalIdMasked: string;
  identityUploads: KycReviewUpload[];
  bankName: string;
  accountMasked: string;
  accountName: string;
  bankUpload: KycReviewUpload;
  contactPhone: string;
  contactEmail: string;
  contactLine?: string;
  pepStatus: KycPepStatus | "";
  pepEdd: KycPepEddFields;
  sanctionsStatus: KycSanctionsStatus | "";
  sanctionsEdd: KycSanctionsEddFields;
  sanctionsAttested: boolean;
  confirmText: string;
  onPepStatusChange: (v: KycPepStatus) => void;
  onPepEddChange: (patch: Partial<KycPepEddFields>) => void;
  onSanctionsStatusChange: (v: KycSanctionsStatus | "") => void;
  onSanctionsEddChange: (patch: Partial<KycSanctionsEddFields>) => void;
  onSanctionsAttestedChange: (v: boolean) => void;
  onConfirmChange: (v: string) => void;
  onEditIdentity: () => void;
  onEditBank: () => void;
  onEditContact: () => void;
  showErrors?: boolean;
};

function SummaryCard({
  icon,
  title,
  onEdit,
  children,
}: {
  icon: ReactNode;
  title: string;
  onEdit?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/70 bg-card/40 p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-primary shrink-0">{icon}</span>
          <h3 className="text-base font-medium truncate">{title}</h3>
        </div>
        {onEdit && (
          <Button type="button" variant="ghost" size="sm" className="rounded-full h-8 px-3 text-sm shrink-0" onClick={onEdit}>
            Edit
          </Button>
        )}
      </div>
      {children}
    </section>
  );
}

function UploadedFileRow({ item }: { item: KycReviewUpload }) {
  const showImage = item.previewKind === "image" && !!item.preview && item.preview !== "pdf";
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      {showImage ? (
        <img loading="lazy" decoding="async"
          src={item.preview}
          alt=""
          className="w-11 h-11 rounded-lg object-cover border border-border/70 bg-muted/40 shrink-0"
        />
      ) : (
        <span className="w-11 h-11 rounded-lg border border-border/70 bg-muted/40 grid place-items-center shrink-0">
          <FileText className="w-4 h-4 text-muted-foreground" />
        </span>
      )}
      <span className="text-sm font-medium truncate flex-1">{item.label}</span>
      {item.uploaded && item.previewKind === "pdf" ? (
        <span className="text-sm text-muted-foreground shrink-0">PDF</span>
      ) : item.uploaded ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" aria-label="อัปโหลดแล้ว" />
      ) : (
        <span className="text-sm text-destructive shrink-0">ยังไม่อัป</span>
      )}
    </div>
  );
}

function InfoHint({
  label,
  title,
  children,
  readMoreTo,
  readMoreLabel = "อ่านเพิ่มเติมแบบเต็ม",
}: {
  label: string;
  title: string;
  children: ReactNode;
  readMoreTo?: string;
  readMoreLabel?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3 space-y-2 text-sm leading-relaxed" sideOffset={6}>
        <p className="font-medium text-sm text-foreground">{title}</p>
        <div className="text-muted-foreground space-y-1.5">{children}</div>
        {readMoreTo ? (
          <Link
            to={readMoreTo}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex text-sm text-primary underline underline-offset-2 pt-1"
            onClick={(e) => e.stopPropagation()}
          >
            {readMoreLabel}
          </Link>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

/** Final KYC review: summary cards + PEP/Sanctions + submit confirm. */
export function KycReviewSubmitPanel({
  givenName,
  familyName,
  nationalIdMasked,
  identityUploads,
  bankName,
  accountMasked,
  accountName,
  bankUpload,
  contactPhone,
  contactEmail,
  contactLine,
  pepStatus,
  pepEdd,
  sanctionsStatus,
  sanctionsEdd,
  sanctionsAttested,
  confirmText,
  onPepStatusChange,
  onPepEddChange,
  onSanctionsStatusChange,
  onSanctionsEddChange,
  onSanctionsAttestedChange,
  onConfirmChange,
  onEditIdentity,
  onEditBank,
  onEditContact,
  showErrors = false,
}: Props) {
  const showPepEdd = needsPepEdd(pepStatus);
  const pepInvalid = showErrors && !pepStatus;
  const pepEddInvalid = {
    position: showErrors && showPepEdd && !pepEdd.position.trim(),
    organization: showErrors && showPepEdd && !pepEdd.organization.trim(),
    relationship: showErrors && showPepEdd && !pepEdd.relationship.trim(),
  };
  const sanctionsInvalid = showErrors && !sanctionsAttested;
  const confirmOk = confirmText.trim().toUpperCase() === KYC_CONFIRM_PHRASE;
  const confirmInvalid = showErrors && !confirmOk;

  return (
    <div className="space-y-5 text-base [&_input]:!text-base">
      <div className="space-y-1">
        <h2 className="font-medium text-xl tracking-tight flex items-center gap-2.5">
          <ClipboardCheck className="w-5 h-5 text-primary shrink-0" aria-hidden />
          Review & Submit
        </h2>
        <p className="text-sm text-muted-foreground">ก่อนส่ง กรุณาตรวจสอบข้อมูลของคุณ</p>
      </div>

      <div className="space-y-3">
        <SummaryCard icon={<IdCard className="w-4 h-4" />} title="Identity" onEdit={onEditIdentity}>
          <dl className="space-y-2.5">
            <div>
              <dt className="text-sm text-muted-foreground">ชื่อ</dt>
              <dd className="text-base font-medium break-words">{givenName.trim() || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">นามสกุล</dt>
              <dd className="text-base font-medium break-words">{familyName.trim() || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">เลขบัตร</dt>
              <dd className="text-base font-medium font-mono">{nationalIdMasked}</dd>
            </div>
            {identityUploads.length > 0 && (
              <div className="pt-1 space-y-2">
                {identityUploads.map((item) => (
                  <UploadedFileRow key={item.label} item={item} />
                ))}
              </div>
            )}
          </dl>
        </SummaryCard>

        <SummaryCard icon={<Building2 className="w-4 h-4" />} title="Bank" onEdit={onEditBank}>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-base font-medium">{bankName.trim() || "—"}</p>
              <p className="text-base font-mono text-muted-foreground">{accountMasked}</p>
              {accountName.trim() && (
                <p className="text-sm text-muted-foreground pt-1">ชื่อบัญชี · {accountName.trim()}</p>
              )}
            </div>
            <UploadedFileRow item={bankUpload} />
          </div>
        </SummaryCard>

        <SummaryCard icon={<Mail className="w-4 h-4" />} title="Contact" onEdit={onEditContact}>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm text-muted-foreground">เบอร์โทร</dt>
              <dd className="text-base font-medium font-mono">{contactPhone || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">อีเมล</dt>
              <dd className="text-base font-medium">{contactEmail || "—"}</dd>
            </div>
            {contactLine ? (
              <div>
                <dt className="text-sm text-muted-foreground">LINE</dt>
                <dd className="text-base font-medium">{contactLine}</dd>
              </div>
            ) : null}
          </dl>
        </SummaryCard>
      </div>

      {/* Declarations — disclose status (EDD), attest truth; do not hard-reject */}
      <div className="space-y-4">
        <section
          data-kyc-error={pepInvalid ? "true" : undefined}
          className={cn(
            "rounded-xl border bg-card/30 p-4 space-y-3",
            pepInvalid ? "border-destructive" : "border-border",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <Label className="text-base font-medium leading-snug">
              สถานะเป็นบุคคลที่มีสถานภาพทางการเมือง (PEP)
              <ReqStar />
            </Label>
            <InfoHint
              label="อธิบาย PEP"
              title="PEP คืออะไร?"
              readMoreTo="/legal/kyc-aml#pep"
              readMoreLabel="อ่านเพิ่มเติมแบบเต็ม (อัปเดต legal)"
            >
              <p>
                <strong className="text-foreground">PEP (Politically Exposed Person)</strong> คือบุคคลที่มีสถานภาพทางการเมือง
                เช่น นักการเมือง ผู้ดำรงตำแหน่งสำคัญในรัฐ ผู้บริหารรัฐวิสาหกิจ รวมถึงครอบครัวและคนใกล้ชิด
              </p>
              <p>
                <strong className="text-foreground">ทำไมต้องยอมรับ/เปิดเผย:</strong> เพื่อทำ KYC และ AML ตามหน้าที่ของแพลตฟอร์มที่เกี่ยวกับการรับ–จ่ายเงิน
              </p>
              <p>
                <strong className="text-foreground">ป้องกันอะไร:</strong> ลดความเสี่ยงฟอกเงิน การซ่อนแหล่งที่มาของเงิน และการใช้บัญชีรับเงินในทางที่ไม่โปร่งใส
              </p>
              <p>การแจ้งสถานะนี้ไม่ทำให้ถูกปฏิเสธอัตโนมัติ — อาจเข้าสู่การตรวจสอบเพิ่มเติม (EDD)</p>
            </InfoHint>
          </div>
          <RadioGroup
            value={pepStatus}
            onValueChange={(v) => onPepStatusChange(v as KycPepStatus)}
            className="gap-2"
          >
            {(Object.keys(KYC_PEP_STATUS_LABELS) as KycPepStatus[]).map((key) => (
              <label
                key={key}
                className={cn(
                  "flex items-start gap-3 rounded-lg border border-border px-3 py-2.5 cursor-pointer hover:bg-muted/25",
                  pepStatus === key && "border-primary/50 bg-primary/5",
                )}
              >
                <RadioGroupItem value={key} className="mt-0.5 h-5 w-5" />
                <span className="text-sm leading-snug">{KYC_PEP_STATUS_LABELS[key]}</span>
              </label>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground leading-relaxed">
            การเลือกสถานะด้านบนถือว่าคุณรับรองว่าข้อมูลเกี่ยวกับสถานะ PEP เป็นความจริง
          </p>

          {showPepEdd && (
            <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-sm text-muted-foreground leading-relaxed">{KYC_EDD_NOTICE}</p>
              <p className="text-xs font-medium text-foreground">ข้อมูลเพิ่มเติมสำหรับ Enhanced Due Diligence (EDD)</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>
                    ตำแหน่ง
                    <ReqStar />
                  </Label>
                  <Input
                    className={kycFieldClass(pepEddInvalid.position)}
                    value={pepEdd.position}
                    onChange={(e) => onPepEddChange({ position: e.target.value })}
                    placeholder="เช่น ส.ส. / กรรมการรัฐวิสาหกิจ"
                    aria-invalid={pepEddInvalid.position}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>
                    หน่วยงาน
                    <ReqStar />
                  </Label>
                  <Input
                    className={kycFieldClass(pepEddInvalid.organization)}
                    value={pepEdd.organization}
                    onChange={(e) => onPepEddChange({ organization: e.target.value })}
                    placeholder="เช่น กระทรวง / บริษัทของรัฐ"
                    aria-invalid={pepEddInvalid.organization}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>วันที่พ้นจากตำแหน่ง (ถ้ามี)</Label>
                  <Input
                    className={KYC_INPUT_CLASS}
                    type="date"
                    value={pepEdd.leftAt}
                    onChange={(e) => onPepEddChange({ leftAt: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    ความสัมพันธ์
                    <ReqStar />
                  </Label>
                  <Input
                    className={kycFieldClass(pepEddInvalid.relationship)}
                    value={pepEdd.relationship}
                    onChange={(e) => onPepEddChange({ relationship: e.target.value })}
                    placeholder="เช่น ตนเอง / คู่สมรส / บุตร / คู่ค้าใกล้ชิด"
                    aria-invalid={pepEddInvalid.relationship}
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        <section
          data-kyc-error={sanctionsInvalid ? "true" : undefined}
          className={cn(
            "rounded-xl border bg-card/30 p-4 space-y-3",
            sanctionsInvalid ? "border-destructive" : "border-border",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <Label className="text-base font-medium leading-snug">
              สถานะบัญชีคว่ำบาตร (Sanctions)
              <ReqStar />
            </Label>
            <InfoHint
              label="อธิบาย Sanctions List"
              title="บัญชีคว่ำบาตรคืออะไร?"
              readMoreTo="/legal/kyc-aml#sanctions"
              readMoreLabel="อ่านเพิ่มเติมแบบเต็ม (อัปเดต legal)"
            >
              <p>
                <strong className="text-foreground">Sanctions List</strong> คือรายชื่อบุคคลหรือองค์กรที่ถูกห้ามทำธุรกรรม
                จากองค์กรระหว่างประเทศหรือรัฐบาล (เช่น UN / OFAC)
              </p>
              <p>
                <strong className="text-foreground">ทำไมต้องยอมรับ:</strong> เพื่อยืนยันก่อนส่ง KYC ว่าท่านไม่ได้อยู่ในบัญชีที่ถูกห้ามทำธุรกรรม ตามนโยบาย AML ของแพลตฟอร์ม
              </p>
              <p>
                <strong className="text-foreground">ป้องกันอะไร:</strong> ป้องกันการอำนวยความสะดวกธุรกรรมที่ผิดกฎหมายหรือถูกห้าม และการใช้แพลตฟอร์มเป็นช่องทางโอนเงินต้องห้าม
              </p>
            </InfoHint>
          </div>
          <label
            className={cn(
              "flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer hover:bg-muted/25",
              sanctionsInvalid ? "border-destructive" : sanctionsAttested ? "border-primary/50 bg-primary/5" : "border-border",
            )}
          >
            <Checkbox
              checked={sanctionsAttested}
              onCheckedChange={(v) => {
                const ok = v === true;
                onSanctionsAttestedChange(ok);
                onSanctionsStatusChange(ok ? "none" : "");
              }}
              className="mt-0.5"
            />
            <span className="text-sm leading-relaxed text-muted-foreground">
              ข้าพเจ้าขอรับรองข้อมูลว่าข้าพเจ้าไม่ได้อยู่ในบัญชีคว่ำบาตร
            </span>
          </label>
        </section>
      </div>

      {/* Privacy + review time — trust signal in green */}
      <section className="rounded-xl border border-emerald-500/35 bg-emerald-500/5 p-4 space-y-2">
        <p className="text-sm font-medium text-foreground flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
          ความเป็นส่วนตัวและระยะเวลาตรวจ
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          ข้อมูลเข้ารหัส ใช้ยืนยันตัวตนและถอนเงินเท่านั้น — ไม่เปิดสาธารณะ · ทีมตรวจ{" "}
          <span className="text-foreground font-medium">ภายใน 48 ชั่วโมง</span>
        </p>
        <p className="text-sm text-muted-foreground">
          <Link to="/legal/privacy" className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2" target="_blank">
            นโยบายความเป็นส่วนตัว
          </Link>
          {" · "}
          <Link to="/legal/kyc-aml" className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2" target="_blank">
            KYC / PEP / Sanctions
          </Link>
          {LEGAL_DPO_EMAIL ? (
            <>
              {" · "}
              <a href={`mailto:${LEGAL_DPO_EMAIL}`} className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2">
                DPO
              </a>
            </>
          ) : null}
        </p>
      </section>

      <div className="space-y-2" data-kyc-error={confirmInvalid ? "true" : undefined}>
        <Label className="leading-snug">
          พิมพ์ &quot;{KYC_CONFIRM_PHRASE}&quot; เป็นตัวพิมพ์ใหญ่
          <ReqStar />
        </Label>
        <p className="text-sm text-muted-foreground leading-relaxed">
          เพื่อรับรองว่าข้าพเจ้าเป็นเจ้าของข้อมูล และข้อมูลที่ระบุเป็นความจริง
        </p>
        <Input
          value={confirmText}
          onChange={(e) => onConfirmChange(e.target.value)}
          placeholder={KYC_CONFIRM_PHRASE}
          className={kycFieldClass(confirmInvalid, "font-mono uppercase")}
          autoComplete="off"
          aria-invalid={confirmInvalid}
        />
      </div>
    </div>
  );
}

export default KycReviewSubmitPanel;
