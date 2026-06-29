import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAuthDialog } from "@/stores/authDialogStore";
import {
  AD_PACKAGES,
  useMyAdApplications,
  useSubmitAdApplication,
  useMockPayAdApplication,
  useStripePayAdApplication,
  type AdApplication,
} from "@/hooks/useAds";
import { uploadProjectImage } from "@/lib/uploadImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/ui/BackButton";
import Footer from "@/components/Footer";
import {
  CheckCircle2,
  Megaphone,
  Upload,
  Sparkles,
  CreditCard,
  Loader2,
  Clock,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { isDemoMode } from "@/lib/demoMode";
import { useMyProjects } from "@/hooks/useProjects";

const statusMeta: Record<
  AdApplication["status"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; tone: string }
> = {
  pending_payment: { label: "รอชำระเงิน", variant: "outline", tone: "text-amber-600" },
  paid: { label: "ชำระแล้ว · รออนุมัติ", variant: "secondary", tone: "text-blue-600" },
  pending: { label: "รอตรวจสอบ", variant: "secondary", tone: "text-amber-600" },
  approved: { label: "อนุมัติ · กำลังแสดง", variant: "default", tone: "text-emerald-600" },
  rejected: { label: "ปฏิเสธ", variant: "destructive", tone: "text-red-600" },
};

const AdvertisePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const submit = useSubmitAdApplication();
  const payMock = useMockPayAdApplication();
  const payStripe = useStripePayAdApplication();
  const { data: mine = [] } = useMyAdApplications();
  const { data: myProjects = [] } = useMyProjects(user?.id);

  const [pkg, setPkg] = useState<"basic" | "standard" | "premium">("standard");
  const [linkedProjectId, setLinkedProjectId] = useState<string>("");
  const [adTitle, setAdTitle] = useState("");
  const [adTagline, setAdTagline] = useState("");
  const [adDescription, setAdDescription] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [ctaLabel, setCtaLabel] = useState("เรียนรู้เพิ่มเติม");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const selected = AD_PACKAGES.find((p) => p.id === pkg)!;

  const handleUpload = async (file: File) => {
    if (!user) {
      useAuthDialog.getState().openLogin();
      return;
    }
    setUploading(true);
    try {
      const url = await uploadProjectImage(file, user.id, "ads");
      setImageUrl(url);
      toast.success("อัปโหลดภาพแล้ว");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      useAuthDialog.getState().openLogin();
      return;
    }
    if (!imageUrl) return toast.error("กรุณาอัปโหลดภาพโฆษณา");
    if (!adTitle.trim()) return toast.error("กรุณากรอกชื่อโฆษณา");
    if (!targetUrl.trim()) return toast.error("กรุณากรอกลิงก์ปลายทาง");
    if (!contactName.trim() || !email.trim()) return toast.error("กรุณากรอกข้อมูลติดต่อ");

    submit.mutate(
      {
        contact_name: contactName,
        email,
        phone,
        company,
        website,
        ad_title: adTitle,
        ad_tagline: adTagline,
        ad_description: adDescription,
        image_url: imageUrl,
        target_url: targetUrl,
        cta_label: ctaLabel || "เรียนรู้เพิ่มเติม",
        package: pkg,
        duration_days: selected.durationDays,
        budget_px: selected.pricePx,
        amount_thb: selected.priceTHB,
        notes,
        linked_project_id: linkedProjectId || null,
      },
      {
        onSuccess: () => {
          toast.success(
            `ส่งคำขอเรียบร้อย · ขั้นต่อไป: ชำระเงิน ฿${selected.priceTHB.toLocaleString()}`,
            { description: `แพ็กเกจ ${selected.name} · ${selected.durationDays} วัน` }
          );
          setAdTitle("");
          setAdTagline("");
          setAdDescription("");
          setTargetUrl("");
          setNotes("");
          setImageUrl("");
        },
        onError: (e: Error) => toast.error(e.message),
      }
    );
  };

  const handleMockPay = (app: AdApplication) => {
    if (!confirm(`[Prototype] จำลองการชำระเงิน ฿${app.amount_thb.toLocaleString()} สำหรับ "${app.ad_title}"?`))
      return;
    payMock.mutate(app.id, {
      onSuccess: () => toast.success("ชำระเงินจำลองสำเร็จ · รอแอดมินอนุมัติเพื่อเริ่มแสดงโฆษณา"),
      onError: (e: Error) => toast.error(e.message),
    });
  };

  const handleStripePay = (app: AdApplication) => {
    payStripe.mutate(
      { id: app.id, package: app.package },
      { onError: (e: Error) => toast.error(e.message) },
    );
  };

  return (
    <div className="min-h-screen bg-app-ambient">
      <div className="max-w-5xl mx-auto px-4 py-6 lg:py-10 space-y-8">
        <BackButton />

        {/* Hero */}
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Megaphone className="w-3.5 h-3.5" /> โฆษณาแบรนด์ / สินค้า
          </div>
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
            โปรโมทแบรนด์และธุรกิจของคุณ
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto thai-leading-relaxed">
            สำหรับโฆษณาจากภายนอก · แสดงในฟีดพร้อมแท็ก Ads · ทีมตรวจสอบก่อนเผยแพร่
            (ต่างจาก Boost ที่ใช้ดันโพสต์ของตัวเองบนหน้ารายละเอียดผลงาน/ชุมชน)
          </p>
        </header>

        {/* Pricing */}
        <section className="grid md:grid-cols-3 gap-4">
          {AD_PACKAGES.map((p) => {
            const active = pkg === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPkg(p.id)}
                className={`text-left rounded-2xl border-2 p-5 transition-all ${
                  active
                    ? "border-primary bg-primary/5 shadow-lg"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{p.name}</h3>
                  {active && <CheckCircle2 className="w-5 h-5 text-primary" />}
                </div>
                <p className="mt-3 text-3xl font-semibold tabular-nums">
                  ฿{p.priceTHB.toLocaleString()}
                  <span className="text-sm text-muted-foreground font-normal">
                    {" "}
                    / {p.durationDays} วัน
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  หรือ {p.pricePx.toLocaleString()} Px · {p.estImpressions} impressions
                </p>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </section>

        {/* Form */}
        <Card className="p-6 md:p-8">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">ส่งคำขอลงโฆษณา</h2>
          </div>

          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <Label>ภาพโฆษณา (4:3 แนะนำ)</Label>
              <div className="mt-2 flex items-center gap-3">
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="w-32 h-24 object-cover rounded-lg border" />
                ) : (
                  <div className="w-32 h-24 rounded-lg border-2 border-dashed border-border bg-muted flex items-center justify-center text-muted-foreground text-xs">
                    ยังไม่มีภาพ
                  </div>
                )}
                <label className="inline-flex items-center gap-2 cursor-pointer px-3 py-2 border rounded-md hover:bg-accent text-sm">
                  <Upload className="w-4 h-4" />
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

            <div>
              <Label>ชื่อโฆษณา *</Label>
              <Input
                value={adTitle}
                onChange={(e) => setAdTitle(e.target.value)}
                placeholder="เช่น โปรแกรมตัดต่อใหม่ล่าสุด"
                required
              />
            </div>
            <div>
              <Label>Tagline สั้นๆ</Label>
              <Input
                value={adTagline}
                onChange={(e) => setAdTagline(e.target.value)}
                placeholder="คำอธิบายสั้นใต้ชื่อ"
              />
            </div>

            <div className="md:col-span-2">
              <Label>รายละเอียด</Label>
              <Textarea
                value={adDescription}
                onChange={(e) => setAdDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label>ลิงก์ปลายทาง *</Label>
              <Input
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://"
                required
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                คลิกจากฟีดจะเปิดลิงก์นี้โดยตรง (หรือเลือกผลงานด้านล่างเพื่อ landing ใน Aplus1)
              </p>
            </div>
            <div>
              <Label>ผลงาน Aplus1 (ไม่บังคับ)</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={linkedProjectId}
                onChange={(e) => setLinkedProjectId(e.target.value)}
              >
                <option value="">ไม่ใช้ — เปิดลิงก์ปลายทางเลย</option>
                {myProjects
                  .filter((p) => p.status === "Published")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <Label>ปุ่ม CTA</Label>
              <Input
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="เช่น สมัครเลย"
              />
            </div>

            <div className="md:col-span-2 border-t pt-5">
              <h3 className="font-medium mb-3">ข้อมูลติดต่อ</h3>
            </div>

            <div>
              <Label>ชื่อผู้ติดต่อ *</Label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>อีเมล *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>เบอร์โทร</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>บริษัท / แบรนด์</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>เว็บไซต์</Label>
              <Input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>หมายเหตุถึงทีมงาน</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>

            <div className="md:col-span-2 flex items-center justify-between gap-3 pt-3 border-t">
              <div className="text-sm">
                แพ็กเกจที่เลือก:{" "}
                <Badge variant="secondary" className="uppercase">
                  {selected.name}
                </Badge>{" "}
                <span className="text-muted-foreground">
                  ฿{selected.priceTHB.toLocaleString()} / {selected.durationDays} วัน
                </span>
              </div>
              <Button
                type="submit"
                disabled={submit.isPending || uploading}
                className="bg-primary hover:bg-primary/90"
              >
                {submit.isPending ? "กำลังส่ง..." : "ส่งคำขอ"}
              </Button>
            </div>
          </form>
        </Card>

        {/* My applications */}
        {user && mine.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">คำขอของฉัน</h2>
              <span className="text-xs text-muted-foreground">อัปเดตอัตโนมัติทุก 15 วินาที</span>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {mine.map((a) => {
                const meta = statusMeta[a.status] ?? statusMeta.pending;
                return (
                  <Card key={a.id} className="p-4 flex flex-col gap-3">
                    <div className="flex gap-3 items-start">
                      <img
                        src={a.image_url}
                        alt=""
                        className="w-16 h-16 rounded object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium truncate">{a.ad_title}</p>
                          <Badge variant={meta.variant} className={meta.tone}>
                            {meta.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {a.package.toUpperCase()} · {a.duration_days} วัน · ฿
                          {a.amount_thb.toLocaleString()}
                        </p>
                        {a.admin_note && (
                          <p className="text-xs text-muted-foreground mt-2 italic flex items-start gap-1">
                            {a.status === "rejected" ? (
                              <XCircle className="w-3 h-3 mt-0.5 text-red-500 shrink-0" />
                            ) : (
                              <Clock className="w-3 h-3 mt-0.5 shrink-0" />
                            )}
                            <span>หมายเหตุ: {a.admin_note}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {a.status === "pending_payment" && isDemoMode() && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleMockPay(a)}
                        disabled={payMock.isPending}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {payMock.isPending ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <CreditCard className="w-4 h-4 mr-1" />
                        )}
                        ชำระเงิน ฿{a.amount_thb.toLocaleString()} (Prototype)
                      </Button>
                    )}
                    {a.status === "pending_payment" && !isDemoMode() && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleStripePay(a)}
                        disabled={payStripe.isPending}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {payStripe.isPending ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <CreditCard className="w-4 h-4 mr-1" />
                        )}
                        ชำระเงิน ฿{a.amount_thb.toLocaleString()}
                      </Button>
                    )}
                    {a.status === "paid" && (
                      <p className="text-xs text-blue-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> ชำระเงินสำเร็จ · รอแอดมินอนุมัติเพื่อเริ่มแสดงโฆษณา
                      </p>
                    )}
                    {a.status === "approved" && (
                      <p className="text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> โฆษณาของคุณกำลังแสดงในฟีด
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
