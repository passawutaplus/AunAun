import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAuthDialog } from "@/stores/authDialogStore";
import {
  AD_PACKAGES,
  adPackageLabel,
  useMyAdApplications,
  useSubmitAdApplication,
  useMockPayAdApplication,
  useStripePayAdApplication,
  type AdApplication,
  type AdPackage,
} from "@/hooks/useAds";
import {
  AD_CUSTOM_MAX_DAYS,
  AD_CUSTOM_MAX_THB,
  AD_CUSTOM_MIN_DAYS,
  AD_CUSTOM_MIN_THB,
  AD_THB_TO_PX,
  clampAdCustomAmount,
  clampAdCustomDays,
  estimateAdImpressions,
  formatAdEstimateRange,
} from "@/lib/adEstimate";
import { uploadProjectImage } from "@/lib/uploadImage";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import AdCardPreview, { type AdDestinationKind } from "@/components/ads/AdCardPreview";

function RequiredMark() {
  return <span className="text-primary" aria-hidden> *</span>;
}
import AdvertiseHero from "@/components/ads/AdvertiseHero";
import Footer from "@/components/Footer";
import {
  CheckCircle2,
  Upload,
  CreditCard,
  Loader2,
  Clock,
  XCircle,
  X,
  MessageSquare,
  Briefcase,
  UserRound,
  Eye,
  ExternalLink,
  FolderOpen,
  LayoutGrid,
  Package,
  CalendarDays,
  Rocket,
  MoreHorizontal,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { isDemoMode } from "@/lib/demoMode";
import { BRAND_NAME } from "@/lib/brandConfig";
import { LINE_URL } from "@/lib/email-templates/brandMeta";
import { useMyProjects } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";

const SPONSOR_TYPES = [
  { id: "feed_card", label: "ลงการ์ดในฟีดผลงาน", icon: LayoutGrid },
  { id: "product", label: "สปอนเซอร์สินค้า / บริการ", icon: Package },
  { id: "event", label: "กิจกรรม / อีเวนต์", icon: CalendarDays },
  { id: "launch", label: "เปิดตัวแบรนด์", icon: Rocket },
  { id: "other", label: "อื่น ๆ", icon: MoreHorizontal },
] as const;

type SponsorTypeId = (typeof SPONSOR_TYPES)[number]["id"];

type FormMode = "creative" | "inquiry";
type SelectablePackage = Exclude<AdPackage, "inquiry">;
type AdField =
  | "contactName"
  | "email"
  | "phone"
  | "company"
  | "sponsorType"
  | "notes"
  | "adTitle"
  | "targetUrl"
  | "linkedProject"
  | "image";

const FIELD_ERROR_CLASS = "border-destructive focus-visible:ring-destructive";

const statusMeta: Record<
  AdApplication["status"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; tone: string }
> = {
  pending_payment: { label: "รอชำระเงิน", variant: "outline", tone: "text-amber-600" },
  paid: { label: "ชำระแล้ว · รออนุมัติ", variant: "secondary", tone: "text-blue-600" },
  pending: { label: "รอทีมติดต่อ", variant: "secondary", tone: "text-amber-600" },
  approved: { label: "อนุมัติ · กำลังแสดง", variant: "default", tone: "text-emerald-600" },
  rejected: { label: "ปฏิเสธ", variant: "destructive", tone: "text-red-600" },
};

function applicationStatusLabel(app: AdApplication): string {
  if (app.package === "inquiry" && app.status === "pending") return "ส่งแล้ว · รอทีมติดต่อ";
  return (statusMeta[app.status] ?? statusMeta.pending).label;
}

function projectCover(project: { cover_url?: string | null; gallery_urls?: string[] | null } | undefined): string {
  return project?.cover_url?.trim() || project?.gallery_urls?.[0]?.trim() || "";
}

const AdvertisePage = () => {
  const { user } = useAuth();
  const submit = useSubmitAdApplication();
  const payMock = useMockPayAdApplication();
  const payStripe = useStripePayAdApplication();
  const { data: mine = [] } = useMyAdApplications();
  const { data: myProjects = [] } = useMyProjects(user?.id);

  const [formMode, setFormMode] = useState<FormMode>("inquiry");
  const [destination, setDestination] = useState<AdDestinationKind>("external");
  const [pkg, setPkg] = useState<SelectablePackage>("standard");
  const [customDays, setCustomDays] = useState("14");
  const [customAmount, setCustomAmount] = useState("2000");
  const [linkedProjectId, setLinkedProjectId] = useState<string>("");
  const [adTitle, setAdTitle] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [lineId, setLineId] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sampleImages, setSampleImages] = useState<string[]>([]);
  const [sponsorType, setSponsorType] = useState<SponsorTypeId | "">("");
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AdField, boolean>>>({});

  const fieldInvalid = (key: AdField) => !!fieldErrors[key];
  const fieldClass = (key: AdField) => (fieldInvalid(key) ? FIELD_ERROR_CLASS : undefined);
  const clearFieldError = (key: AdField) => {
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: false } : prev));
  };

  const publishedProjects = useMemo(
    () => myProjects.filter((p) => p.status === "Published"),
    [myProjects],
  );
  const linkedProject = publishedProjects.find((p) => p.id === linkedProjectId);
  const previewImage = imageUrl || (destination === "project" ? projectCover(linkedProject) : "");
  const previewTitle = adTitle.trim() || linkedProject?.title || "";

  const selected = AD_PACKAGES.find((p) => p.id === pkg);
  const customDaysNum = clampAdCustomDays(parseInt(customDays, 10) || AD_CUSTOM_MIN_DAYS);
  const customAmountNum = clampAdCustomAmount(parseInt(customAmount, 10) || AD_CUSTOM_MIN_THB);
  const customEstimate = useMemo(
    () => estimateAdImpressions(customAmountNum, customDaysNum),
    [customAmountNum, customDaysNum],
  );

  const selectedSponsor = SPONSOR_TYPES.find((type) => type.id === sponsorType);
  const SelectedSponsorIcon = selectedSponsor?.icon;
  const selectedPrice = pkg === "custom" ? customAmountNum : selected?.priceTHB ?? 0;
  const selectedDays = pkg === "custom" ? customDaysNum : selected?.durationDays ?? 7;
  const selectedPx = selectedPrice * AD_THB_TO_PX;

  const handleUpload = async (file: File, asSample = false) => {
    if (!user) {
      useAuthDialog.getState().openLogin();
      return;
    }
    setUploading(true);
    try {
      const url = await uploadProjectImage(file, user.id, "ads");
      if (asSample) {
        setSampleImages((prev) => (prev.length >= 3 ? prev : [...prev, url]));
      } else {
        setImageUrl(url);
      }
      clearFieldError("image");
      toast.success("อัปโหลดภาพแล้ว");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const pickProject = (id: string) => {
    setLinkedProjectId(id);
    clearFieldError("linkedProject");
    const next = publishedProjects.find((p) => p.id === id);
    if (next && !adTitle.trim()) {
      setAdTitle(next.title);
      clearFieldError("adTitle");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      useAuthDialog.getState().openLogin();
      return;
    }

    const nextErrors: Partial<Record<AdField, boolean>> = {};
    const errors: string[] = [];
    const fail = (key: AdField, message: string) => {
      nextErrors[key] = true;
      errors.push(message);
    };

    if (!contactName.trim()) fail("contactName", "กรุณากรอกชื่อผู้ติดต่อ");
    if (!email.trim()) fail("email", "กรุณากรอกอีเมล");
    if (!phone.trim()) fail("phone", "กรุณากรอกเบอร์โทร");
    if (!company.trim()) fail("company", "กรุณากรอกบริษัท / แบรนด์");

    if (formMode === "inquiry") {
      if (!sponsorType) fail("sponsorType", "เลือกประเภทที่อยากลง");
      if (!notes.trim()) fail("notes", "กรุณากรอกรายละเอียดโฆษณา");
    } else if (destination === "project") {
      if (!linkedProjectId) fail("linkedProject", "กรุณาเลือกผลงานที่เผยแพร่แล้ว");
      if (!previewImage) fail("image", "ผลงานนี้ยังไม่มีภาพปก — อัปโหลดภาพโฆษณาหรือเลือกผลงานอื่น");
      if (!previewTitle) fail("adTitle", "กรุณากรอกชื่อโฆษณา");
    } else {
      if (!imageUrl) fail("image", "กรุณาอัปโหลดภาพโฆษณา");
      if (!adTitle.trim()) fail("adTitle", "กรุณากรอกชื่อโฆษณา");
      if (!targetUrl.trim()) fail("targetUrl", "กรุณากรอกลิงก์ปลายทาง");
      else if (!/^https?:\/\/.+\..+/.test(targetUrl.trim())) {
        fail("targetUrl", "ลิงก์ปลายทางไม่ถูกต้อง (ต้องขึ้นต้น http/https)");
      }
    }

    setFieldErrors(nextErrors);
    if (errors.length > 0) {
      setSubmitError(errors.join(" · "));
      toast.error(errors[0]);
      return;
    }

    setSubmitError(null);

    const lineNote = lineId.trim() ? `Line: ${lineId.trim()}` : "";
    const sponsorNote = sponsorType
      ? `ประเภท: ${SPONSOR_TYPES.find((t) => t.id === sponsorType)?.label ?? ""}`
      : "";
    const inquiryImages = sponsorType === "feed_card" ? sampleImages : [];
    const extraImagesNote =
      inquiryImages.length > 1 ? `ภาพเพิ่ม: ${inquiryImages.slice(1).join(" ")}` : "";
    const notesWithLine = [notes.trim(), lineNote].filter(Boolean).join("\n");

    if (formMode === "inquiry") {
      const brief = [sponsorNote, notesWithLine, extraImagesNote].filter(Boolean).join("\n")
        || `อยากติดต่อลงโฆษณา · ${company.trim() || contactName.trim()}`;
      submit.mutate(
        {
          contact_name: contactName,
          email,
          phone: phone.trim(),
          company,
          website,
          ad_title: company.trim() || "ติดต่อลงโฆษณา",
          ad_tagline: "",
          ad_description: brief,
          image_url: inquiryImages[0] ?? "",
          target_url: website.trim() || "",
          cta_label: "",
          package: "inquiry",
          duration_days: 1,
          budget_px: 0,
          amount_thb: 0,
          notes: brief,
          linked_project_id: null,
          status: "pending",
        },
        {
          onSuccess: () => {
            toast.success("ส่งแล้ว ทีมจะทักอีเมลที่ให้ไว้");
            setNotes("");
            setSponsorType("");
            setSampleImages([]);
            setFieldErrors({});
            setSubmitError(null);
          },
          onError: (err: Error) => {
            const msg = mapWriteFlowError(err, "ส่งข้อความไม่สำเร็จ");
            setSubmitError(msg);
            toast.error(msg);
          },
        },
      );
      return;
    }

    submit.mutate(
      {
        contact_name: contactName,
        email,
        phone: phone.trim(),
        company,
        website,
        ad_title: previewTitle,
        ad_tagline: "",
        ad_description: notesWithLine,
        image_url: previewImage,
        target_url: destination === "external" ? targetUrl : website.trim() || "",
        cta_label: "",
        package: pkg,
        duration_days: selectedDays,
        budget_px: selectedPx,
        amount_thb: selectedPrice,
        notes: notesWithLine,
        linked_project_id: destination === "project" ? linkedProjectId : null,
        status: "pending_payment",
      },
      {
        onSuccess: () => {
          toast.success(`ส่งคำขอเรียบร้อย · ขั้นต่อไป: ชำระเงิน ฿${selectedPrice.toLocaleString()}`, {
            description: `${adPackageLabel(pkg)} · ${selectedDays} วัน`,
          });
          setAdTitle("");
          setTargetUrl("");
          setNotes("");
          setImageUrl("");
          setLinkedProjectId("");
          setFieldErrors({});
          setSubmitError(null);
        },
        onError: (err: Error) => {
          const msg = mapWriteFlowError(err, "ส่งคำขอไม่สำเร็จ");
          setSubmitError(msg);
          toast.error(msg);
        },
      },
    );
  };

  const handleMockPay = (app: AdApplication) => {
    if (!confirm(`[Prototype] จำลองการชำระเงิน ฿${app.amount_thb.toLocaleString()} สำหรับ "${app.ad_title}"?`)) {
      return;
    }
    payMock.mutate(app.id, {
      onSuccess: () => toast.success("ชำระเงินจำลองสำเร็จ · รอแอดมินอนุมัติเพื่อเริ่มแสดงโฆษณา"),
      onError: (err: Error) => toast.error(err.message),
    });
  };

  const handleStripePay = (app: AdApplication) => {
    if (app.package === "inquiry") return;
    payStripe.mutate(
      { id: app.id, package: app.package },
      { onError: (err: Error) => toast.error(err.message) },
    );
  };

  const canPay = (app: AdApplication) =>
    app.status === "pending_payment" && app.package !== "inquiry" && app.amount_thb > 0;

  return (
    <div className="min-h-screen bg-app-ambient">
      <AdvertiseHero formMode={formMode} onSelectMode={setFormMode} />
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 lg:py-10">

        {formMode === "creative" && (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {AD_PACKAGES.map((p) => {
              const active = pkg === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPkg(p.id)}
                  className={`rounded-2xl border-2 p-5 text-left transition-all ${
                    active
                      ? "border-primary bg-primary/5 shadow-lg"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{p.name}</h3>
                    {active && <CheckCircle2 className="h-5 w-5 text-primary" />}
                  </div>
                  <p className="mt-3 text-3xl font-semibold tabular-nums">
                    ฿{p.priceTHB.toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      / {p.durationDays} วัน
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    หรือ {p.pricePx.toLocaleString()} Px · {p.estImpressions} impressions
                  </p>
                  <ul className="mt-4 space-y-1.5 text-sm">
                    {p.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}

            <div
              role="button"
              tabIndex={0}
              onClick={() => setPkg("custom")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setPkg("custom");
                }
              }}
              className={`cursor-pointer rounded-2xl border-2 p-5 text-left transition-all ${
                pkg === "custom"
                  ? "border-primary bg-primary/5 shadow-lg"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">กำหนดเอง</h3>
                {pkg === "custom" && <CheckCircle2 className="h-5 w-5 text-primary" />}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                <div>
                  <Label htmlFor="ad-custom-amount" className="text-xs">งบ (บาท)</Label>
                  <Input
                    id="ad-custom-amount"
                    type="number"
                    min={AD_CUSTOM_MIN_THB}
                    max={AD_CUSTOM_MAX_THB}
                    value={customAmount}
                    onChange={(e) => {
                      setPkg("custom");
                      setCustomAmount(e.target.value);
                    }}
                    onFocus={() => setPkg("custom")}
                  />
                </div>
                <div>
                  <Label htmlFor="ad-custom-days" className="text-xs">จำนวนวัน</Label>
                  <Input
                    id="ad-custom-days"
                    type="number"
                    min={AD_CUSTOM_MIN_DAYS}
                    max={AD_CUSTOM_MAX_DAYS}
                    value={customDays}
                    onChange={(e) => {
                      setPkg("custom");
                      setCustomDays(e.target.value);
                    }}
                    onFocus={() => setPkg("custom")}
                  />
                </div>
              </div>
              <p className="mt-3 text-2xl font-semibold tabular-nums">
                ฿{customAmountNum.toLocaleString()}
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}
                  / {customDaysNum} วัน
                </span>
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="h-3.5 w-3.5" />
                ประมาณ {formatAdEstimateRange(customEstimate.low, customEstimate.high)} ครั้ง
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                ~{customEstimate.dailyMid.toLocaleString()} ครั้ง/วัน · ไม่การันตี · งบ ฿
                {AD_CUSTOM_MIN_THB.toLocaleString()}–{AD_CUSTOM_MAX_THB.toLocaleString()} ·{" "}
                {AD_CUSTOM_MIN_DAYS}–{AD_CUSTOM_MAX_DAYS} วัน
              </p>
            </div>
          </section>
        )}

        <Card id="advertise-form" className="scroll-mt-24 p-6 md:p-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            {formMode === "inquiry" ? (
              <MessageSquare className="h-5 w-5 text-primary" aria-hidden />
            ) : (
              <Briefcase className="h-5 w-5 text-primary" aria-hidden />
            )}
            {formMode === "inquiry" ? "คุยแผนโฆษณากับทีม" : "ลงการ์ดในฟีดผลงาน"}
          </h2>
          <p className={cn("mt-1 text-sm text-muted-foreground", formMode === "inquiry" ? "mb-2" : "mb-6")}>
            {formMode === "inquiry"
              ? `โฆษณารูปแบบอื่นที่ไม่ใช่การ์ดฟีด เช่น สปอนเซอร์สินค้า กิจกรรม หรือเปิดตัวแบรนด์ กรอกแล้วทีม ${BRAND_NAME} จะทักกลับให้เร็วที่สุด`
              : "ส่งคำขอด่วนสำหรับลงโฆษณาเป็นการ์ดในหน้าฟีด ใส่ชื่อ ภาพ และลิงก์ แล้วดูพรีวิวก่อนส่ง"}
          </p>
          {formMode === "inquiry" && (
            <p className="mb-6 text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => setFormMode("creative")}
                className="underline underline-offset-2 hover:text-foreground"
              >
                อยากลงการ์ดในฟีด ใช้ส่งคำขอด่วน
              </button>
            </p>
          )}

          <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
            {formMode === "creative" && (
              <>
                <div className="order-first md:order-none md:col-span-2 lg:col-span-1 lg:row-span-8">
                  <div className="rounded-2xl border border-border bg-muted/30 p-4 lg:sticky lg:top-24">
                    <AdCardPreview title={previewTitle} imageUrl={previewImage} />
                  </div>
                </div>

                <div className="md:col-span-2 lg:col-span-1">
                  <Label>ปลายทางเมื่อคลิกการ์ด</Label>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setDestination("external")}
                      className={cn(
                        "rounded-xl border-2 p-3 text-left text-sm transition-colors",
                        destination === "external"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      <ExternalLink className="mb-1 h-4 w-4 text-primary" />
                      <p className="font-medium">ลงโฆษณาใหม่</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">ลิงก์ไปเว็บนอก</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!user) {
                          useAuthDialog.getState().openLogin();
                          return;
                        }
                        setDestination("project");
                      }}
                      className={cn(
                        "rounded-xl border-2 p-3 text-left text-sm transition-colors",
                        destination === "project"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      <FolderOpen className="mb-1 h-4 w-4 text-primary" />
                      <p className="font-medium">ผูกกับผลงานใน Aplus1</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">ใช้ผลงานที่เผยแพร่แล้ว</p>
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2 lg:col-span-1">
                  <Label htmlFor="ad-title">ชื่อโฆษณา<RequiredMark /></Label>
                  <Input
                    id="ad-title"
                    value={adTitle}
                    onChange={(e) => {
                      setAdTitle(e.target.value);
                      clearFieldError("adTitle");
                    }}
                    placeholder="เช่น โปรแกรมตัดต่อใหม่ล่าสุด"
                    className={fieldClass("adTitle")}
                    aria-invalid={fieldInvalid("adTitle")}
                  />
                </div>

                {destination === "external" ? (
                  <div className="md:col-span-2 lg:col-span-1">
                    <Label htmlFor="ad-target">ลิงก์ปลายทาง<RequiredMark /></Label>
                    <Input
                      id="ad-target"
                      type="url"
                      value={targetUrl}
                      onChange={(e) => {
                        setTargetUrl(e.target.value);
                        clearFieldError("targetUrl");
                      }}
                      placeholder="https://"
                      className={fieldClass("targetUrl")}
                      aria-invalid={fieldInvalid("targetUrl")}
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      กดที่ภาพหรือชื่อบนการ์ดจะเปิดลิงก์นี้
                    </p>
                  </div>
                ) : (
                  <div className="md:col-span-2 lg:col-span-1">
                    <Label htmlFor="ad-project">ผลงานที่เผยแพร่แล้ว<RequiredMark /></Label>
                    {publishedProjects.length > 0 ? (
                      <select
                        id="ad-project"
                        className={cn(
                          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                          fieldClass("linkedProject"),
                        )}
                        aria-invalid={fieldInvalid("linkedProject")}
                        value={linkedProjectId}
                        onChange={(e) => pickProject(e.target.value)}
                      >
                        <option value="">เลือกผลงาน</option>
                        {publishedProjects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        ยังไม่มีผลงานเผยแพร่ ·{" "}
                        <Link to="/portfolio/new" className="underline underline-offset-2">
                          ลงผลงานก่อน
                        </Link>{" "}
                        หรือสลับไปลงโฆษณาใหม่
                      </p>
                    )}
                  </div>
                )}

                <div className="md:col-span-2 lg:col-span-1">
                  <Label>
                    ภาพโฆษณา {destination === "external" ? "(4:3 แนะนำ)" : "(ไม่บังคับ ถ้าผลงานมีปก)"}
                    {destination === "external" ? <RequiredMark /> : null}
                  </Label>
                  <div className="mt-2 flex items-center gap-3">
                    {previewImage ? (
                      <img loading="lazy" decoding="async" src={previewImage} alt="" className="h-24 w-32 rounded-lg border object-cover" />
                    ) : (
                      <div
                        className={cn(
                          "flex h-24 w-32 items-center justify-center rounded-lg border-2 border-dashed bg-muted text-xs text-muted-foreground",
                          fieldInvalid("image") ? "border-destructive" : "border-border",
                        )}
                      >
                        ยังไม่มีภาพ
                      </div>
                    )}
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
                      <Upload className="h-4 w-4" />
                      {uploading ? "กำลังอัปโหลด..." : "เลือกไฟล์"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                      />
                    </label>
                  </div>
                </div>
              </>
            )}

            {formMode === "inquiry" ? (
              <>
                <div className="md:col-span-2">
                  <h3 className="flex items-center gap-2 font-medium">
                    <Briefcase className="h-4 w-4 text-primary" aria-hidden />
                    แบรนด์และงาน
                  </h3>
                </div>
                <div>
                  <Label htmlFor="ad-company">บริษัท / แบรนด์<RequiredMark /></Label>
                  <Input
                    id="ad-company"
                    value={company}
                    onChange={(e) => {
                      setCompany(e.target.value);
                      clearFieldError("company");
                    }}
                    placeholder="ชื่อแบรนด์ที่โชว์บนโฆษณา"
                    className={fieldClass("company")}
                    aria-invalid={fieldInvalid("company")}
                  />
                </div>
                <div>
                  <Label htmlFor="ad-website">เว็บไซต์หรือเพจ</Label>
                  <Input
                    id="ad-website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="ad-sponsor-type">
                    อยากสปอนเซอร์แบบไหน
                    <RequiredMark />
                  </Label>
                  <Select
                    value={sponsorType || undefined}
                    onValueChange={(value) => {
                      setSponsorType(value as SponsorTypeId);
                      clearFieldError("sponsorType");
                    }}
                  >
                    <SelectTrigger
                      id="ad-sponsor-type"
                      className={cn("mt-2", fieldClass("sponsorType"))}
                      aria-invalid={fieldInvalid("sponsorType")}
                    >
                      <SelectValue placeholder="เลือกประเภท">
                        {selectedSponsor && SelectedSponsorIcon ? (
                          <span className="flex items-center gap-2">
                            <SelectedSponsorIcon className="h-4 w-4 text-primary" aria-hidden />
                            {selectedSponsor.label}
                          </span>
                        ) : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {SPONSOR_TYPES.map((type) => {
                        const Icon = type.icon;
                        return (
                          <SelectItem key={type.id} value={type.id}>
                            <span className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-primary" aria-hidden />
                              {type.label}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                {sponsorType === "feed_card" && (
                  <>
                    <div className="md:col-span-2 lg:col-span-1">
                      <div className="rounded-2xl border border-border bg-muted/30 p-4 lg:sticky lg:top-24">
                        <AdCardPreview
                          title={company.trim() || "ชื่อแบรนด์"}
                          imageUrl={sampleImages[0] ?? ""}
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2 lg:col-span-1">
                      <Label>ภาพโฆษณา (4:3 แนะนำ)</Label>
                      <p className="mt-1 text-[11px] text-muted-foreground">อัปได้สูงสุด 3 ภาพ · ภาพแรกใช้พรีวิวการ์ด</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        {sampleImages.map((url) => (
                          <div key={url} className="relative">
                            <img loading="lazy" decoding="async" src={url} alt="" className="h-24 w-32 rounded-lg border object-cover" />
                            <button
                              type="button"
                              onClick={() => setSampleImages((prev) => prev.filter((item) => item !== url))}
                              className="absolute -right-1.5 -top-1.5 rounded-full bg-foreground p-0.5 text-background"
                              aria-label="ลบภาพ"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        {sampleImages.length < 3 && (
                          <label className="inline-flex h-24 w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-muted text-xs text-muted-foreground hover:bg-accent">
                            <Upload className="h-4 w-4" />
                            {uploading ? "กำลังอัปโหลด..." : "อัปโหลดภาพ"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploading}
                              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], true)}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </>
                )}
                <div className="md:col-span-2">
                  <Label htmlFor="ad-notes">
                    รายละเอียดโฆษณา
                    <RequiredMark />
                  </Label>
                  <Textarea
                    id="ad-notes"
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      clearFieldError("notes");
                    }}
                    rows={4}
                    placeholder="เช่น สปอนเซอร์บูธงานออกแบบเดือนหน้า"
                    className={fieldClass("notes")}
                    aria-invalid={fieldInvalid("notes")}
                  />
                </div>
                <div className="md:col-span-2 border-t pt-5">
                  <h3 className="flex items-center gap-2 font-medium">
                    <UserRound className="h-4 w-4 text-primary" aria-hidden />
                    คนที่ให้ติดต่อ
                  </h3>
                </div>
                <div>
                  <Label htmlFor="ad-contact">ชื่อผู้ติดต่อ<RequiredMark /></Label>
                  <Input
                    id="ad-contact"
                    value={contactName}
                    onChange={(e) => {
                      setContactName(e.target.value);
                      clearFieldError("contactName");
                    }}
                    placeholder="ชื่อที่ให้เรียกตอนติดต่อกลับ"
                    className={fieldClass("contactName")}
                    aria-invalid={fieldInvalid("contactName")}
                  />
                </div>
                <div>
                  <Label htmlFor="ad-email">อีเมล<RequiredMark /></Label>
                  <Input
                    id="ad-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFieldError("email");
                    }}
                    className={fieldClass("email")}
                    aria-invalid={fieldInvalid("email")}
                  />
                </div>
                <div>
                  <Label htmlFor="ad-phone">เบอร์โทร<RequiredMark /></Label>
                  <Input
                    id="ad-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      clearFieldError("phone");
                    }}
                    placeholder="08x-xxx-xxxx"
                    autoComplete="tel"
                    className={fieldClass("phone")}
                    aria-invalid={fieldInvalid("phone")}
                  />
                </div>
                <div>
                  <Label htmlFor="ad-line">ไลน์</Label>
                  <Input
                    id="ad-line"
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    placeholder="Line ID"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="md:col-span-2 border-t pt-5">
                  <h3 className="flex items-center gap-2 font-medium">
                    <UserRound className="h-4 w-4 text-primary" aria-hidden />
                    คนที่ให้ติดต่อ
                  </h3>
                </div>
                <div>
                  <Label htmlFor="ad-contact">ชื่อผู้ติดต่อ<RequiredMark /></Label>
                  <Input
                    id="ad-contact"
                    value={contactName}
                    onChange={(e) => {
                      setContactName(e.target.value);
                      clearFieldError("contactName");
                    }}
                    placeholder="ชื่อที่ให้เรียกตอนติดต่อกลับ"
                    className={fieldClass("contactName")}
                    aria-invalid={fieldInvalid("contactName")}
                  />
                </div>
                <div>
                  <Label htmlFor="ad-email">อีเมล<RequiredMark /></Label>
                  <Input
                    id="ad-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFieldError("email");
                    }}
                    className={fieldClass("email")}
                    aria-invalid={fieldInvalid("email")}
                  />
                </div>
                <div>
                  <Label htmlFor="ad-phone">เบอร์โทร<RequiredMark /></Label>
                  <Input
                    id="ad-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      clearFieldError("phone");
                    }}
                    placeholder="08x-xxx-xxxx"
                    autoComplete="tel"
                    className={fieldClass("phone")}
                    aria-invalid={fieldInvalid("phone")}
                  />
                </div>
                <div>
                  <Label htmlFor="ad-line">ไลน์</Label>
                  <Input
                    id="ad-line"
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    placeholder="Line ID"
                  />
                </div>
                <div>
                  <Label htmlFor="ad-company">บริษัท / แบรนด์<RequiredMark /></Label>
                  <Input
                    id="ad-company"
                    value={company}
                    onChange={(e) => {
                      setCompany(e.target.value);
                      clearFieldError("company");
                    }}
                    placeholder="ชื่อแบรนด์ที่โชว์บนโฆษณา"
                    className={fieldClass("company")}
                    aria-invalid={fieldInvalid("company")}
                  />
                </div>
                <div>
                  <Label htmlFor="ad-website">เว็บไซต์หรือเพจ</Label>
                  <Input
                    id="ad-website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">มีแล้วใส่ได้ ไม่มีข้ามได้</p>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="ad-notes">หมายเหตุถึงทีมงาน</Label>
                  <Textarea
                    id="ad-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </>
            )}

            {submitError && (
              <p
                className="md:col-span-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {submitError}
              </p>
            )}

            <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-end md:col-span-2">
              {formMode === "creative" && (
                <p className="mr-auto text-sm">
                  แพ็กเกจที่เลือก:{" "}
                  <Badge variant="secondary">{adPackageLabel(pkg)}</Badge>{" "}
                  <span className="text-muted-foreground">
                    ฿{selectedPrice.toLocaleString()} / {selectedDays} วัน
                  </span>
                </p>
              )}
              <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                <Button
                  type="submit"
                  disabled={submit.isPending || uploading}
                  className="flex-1 bg-primary hover:bg-primary/90 sm:flex-none"
                >
                  {submit.isPending
                    ? "กำลังส่ง..."
                    : formMode === "inquiry"
                      ? "ส่งคำขอ"
                      : "ส่งคำขอด่วน"}
                </Button>
                <a
                  href={LINE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="ติดต่อไลน์"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background hover:bg-accent"
                >
                  <img loading="lazy" decoding="async" src="/brand-icons/line.svg" alt="" className="h-5 w-5" />
                </a>
              </div>
            </div>
          </form>
        </Card>

        {user && mine.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">คำขอของฉัน</h2>
              <span className="text-xs text-muted-foreground">อัปเดตอัตโนมัติทุก 15 วินาที</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {mine.map((a) => {
                const meta = statusMeta[a.status] ?? statusMeta.pending;
                return (
                  <Card key={a.id} className="flex flex-col gap-3 p-4">
                    <div className="flex items-start gap-3">
                      {a.image_url ? (
                        <img loading="lazy" decoding="async"
                          src={a.image_url}
                          alt=""
                          className="h-16 w-16 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-muted">
                          <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-medium">{a.ad_title}</p>
                          <Badge variant={meta.variant} className={meta.tone}>
                            {applicationStatusLabel(a)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {adPackageLabel(a.package)}
                          {a.package !== "inquiry" && (
                            <>
                              {" "}
                              · {a.duration_days} วัน · ฿{a.amount_thb.toLocaleString()}
                            </>
                          )}
                        </p>
                        {a.admin_note && (
                          <p className="mt-2 flex items-start gap-1 text-xs italic text-muted-foreground">
                            {a.status === "rejected" ? (
                              <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
                            ) : (
                              <Clock className="mt-0.5 h-3 w-3 shrink-0" />
                            )}
                            <span>หมายเหตุ: {a.admin_note}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {canPay(a) && isDemoMode() && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleMockPay(a)}
                        disabled={payMock.isPending}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {payMock.isPending ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <CreditCard className="mr-1 h-4 w-4" />
                        )}
                        ชำระเงิน ฿{a.amount_thb.toLocaleString()} (Prototype)
                      </Button>
                    )}
                    {canPay(a) && !isDemoMode() && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleStripePay(a)}
                        disabled={payStripe.isPending}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {payStripe.isPending ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <CreditCard className="mr-1 h-4 w-4" />
                        )}
                        ชำระเงิน ฿{a.amount_thb.toLocaleString()}
                      </Button>
                    )}
                    {a.package === "inquiry" && a.status === "pending" && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> ส่งข้อความแล้ว · รอทีมติดต่อกลับ
                      </p>
                    )}
                    {a.status === "paid" && (
                      <p className="flex items-center gap-1 text-xs text-blue-600">
                        <Clock className="h-3 w-3" /> ชำระเงินสำเร็จ · รอแอดมินอนุมัติเพื่อเริ่มแสดงโฆษณา
                      </p>
                    )}
                    {a.status === "approved" && (
                      <p className="flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" /> โฆษณาของคุณกำลังแสดงในฟีด
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          </section>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default AdvertisePage;
