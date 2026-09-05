import { useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import RequireAuth from "@/components/RequireAuth";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { postingGate, useCreateHiringOrg, useMyHiringOrgs } from "@/hooks/useHiringOrgs";
import {
  HIRING_ORG_TYPE_LABEL,
  SOCIAL_KIND_LABEL,
  isValidHiringEmail,
  isValidHiringPhone,
  isValidThaiTaxId,
  normalizeSocialUrl,
  type HiringOrgType,
  type JobSocialKind,
  type JobSocialLink,
} from "@/lib/hiringOrg";
import {
  HIRING_ORG_PRIVACY_SUMMARY,
  HIRING_ORG_REVIEW_NOTE,
  HIRING_ORG_TERMS_SUMMARY,
} from "@/lib/legalSignupCopy";
import { uploadProjectImage } from "@/lib/uploadImage";
import { useSubscription } from "@/core/subscription";
import PageLoader from "@/components/ui/PageLoader";
import PhoneCountryField from "@/components/hiring/PhoneCountryField";
import ProfileAddressEditor from "@/components/profile/ProfileAddressEditor";
import {
  EMPTY_PROFILE_ADDRESS,
  formatProfileAddress,
  type ProfileAddress,
} from "@/lib/profileAddress";
import { toast } from "sonner";
import {
  Building2,
  ClipboardCheck,
  Globe,
  Hash,
  ImageIcon,
  Loader2,
  MapPin,
  Plus,
  Shield,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";

const dash = (value: string) => value.trim() || "—";

const HiringOrgRegisterInner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { tier } = useSubscription();
  const { data: orgs, isLoading } = useMyHiringOrgs();
  const create = useCreateHiringOrg();
  const gate = postingGate(orgs);

  const [step, setStep] = useState(1);
  const [legalName, setLegalName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [orgType, setOrgType] = useState<HiringOrgType>("company");
  const [taxId, setTaxId] = useState("");
  const [officeAddr, setOfficeAddr] = useState<ProfileAddress>({ ...EMPTY_PROFILE_ADDRESS });
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+66 ");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [socials, setSocials] = useState<JobSocialLink[]>([{ kind: "website", url: "" }]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedRep, setAcceptedRep] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  if (isLoading) return <PageLoader />;
  if (gate.kind === "ready") return <Navigate to="/hiring/new" replace />;
  if (gate.kind === "pending") return <Navigate to="/org/status" replace />;

  const socialOk = socials.map((s) => ({ ...s, url: normalizeSocialUrl(s.url) || s.url.trim() })).filter((s) => s.url);
  const officeLine = formatProfileAddress(officeAddr);

  const validateStep1 = () => {
    if (!legalName.trim()) return "ใส่ชื่อนิติบุคคลตามจดทะเบียน";
    if (!displayName.trim()) return "ใส่ชื่อที่ใช้โชว์บนบอร์ด";
    if (!isValidThaiTaxId(taxId)) return "เลขทะเบียนนิติบุคคล 13 หลักไม่ถูกต้อง";
    if (!officeAddr.line1.trim()) return "ใส่ที่อยู่สำนักงาน";
    if (!officeAddr.province.trim() || !officeAddr.district.trim()) return "เลือกจังหวัดและเขต";
    return null;
  };
  const validateStep2 = () => {
    if (!contactName.trim()) return "ใส่ชื่อผู้ติดต่อ";
    if (!isValidHiringEmail(email)) return "ใส่อีเมลงานให้ถูกต้อง";
    if (!isValidHiringPhone(phone)) return "ใส่เบอร์โทรให้ครบ";
    if (socialOk.length < 1 && !socials.some((s) => s.url.trim())) return "ใส่เว็บหรือโซเชียลอย่างน้อย 1 ช่อง";
    return null;
  };

  const next = () => {
    setError(null);
    setStep((s) => Math.min(3, s + 1));
  };

  const submit = async () => {
    const msg = validateStep1() || validateStep2();
    if (msg) {
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!acceptedTerms || !acceptedRep) {
      toast.error("ยอมรับข้อกำหนดและความเป็นส่วนตัวก่อนส่งตรวจ");
      return;
    }
    const links = socials.map((s) => ({ ...s, url: normalizeSocialUrl(s.url) || s.url.trim() })).filter((s) => s.url);
    await create.mutateAsync({
      legal_name: legalName.trim(),
      display_name: displayName.trim(),
      org_type: orgType,
      tax_id: taxId.replace(/\D/g, ""),
      province: officeAddr.province.trim(),
      district: officeAddr.district.trim(),
      address: officeLine,
      contact_name: contactName.trim(),
      contact_email: email.trim(),
      contact_phone: phone.trim(),
      social_links: links,
      logo_url: logoUrl,
      description: description.trim() || null,
      category: category.trim() || null,
    });
    navigate("/org/status");
  };

  const uploadLogo = async (file?: File) => {
    if (!file || !user) return;
    setLogoBusy(true);
    try {
      const url = await uploadProjectImage(file, user.id, "hiring-orgs", tier);
      setLogoUrl(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดโลโก้ไม่สำเร็จ");
    } finally {
      setLogoBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-ambient pb-24">
      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
        <BackButton to="/hiring" />
        <div>
          <h1 className="text-2xl font-semibold thai-display">สมัครองค์กร</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ลงประกาศจ้างงานได้เมื่อยืนยันนิติบุคคลแล้ว เพื่อให้ครีเอเตอร์รู้ว่าคุยกับบริษัทจริง
          </p>
          <p className="text-xs text-muted-foreground mt-2">ขั้นตอน {step} จาก 3 · กดถัดไปดูหน้าได้เลย ยังไม่บังคับกรอก</p>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <section className="space-y-3 rounded-2xl border border-border/60 p-4">
              <SectionTitle icon={Building2}>ชื่อและประเภท</SectionTitle>
              <div>
                <Label htmlFor="legal">ชื่อนิติบุคคลตามจดทะเบียน</Label>
                <Input id="legal" className="rounded-xl mt-1" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="display">ชื่อที่ใช้โชว์บนบอร์ด</Label>
                <Input id="display" className="rounded-xl mt-1" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <div>
                <Label>ประเภท</Label>
                <Select value={orgType} onValueChange={(v) => setOrgType(v as HiringOrgType)}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(HIRING_ORG_TYPE_LABEL) as HiringOrgType[]).map((k) => (
                      <SelectItem key={k} value={k}>{HIRING_ORG_TYPE_LABEL[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-border/60 p-4">
              <SectionTitle icon={Hash}>เลขทะเบียน</SectionTitle>
              <div>
                <Label htmlFor="tax">เลขทะเบียนนิติบุคคล 13 หลัก</Label>
                <Input id="tax" className="rounded-xl mt-1" inputMode="numeric" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">ใช้ตรวจว่าเป็นนิติบุคคลจริง — ไม่โชว์ทั้งเลขบนบอร์ด</p>
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-border/60 p-4">
              <SectionTitle icon={MapPin} hint="เลือกจังหวัด แล้วเลือกเขตและตำบลต่ออัตโนมัติ">ที่อยู่สำนักงาน</SectionTitle>
              <ProfileAddressEditor
                value={officeAddr}
                onChange={setOfficeAddr}
                idPrefix="org-office"
                line1Label="ที่อยู่สำนักงาน"
                hideHeader
              />
            </section>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <section className="space-y-3 rounded-2xl border border-border/60 p-4">
              <SectionTitle icon={ImageIcon}>ภาพลักษณ์บนบอร์ด</SectionTitle>
              <div>
                <Label>โลโก้</Label>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => void uploadLogo(e.target.files?.[0])} />
                <button type="button" className="mt-1 h-24 w-24 rounded-2xl border border-dashed grid place-items-center overflow-hidden" onClick={() => logoRef.current?.click()}>
                  {logoBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-xs text-muted-foreground">อัปโหลด</span>}
                </button>
              </div>
              <div>
                <Label htmlFor="cat">หมวดธุรกิจ</Label>
                <Input id="cat" className="rounded-xl mt-1" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="แฟชั่น, สตูดิโอออกแบบ" />
              </div>
              <div>
                <Label htmlFor="bio">คำอธิบายสั้น</Label>
                <Textarea id="bio" rows={3} className="rounded-xl mt-1" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-border/60 p-4">
              <SectionTitle icon={UserRound}>ผู้ติดต่อ</SectionTitle>
              <div>
                <Label htmlFor="cname">ชื่อผู้ติดต่อ</Label>
                <Input id="cname" className="rounded-xl mt-1" value={contactName} onChange={(e) => setContactName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="cemail">อีเมลงาน</Label>
                <Input id="cemail" className="rounded-xl mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="cphone">เบอร์โทร</Label>
                <PhoneCountryField id="cphone" value={phone} onChange={setPhone} />
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-border/60 p-4">
              <SectionTitle icon={Globe}>ช่องทางสาธารณะ</SectionTitle>
              <div className="space-y-2">
                <Label>เว็บหรือโซเชียล อย่างน้อย 1 ช่อง</Label>
                {socials.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <Select value={s.kind} onValueChange={(kind) => setSocials((prev) => prev.map((row, idx) => idx === i ? { ...row, kind: kind as JobSocialKind } : row))}>
                      <SelectTrigger className="rounded-xl w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="website">เว็บไซต์</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="line">Line OA</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input className="rounded-xl" value={s.url} onChange={(e) => setSocials((prev) => prev.map((row, idx) => idx === i ? { ...row, url: e.target.value } : row))} />
                    {socials.length > 1 ? (
                      <Button type="button" variant="ghost" size="icon" aria-label="ลบลิงก์" onClick={() => setSocials((p) => p.filter((_, idx) => idx !== i))}>
                        <X className="w-4 h-4" />
                      </Button>
                    ) : null}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => setSocials((p) => [...p, { kind: "instagram", url: "" }])}>
                  <Plus className="w-3 h-3 mr-1" /> เพิ่มลิงก์
                </Button>
              </div>
            </section>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <section className="space-y-3 rounded-2xl border border-border/60 p-4">
              <SectionTitle icon={ClipboardCheck}>ตรวจข้อมูลก่อนส่ง</SectionTitle>
              <PreviewBlock title="นิติบุคคล">
                <PreviewRow label="ชื่อจดทะเบียน" value={dash(legalName)} />
                <PreviewRow label="ชื่อบนบอร์ด" value={dash(displayName)} />
                <PreviewRow label="ประเภท" value={HIRING_ORG_TYPE_LABEL[orgType]} />
                <PreviewRow label="เลขทะเบียน" value={dash(taxId)} />
                <PreviewRow label="ที่อยู่" value={dash(officeLine)} />
              </PreviewBlock>
              <PreviewBlock title="ตัวตนบนบอร์ด">
                {logoUrl ? <img src={logoUrl} alt="" className="h-14 w-14 rounded-xl object-cover border border-border/60" /> : null}
                <PreviewRow label="หมวดธุรกิจ" value={dash(category)} />
                <PreviewRow label="คำอธิบาย" value={dash(description)} />
                <PreviewRow label="ผู้ติดต่อ" value={dash(contactName)} />
                <PreviewRow label="อีเมล" value={dash(email)} />
                <PreviewRow label="เบอร์โทร" value={dash(phone)} />
                <PreviewRow
                  label="โซเชียล"
                  value={socialOk.length ? socialOk.map((s) => `${SOCIAL_KIND_LABEL[s.kind]} ${s.url}`).join(" · ") : "—"}
                />
              </PreviewBlock>
            </section>

            <section className="space-y-3 rounded-2xl border border-border/60 p-4">
              <SectionTitle icon={Shield}>ข้อกำหนดและความเป็นส่วนตัว</SectionTitle>
              <p className="text-sm text-muted-foreground">{HIRING_ORG_TERMS_SUMMARY}</p>
              <p className="text-sm text-muted-foreground">{HIRING_ORG_PRIVACY_SUMMARY}</p>
              <p className="text-xs text-muted-foreground">
                อ่านเต็มที่{" "}
                <Link to="/legal/terms" target="_blank" className="text-primary hover:underline">ข้อกำหนด</Link>
                {" · "}
                <Link to="/legal/privacy" target="_blank" className="text-primary hover:underline">ความเป็นส่วนตัว</Link>
                {" · "}
                <Link to="/legal/cookies" target="_blank" className="text-primary hover:underline">คุกกี้</Link>
              </p>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={acceptedTerms} onCheckedChange={(v) => setAcceptedTerms(v === true)} className="mt-0.5" />
                <span>ฉันอ่านและยอมรับข้อกำหนดกับนโยบายความเป็นส่วนตัวแล้ว</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={acceptedRep} onCheckedChange={(v) => setAcceptedRep(v === true)} className="mt-0.5" />
                <span>ฉันเป็นผู้แทนของนิติบุคคลนี้ และยืนยันว่าข้อมูลในพรีวิวถูกต้อง</span>
              </label>
              <p className="text-xs text-muted-foreground">{HIRING_ORG_REVIEW_NOTE}</p>
            </section>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex gap-2">
          {step > 1 ? (
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setStep((s) => s - 1)}>ย้อนกลับ</Button>
          ) : null}
          {step < 3 ? (
            <Button type="button" className="rounded-xl flex-1" onClick={next}>ถัดไป</Button>
          ) : (
            <Button type="button" className="rounded-xl flex-1" disabled={create.isPending} onClick={() => void submit()}>
              {create.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              ส่งตรวจ
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

function SectionTitle({
  icon: Icon,
  children,
  hint,
}: {
  icon: LucideIcon;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
      <div>
        <h2 className="font-semibold leading-tight">{children}</h2>
        {hint ? <p className="text-xs text-muted-foreground mt-0.5">{hint}</p> : null}
      </div>
    </div>
  );
}

function PreviewBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2 rounded-xl border border-border/50 bg-muted/20 p-3">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm leading-relaxed">
      <span className="text-muted-foreground">{label} — </span>
      <span className="text-foreground break-words">{value}</span>
    </p>
  );
}

const HiringOrgRegisterPage = () => (
  <RequireAuth>
    <HiringOrgRegisterInner />
  </RequireAuth>
);

export default HiringOrgRegisterPage;
