import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  sharedStorage,
  SHARED_MEDIA_BUCKET,
} from "@/integrations/supabase/sharedStorageClient";
import { useAuth } from "@/hooks/useAuth";
import { useCreateFormation } from "@/hooks/useStudioFormation";
import { useStudioIdentityAvailability } from "@/hooks/useStudioIdentityAvailability";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Building2, Plus, X, Search, Loader2, Users,
  ChevronDown, ChevronUp, ImagePlus, Upload, Mail, Phone, Globe, Instagram,
  CheckCircle2,
} from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import RequireAuth from "@/components/RequireAuth";
import { cn } from "@/lib/utils";
import { isReservedPublicHandle } from "@/lib/reservedHandles";

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9-\s]/g, "").replace(/\s+/g, "-").slice(0, 40);

const uploadImage = async (file: File, userId: string, kind: "logo" | "cover") => {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `anthem/studios/${userId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await sharedStorage.storage
    .from(SHARED_MEDIA_BUCKET)
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = sharedStorage.storage
    .from(SHARED_MEDIA_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
};

const StudioCreateInner = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const create = useCreateFormation();

  // Basic
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoBusy, setLogoBusy] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);

  // Invites
  const [search, setSearch] = useState("");
  const [invitees, setInvitees] = useState<{ id: string; display_name: string; avatar_url: string | null }[]>([]);

  // Advanced
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [coverUrl, setCoverUrl] = useState("");
  const [coverBusy, setCoverBusy] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);
  const [bio, setBio] = useState("");
  const [expertiseInput, setExpertiseInput] = useState("");
  const [expertise, setExpertise] = useState<string[]>([]);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [behance, setBehance] = useState("");
  const [dribbble, setDribbble] = useState("");
  const [availableForWork, setAvailableForWork] = useState(true);

  const finalSlug = (slug || slugify(name)).trim().toLowerCase();

  const [debouncedName, setDebouncedName] = useState("");
  const [debouncedSlug, setDebouncedSlug] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedName(name.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [name]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSlug(finalSlug), 400);
    return () => window.clearTimeout(timer);
  }, [finalSlug]);

  const {
    data: identityAvailability,
    isFetching: identityChecking,
  } = useStudioIdentityAvailability(debouncedName, debouncedSlug);

  const nameTaken = !!identityAvailability?.nameTaken;
  const slugTaken = !!identityAvailability?.slugTaken;
  const slugReserved = finalSlug.length >= 2 && isReservedPublicHandle(finalSlug);
  const slugMissing = name.trim().length > 0 && finalSlug.length === 0;
  const slugTooShort = finalSlug.length > 0 && finalSlug.length < 2;
  const identityPending =
    (name.trim().length >= 2 && debouncedName !== name.trim()) ||
    (finalSlug.length >= 2 && debouncedSlug !== finalSlug);
  const canSubmit = useMemo(
    () =>
      name.trim().length > 0 &&
      finalSlug.length >= 2 &&
      !slugMissing &&
      !identityPending &&
      !identityChecking &&
      !nameTaken &&
      !slugTaken &&
      !slugReserved,
    [name, finalSlug, slugMissing, identityPending, identityChecking, nameTaken, slugTaken, slugReserved],
  );

  useEffect(() => {
    const inviteId = searchParams.get("invite");
    if (!inviteId || !user?.id) return;
    if (invitees.some((i) => i.id === inviteId)) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles_public")
        .select("user_id, display_name, avatar_url, username")
        .eq("user_id", inviteId)
        .maybeSingle();
      if (cancelled || !data?.user_id || data.user_id === user.id) return;
      setInvitees([
        {
          id: data.user_id,
          display_name: data.display_name || data.username || "ผู้ใช้",
          avatar_url: data.avatar_url,
        },
      ]);
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, user?.id]);

  const { data: searchResults = [], isFetching } = useQuery({
    queryKey: ["studio-invite-search", search],
    enabled: search.trim().length >= 2,
    queryFn: async () => {
      const term = `%${search.trim()}%`;
      const { data } = await supabase
        .from("profiles_public")
        .select("id, display_name, avatar_url, username")
        .or(`display_name.ilike.${term},username.ilike.${term}`)
        .neq("id", user?.id ?? "")
        .limit(8);
      return (data ?? []).filter((p: any) => !invitees.some((i) => i.id === p.id));
    },
  });

  const handleLogoPick = async (file?: File) => {
    if (!file || !user) return;
    setLogoBusy(true);
    try { setLogoUrl(await uploadImage(file, user.id, "logo")); }
    catch (e: any) { toast.error(e.message ?? "อัปโหลดโลโก้ไม่สำเร็จ"); }
    finally { setLogoBusy(false); }
  };

  const handleCoverPick = async (file?: File) => {
    if (!file || !user) return;
    setCoverBusy(true);
    try { setCoverUrl(await uploadImage(file, user.id, "cover")); }
    catch (e: any) { toast.error(e.message ?? "อัปโหลดภาพปกไม่สำเร็จ"); }
    finally { setCoverBusy(false); }
  };

  const addTag = () => {
    const v = expertiseInput.trim();
    if (!v || expertise.includes(v) || expertise.length >= 12) return;
    setExpertise((p) => [...p, v]);
    setExpertiseInput("");
  };

  const submit = () => {
    if (!name.trim()) return;
    if (slugMissing) {
      toast.error("กรุณาตั้ง Slug เป็นภาษาอังกฤษหรือตัวเลขสำหรับ URL");
      return;
    }
    if (slugTooShort) {
      toast.error("Slug ต้องมีอย่างน้อย 2 ตัวอักษร");
      return;
    }
    if (nameTaken || slugTaken || slugReserved) return;
    create.mutate(
      {
        name: name.trim(),
        slug: finalSlug,
        tagline: tagline.trim(),
        inviteeIds: invitees.map((i) => i.id),
        logoUrl,
        coverUrl,
        bio: bio.trim(),
        expertise,
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        website: website.trim(),
        socialLinks: {
          website: website.trim(),
          instagram: instagram.trim(),
          behance: behance.trim(),
          dribbble: dribbble.trim(),
        },
        availableForWork,
      },
      {
        onSuccess: () => {
          if (invitees.length === 0) navigate("/portfolio");
          else navigate("/studio/invites");
        },
      }
    );
  };

  const initial = (name || "S")[0]?.toUpperCase();

  return (
    <div className="min-h-screen bg-app-ambient pb-24 lg:pb-12">
      {/* Top bar with back */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center">
          <BackButton />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Building2 className="w-7 h-7 text-primary shrink-0" />
          <div>
            <h1 className="text-2xl font-medium tracking-tight thai-display">สร้าง Studio ใหม่</h1>
            <p className="text-sm text-muted-foreground thai-body">รวมทีม designer สร้างผลงานในนามสตูดิโอ</p>
          </div>
        </div>

        {/* Basic */}
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-5 space-y-5">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => logoInput.current?.click()}
              className="w-20 h-20 rounded-2xl bg-muted/60 grid place-items-center overflow-hidden border border-border/60 hover:border-primary/60 transition relative shrink-0"
            >
              {logoBusy ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : logoUrl ? (
                <img src={logoUrl} alt="logo" className="w-full h-full object-cover" />
              ) : name ? (
                <span className="text-2xl font-semibold text-foreground/70">{initial}</span>
              ) : (
                <ImagePlus className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
            <div className="flex-1">
              <p className="text-sm font-medium thai-display">Studio Logo</p>
              <p className="text-xs text-muted-foreground thai-body">ไม่บังคับ · ถ้าไม่อัปโหลด จะใช้อักษรย่อจากชื่อ</p>
              {logoUrl && (
                <button onClick={() => setLogoUrl("")} className="text-xs text-muted-foreground hover:text-destructive mt-1">ลบโลโก้</button>
              )}
              <input ref={logoInput} type="file" accept="image/*" hidden onChange={(e) => handleLogoPick(e.target.files?.[0])} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">ชื่อ Studio *</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug) setSlug(slugify(e.target.value));
              }}
              placeholder="เช่น Pixel Garden Studio"
              className={cn("h-11 rounded-xl", nameTaken && "border-destructive focus-visible:ring-destructive")}
            />
            {name.trim().length >= 2 && (
              <p
                className={cn(
                  "text-xs flex items-center gap-1",
                  identityChecking && debouncedName !== name.trim()
                    ? "text-muted-foreground"
                    : nameTaken
                      ? "text-destructive"
                      : "text-emerald-600 dark:text-emerald-400",
                )}
              >
                {identityChecking && debouncedName !== name.trim() ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> กำลังตรวจสอบชื่อ…
                  </>
                ) : nameTaken ? (
                  "ชื่อ Studio นี้มีคนใช้แล้ว — ลองชื่ออื่น"
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3" /> ชื่อนี้ใช้ได้
                  </>
                )}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Slug (สำหรับ URL)</Label>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground">aplus1.app/s/</span>
              <Input
                value={finalSlug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className={cn(
                  "h-9 rounded-lg",
                  (slugTaken || slugMissing || slugTooShort) && "border-destructive focus-visible:ring-destructive",
                )}
              />
            </div>
            {slugMissing ? (
              <p className="text-xs text-destructive">
                ชื่อนี้สร้าง Slug อัตโนมัติไม่ได้ — กรอก slug เป็นภาษาอังกฤษหรือตัวเลข
              </p>
            ) : slugTooShort ? (
              <p className="text-xs text-destructive">Slug ต้องมีอย่างน้อย 2 ตัวอักษร</p>
            ) : finalSlug.length >= 2 ? (
              <p
                className={cn(
                  "text-xs flex items-center gap-1",
                  identityChecking && debouncedSlug !== finalSlug
                    ? "text-muted-foreground"
                    : slugTaken
                      ? "text-destructive"
                      : "text-emerald-600 dark:text-emerald-400",
                )}
              >
                {identityChecking && debouncedSlug !== finalSlug ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> กำลังตรวจสอบ slug…
                  </>
                ) : slugTaken ? (
                  slugReserved ? "Slug นี้สงวนไว้ — ลอง slug อื่น" : "Slug นี้ถูกใช้แล้ว — ลอง slug อื่น"
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3" /> Slug นี้ใช้ได้
                  </>
                )}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Tagline สั้น</Label>
            <Textarea
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={140}
              rows={2}
              placeholder="บอกตัวตนของสตูดิโอใน 1-2 ประโยค"
              className="rounded-xl"
            />
          </div>
        </div>

        {/* Invites */}
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="font-medium thai-display">เชิญสมาชิกร่วมก่อตั้ง</h2>
            <span className="text-xs text-muted-foreground">(ต้องตอบรับครบทุกคนถึงสร้างสตูดิโอ)</span>
          </div>

          {invitees.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {invitees.map((i) => (
                <div key={i.id} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-muted/60 border border-border/60">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={i.avatar_url ?? undefined} />
                    <AvatarFallback>{i.display_name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{i.display_name}</span>
                  <button onClick={() => setInvitees((p) => p.filter((x) => x.id !== i.id))} aria-label="ลบ">
                    <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา designer ด้วยชื่อหรือ username"
              className="pl-9 h-10 rounded-xl"
            />
          </div>

          {search.length >= 2 && (
            <div className="rounded-xl border border-border/50 divide-y divide-border/30">
              {isFetching ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />กำลังค้นหา
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">ไม่พบผู้ใช้</div>
              ) : (
                searchResults.map((r: any) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      if (invitees.length >= 9) return;
                      setInvitees((p) => [...p, { id: r.id, display_name: r.display_name, avatar_url: r.avatar_url }]);
                      setSearch("");
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-foreground/5 transition-colors text-left"
                  >
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={r.avatar_url ?? undefined} />
                      <AvatarFallback>{r.display_name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{r.display_name}</div>
                      {r.username && <div className="text-xs text-muted-foreground truncate">@{r.username}</div>}
                    </div>
                    <Plus className="w-4 h-4 text-primary" />
                  </button>
                ))
              )}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">เชิญได้สูงสุด 9 คน (รวมคุณคือ 10 คน)</p>
        </div>

        {/* Advanced toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1.5 thai-body"
        >
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showAdvanced ? "ซ่อนการตั้งค่าแบบละเอียด" : "+ เพิ่มการตั้งค่าแบบละเอียด (แนะนำ)"}
        </button>

        {/* Advanced section */}
        {showAdvanced && (
          <div className="bg-orange-50/60 dark:bg-primary/5 rounded-2xl p-5 space-y-5 border border-primary/15">
            {/* Cover */}
            <div className="space-y-2">
              <Label className="text-xs">Cover Image</Label>
              <button
                type="button"
                onClick={() => coverInput.current?.click()}
                className="w-full aspect-[16/9] rounded-xl bg-muted/60 grid place-items-center overflow-hidden border border-dashed border-border hover:border-primary/60 transition relative"
              >
                {coverBusy ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : coverUrl ? (
                  <img src={coverUrl} alt="cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-muted-foreground text-sm">
                    <Upload className="w-5 h-5 mx-auto mb-1" />
                    คลิกเพื่ออัปโหลดภาพปก (16:9)
                  </div>
                )}
              </button>
              <input ref={coverInput} type="file" accept="image/*" hidden onChange={(e) => handleCoverPick(e.target.files?.[0])} />
            </div>

            {/* About */}
            <div className="space-y-1.5">
              <Label className="text-xs">About Us</Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="เล่าความเป็นมา สไตล์งาน หรือจุดเด่นของสตูดิโอ"
                className="rounded-xl bg-background"
              />
            </div>

            {/* Expertise */}
            <div className="space-y-1.5">
              <Label className="text-xs">ความเชี่ยวชาญ</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {expertise.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-background border border-border/60 text-xs">
                    {t}
                    <button onClick={() => setExpertise((p) => p.filter((x) => x !== t))}>
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </span>
                ))}
              </div>
              <Input
                value={expertiseInput}
                onChange={(e) => setExpertiseInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="พิมพ์แล้วกด Enter เช่น Branding, UI/UX, 3D"
                className="rounded-xl bg-background"
              />
            </div>

            {/* Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> อีเมลติดต่อ</Label>
                <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="hello@studio.com" className="rounded-xl bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> เบอร์โทร</Label>
                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="08x-xxx-xxxx" className="rounded-xl bg-background" />
              </div>
            </div>

            {/* Social */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1"><Globe className="w-3 h-3" /> ช่องทางออนไลน์</Label>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website URL" className="rounded-xl bg-background" />
              <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="Instagram URL" className="rounded-xl bg-background" />
              <Input value={behance} onChange={(e) => setBehance(e.target.value)} placeholder="Behance URL" className="rounded-xl bg-background" />
              <Input value={dribbble} onChange={(e) => setDribbble(e.target.value)} placeholder="Dribbble URL" className="rounded-xl bg-background" />
            </div>

            {/* Availability */}
            <div className="flex items-center justify-between bg-background rounded-xl p-3 border border-border/60">
              <div>
                <p className="text-sm font-medium thai-display">พร้อมรับงาน</p>
                <p className="text-xs text-muted-foreground thai-body">เปิดให้ลูกค้าติดต่อจ้างงาน</p>
              </div>
              <Switch checked={availableForWork} onCheckedChange={setAvailableForWork} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 sticky bottom-4">
          <Button variant="outline" onClick={() => navigate(-1)} className="rounded-xl">ยกเลิก</Button>
          <Button
            onClick={submit}
            disabled={!canSubmit || create.isPending}
            className="flex-1 h-12 rounded-xl bg-gradient-brand text-white border-0 shadow-md shadow-primary/20"
          >
            {create.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {invitees.length === 0 ? "สร้าง Studio เลย" : `ส่งคำเชิญ (${invitees.length} คน)`}
          </Button>
        </div>
      </div>
    </div>
  );
};

const StudioCreatePage = () => (
  <RequireAuth>
    <StudioCreateInner />
  </RequireAuth>
);

export default StudioCreatePage;
