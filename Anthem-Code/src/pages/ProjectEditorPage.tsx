import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Eye, ImagePlus, Loader2, Save, Upload, X } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useCreateProject, useProject, useUpdateProject } from "@/hooks/useProjects";
import { uploadProjectImage } from "@/lib/uploadImage";
import { uploadProjectVideo } from "@/lib/uploadVideo";
import { useSubscription } from "@/core/subscription";
import { getProjectLimits } from "@/lib/projectLimits";
import { supabase } from "@/integrations/supabase/client";
import { projectSchema, validateProjectPublish } from "@/lib/validators";
import { categories } from "@/data/projectTypes";
import { toast } from "sonner";
import StudioCreditPicker from "@/components/profile/StudioCreditPicker";
import LicensePicker from "@/components/license/LicensePicker";
import TagPicker from "@/components/tags/TagPicker";
import ToolPicker from "@/components/tools/ToolPicker";
import ProjectPreviewDialog, { type ProjectPreviewData } from "@/components/project/ProjectPreviewDialog";
import ThirdPartyAssetsToggle from "@/components/license/ThirdPartyAssetsToggle";
import OriginalWorkAttestation from "@/components/license/OriginalWorkAttestation";
import { LEGAL_ATTESTATION_VERSION } from "@/lib/legalConfig";
import { type LicenseType, isLicenseType } from "@/lib/licenses";
import {
  PortfolioEditorModeToggle,
  type PortfolioEditorMode,
} from "@/components/project/PortfolioEditorModeToggle";
import { PortfolioAiAssistPanel } from "@/components/project/PortfolioAiAssistPanel";
import { GalleryMediaButtons } from "@/components/project/GalleryMediaButtons";
import { SortableGalleryGrid } from "@/components/project/SortableGalleryGrid";
import {
  applyImageOrderToMedia,
  countMediaByKind,
  imageUrlsFromMedia,
  mediaItemFromUrl,
  mediaItemsFromProject,
  splitMediaItems,
  type PortfolioMediaItem,
} from "@/lib/portfolioMedia";
import { mergeDrillTags } from "@/lib/drillProject";
import { DrillPostNotice } from "@/components/drill/DrillPostNotice";
import {
  usePortfolioAiAssist,
  type PortfolioAiAssistResult,
} from "@/hooks/usePortfolioAiAssist";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";
import { cn } from "@/lib/utils";

type Status = "Published" | "Draft" | "Private";

const EDITOR_STEPS = [
  { id: 1, label: "รูป" },
  { id: 2, label: "รายละเอียด" },
  { id: 3, label: "ตั้งค่า" },
  { id: 4, label: "เผยแพร่" },
] as const;

const ProjectEditorPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [params] = useSearchParams();
  const editing = !!id;
  const isDrillPost = params.get("from") === "so1o" && params.get("drill_type");
  const isDailyDrillPost = isDrillPost && params.get("drill_type") === "daily";
  const { user, loading: authLoading } = useAuth();
  const { tier } = useSubscription();
  const limits = getProjectLimits(tier);
  const folderRef = useRef<string>(id ?? crypto.randomUUID());
  const drillMetaRef = useRef<{ drill_type?: string; drill_date?: string }>({});

  const { data: existing } = useProject(id);
  const create = useCreateProject();
  const update = useUpdateProject();

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("Graphic");
  const [cover, setCover] = useState<string>("");
  const [mediaItems, setMediaItems] = useState<PortfolioMediaItem[]>([]);
  const [tools, setTools] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [price, setPrice] = useState<string>("");
  const [status, setStatus] = useState<Status>("Draft");
  const [allowHire, setAllowHire] = useState(true);
  const [allowCollab, setAllowCollab] = useState(true);
  const [studioId, setStudioId] = useState<string | null>(null);
  const [creditedIds, setCreditedIds] = useState<string[]>([]);
  const [licenseType, setLicenseType] = useState<LicenseType>("all_rights");
  const [licenseNote, setLicenseNote] = useState("");
  const [copyrightHolder, setCopyrightHolder] = useState("");
  const [hasThirdPartyAssets, setHasThirdPartyAssets] = useState(false);
  const [thirdPartyNote, setThirdPartyNote] = useState("");
  const [rightsAttested, setRightsAttested] = useState(false);
  const [toolInput, setToolInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<PortfolioEditorMode>("manual");
  const [aiHint, setAiHint] = useState("");
  const [editorStep, setEditorStep] = useState(1);

  const {
    loading: aiLoading,
    result: aiResult,
    runAssist,
    clearResult,
    limitReached: aiLimitReached,
  } = usePortfolioAiAssist();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth?redirect=/portfolio/new");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (editing || existing) return;
    if (params.get("from") !== "so1o") return;
    const prefillTitle = params.get("title")?.trim();
    const prefillClient = params.get("client")?.trim();
    const prefillDesc = params.get("description")?.trim();
    const prefillCat = params.get("category")?.trim();
    const prefillTags = params.get("tags")?.trim();
    const drillType = params.get("drill_type")?.trim();
    const drillDate = params.get("drill_date")?.trim();
    if (prefillTitle) setTitle(prefillTitle);
    if (prefillDesc) setDescription(prefillDesc);
    if (prefillCat && categories.some((c) => c === prefillCat)) setCategory(prefillCat);
    if (prefillTags) {
      setTags(
        prefillTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      );
    }
    drillMetaRef.current = { drill_type: drillType, drill_date: drillDate };
    if (prefillClient && !prefillDesc) {
      setDescription((d) =>
        d.trim()
          ? d
          : `โปรเจกต์สำหรับลูกค้า ${prefillClient} — เสร็จจาก So1o Job Tracker`,
      );
    }
  }, [editing, existing, params]);

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setSubtitle(existing.subtitle ?? "");
      setDescription(existing.description ?? "");
      setCategory(existing.category);
      setCover(existing.cover_url ?? "");
      setMediaItems(
        mediaItemsFromProject(
          existing.gallery_urls ?? [],
          ((existing as { video_urls?: string[] }).video_urls) ?? [],
        ),
      );
      setTools(existing.tools ?? []);
      setTags(existing.tags ?? []);
      setPrice(existing.price_thb ? String(existing.price_thb) : "");
      setStatus(existing.status as Status);
      setAllowHire((existing as any).allow_hire ?? true);
      setAllowCollab((existing as any).allow_collab ?? true);
      setStudioId((existing as any).studio_id ?? null);
      setCreditedIds(((existing as any).credited_user_ids as string[]) ?? []);
      const lt = (existing as { license_type?: string }).license_type;
      setLicenseType(isLicenseType(lt ?? "") ? lt : "all_rights");
      setLicenseNote((existing as { license_note?: string }).license_note ?? "");
      setCopyrightHolder((existing as { copyright_holder?: string }).copyright_holder ?? "");
      setHasThirdPartyAssets((existing as { has_third_party_assets?: boolean }).has_third_party_assets ?? false);
      setThirdPartyNote((existing as { third_party_note?: string }).third_party_note ?? "");
      setRightsAttested(!!(existing as { rights_attested_at?: string | null }).rights_attested_at);
    }
  }, [existing]);

  const handleCover = async (file: File) => {
    if (!user) return;
    setUploadingCover(true);
    try {
      const url = await uploadProjectImage(file, user.id, folderRef.current, tier);
      setCover(url);
      toast.success("อัปโหลดภาพปกสำเร็จ");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleGallery = async (files: FileList | File[]) => {
    if (!user) return;
    const arr = Array.from(files);
    const maxGallery = Number.isFinite(limits.galleryImages) ? limits.galleryImages : 20;
    const imageCount = countMediaByKind(mediaItems, "image");
    if (imageCount + arr.length > maxGallery) {
      toast.error(`รวมแล้วต้องไม่เกิน ${maxGallery} ภาพ`);
      return;
    }
    setUploadingGallery(true);
    try {
      const urls: string[] = [];
      for (const f of arr) {
        const u = await uploadProjectImage(f, user.id, folderRef.current, tier);
        urls.push(u);
      }
      const added = urls.map(mediaItemFromUrl);
      setMediaItems((prev) => [...prev, ...added]);
      if (editorMode === "ai" && !cover && urls[0]) {
        setCover(urls[0]);
      }
      toast.success(`อัปโหลด ${urls.length} ภาพสำเร็จ`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploadingGallery(false);
    }
  };

  const removeMediaItem = (index: number) => {
    setMediaItems((prev) => {
      const removed = prev[index];
      const next = prev.filter((_, j) => j !== index);
      if (removed?.kind === "image" && removed.url === cover) {
        const nextCover = next.find((m) => m.kind === "image")?.url ?? "";
        setCover(nextCover);
      }
      return next;
    });
  };

  const applyAiField = (field: keyof PortfolioAiAssistResult, result: PortfolioAiAssistResult) => {
    switch (field) {
      case "image_order": {
        setMediaItems((prev) => applyImageOrderToMedia(prev, result.image_order));
        break;
      }
      case "cover_index": {
        const images = imageUrlsFromMedia(mediaItems);
        const url = images[result.cover_index];
        if (url) setCover(url);
        break;
      }
      case "title":
        setTitle(result.title);
        break;
      case "subtitle":
        setSubtitle(result.subtitle);
        break;
      case "description":
        setDescription(result.description);
        break;
      case "category":
        setCategory(result.category);
        break;
      case "tags":
        setTags(result.tags);
        break;
      case "tools":
        setTools(result.tools);
        break;
    }
    toast.success("นำผลลัพธ์ไปใช้แล้ว");
  };

  const applyAiAll = (result: PortfolioAiAssistResult) => {
    const images = imageUrlsFromMedia(mediaItems);
    const coverUrl = images[result.cover_index] ?? images[0] ?? "";
    setMediaItems((prev) => applyImageOrderToMedia(prev, result.image_order));
    setCover(coverUrl);
    setTitle(result.title);
    setSubtitle(result.subtitle);
    setDescription(result.description);
    setCategory(result.category);
    setTags(result.tags);
    setTools(result.tools);
    toast.success("นำผลลัพธ์ทั้งหมดไปใช้แล้ว");
  };

  const handleRunAi = async () => {
    const imageCount = countMediaByKind(mediaItems, "image");
    if (imageCount < 2) {
      toast.error("ต้องมีอย่างน้อย 2 รูปเพื่อใช้ AI");
      return;
    }
    if (editing && title.trim()) {
      const ok = window.confirm("AI จะเติมข้อมูลใหม่ — ข้อความเดิมอาจถูกแทนที่เมื่อกด「ใช้ทั้งหมด」ต่อไป ต้องการดำเนินการต่อ?");
      if (!ok) return;
    }
    try {
      await runAssist({
        imageUrls: imageUrlsFromMedia(mediaItems).slice(0, 8),
        hint: aiHint,
        categoryHint: category,
      });
      toast.success("AI วิเคราะห์เสร็จแล้ว — กด「ใช้」เพื่อเติมข้อมูล");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      if (msg === "limit_reached") {
        toast.error("เครดิต AI หมดแล้ว — อัปเกรดที่ So1o");
      } else if (msg === "rate_limited") {
        toast.error("ใช้งาน AI หนาแน่นเกินไป — ลองใหม่ใน 1 นาที");
      } else {
        toast.error("AI ไม่สำเร็จ — ลองใหม่อีกครั้ง");
      }
    }
  };

  const handleVideo = async (file: File) => {
    if (!user) return;
    if (countMediaByKind(mediaItems, "video") >= limits.videosPerProject) {
      toast.error(`แพ็กเกจนี้อัปโหลดวิดีโอได้สูงสุด ${limits.videosPerProject} คลิป/ผลงาน`);
      return;
    }
    setUploadingVideo(true);
    try {
      const url = await uploadProjectVideo(file, user.id, folderRef.current, tier);
      setMediaItems((prev) => [...prev, mediaItemFromUrl(url)]);
      toast.success("อัปโหลดวิดีโอสำเร็จ");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSubmit = async (publish?: boolean) => {
    if (!user) return;
    const targetStatus: Status = publish === undefined ? status : publish ? "Published" : "Draft";

    if (targetStatus === "Published" && existing?.status !== "Published") {
      const maxPublished = limits.published;
      if (Number.isFinite(maxPublished)) {
        const { count } = await supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", user.id)
          .eq("status", "Published");
        if ((count ?? 0) >= maxPublished) {
          toast.error(`แพ็ก Free เผยแพร่ได้สูงสุด ${maxPublished} ผลงาน — อัปเกรด Pro เพื่อไม่จำกัด`);
          return;
        }
      }
    }
    if (targetStatus === "Draft" && !editing) {
      const { count } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("status", "Draft");
      if ((count ?? 0) >= limits.draft) {
        toast.error(`Draft เต็มแล้ว (${limits.draft} ชิ้น) — เผยแพร่หรือลบ draft ก่อน`);
        return;
      }
    }

    const rightsAttestedAt = rightsAttested ? new Date().toISOString() : null;

    const { gallery_urls, video_urls } = splitMediaItems(mediaItems);

    let finalTags = mergeDrillTags(
      tags,
      drillMetaRef.current.drill_type,
      drillMetaRef.current.drill_date,
    );

    const payload = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      description: description.trim(),
      category,
      cover_url: cover,
      gallery_urls,
      video_urls,
      tools,
      tags: finalTags,
      price_thb: price ? Number(price) : null,
      status: targetStatus,
      allow_hire: allowHire,
      allow_collab: allowCollab,
      studio_id: studioId,
      credited_user_ids: studioId ? creditedIds : [],
      license_type: licenseType,
      license_note: licenseNote.trim(),
      has_third_party_assets: hasThirdPartyAssets,
      third_party_note: thirdPartyNote.trim(),
      copyright_holder: copyrightHolder.trim(),
      rights_attested_at: rightsAttestedAt,
      rights_attestation_version: rightsAttested ? LEGAL_ATTESTATION_VERSION : null,
    };

    const parsed = projectSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }
    if (targetStatus === "Published" && !cover) {
      toast.error("ต้องมีภาพปกก่อนเผยแพร่");
      return;
    }
    if (targetStatus === "Published" && !rightsAttested) {
      toast.error("กรุณายืนยันสิทธิ์ในผลงานก่อนเผยแพร่");
      return;
    }
    const publishErr = validateProjectPublish(parsed.data);
    if (publishErr) {
      toast.error(publishErr);
      return;
    }

    try {
      if (editing && id) {
        await update.mutateAsync({ id, patch: payload });
        toast.success("บันทึกการเปลี่ยนแปลงแล้ว");
        navigate(`/project/${id}`);
      } else {
        const created = await create.mutateAsync({ ...payload, owner_id: user.id });
        toast.success(targetStatus === "Published" ? "เผยแพร่ผลงานแล้ว" : "บันทึกฉบับร่างแล้ว");
        if (
          targetStatus === "Published" &&
          drillMetaRef.current.drill_type === "daily"
        ) {
          navigate("/?drill=1");
        } else {
          navigate(`/project/${created.id}`);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    }
  };

  const cats = categories.filter((c) => c !== "Explore");
  const saving = create.isPending || update.isPending;
  const canPublish = !!cover && rightsAttested;
  const publishBlockedReason = !cover
    ? "ต้องมีภาพปกก่อนเผยแพร่"
    : !rightsAttested
      ? "กรุณายืนยันสิทธิ์ในผลงานก่อนเผยแพร่"
      : undefined;

  const handleEditorModeChange = (mode: PortfolioEditorMode) => {
    if (mode === "ai" && cover) {
      const images = imageUrlsFromMedia(mediaItems);
      if (!images.includes(cover)) {
        setMediaItems((prev) => [mediaItemFromUrl(cover), ...prev]);
      }
    }
    setEditorMode(mode);
  };

  const imageCount = countMediaByKind(mediaItems, "image");
  const videoCount = countMediaByKind(mediaItems, "video");
  const maxGallery = Number.isFinite(limits.galleryImages) ? limits.galleryImages : 20;

  const previewData: ProjectPreviewData = {
    title,
    subtitle,
    description,
    category,
    cover,
    gallery: mediaItems.map((m) => m.url),
    tools,
    tags,
    price: price ? `฿${Number(price).toLocaleString("th-TH")}` : undefined,
    allowHire,
    allowCollab,
    licenseType,
    licenseNote,
    copyrightHolder,
    hasThirdPartyAssets,
    thirdPartyNote,
  };

  return (
    <div className={cn("min-h-screen bg-app-ambient", MOBILE_PAGE_BOTTOM_CLASS)}>
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton />
          <h1 className="text-base font-semibold text-foreground ml-2">{editing ? "แก้ไขผลงาน" : "เพิ่มผลงานใหม่"}</h1>
          <div className="ml-auto hidden sm:flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full shrink-0"
              onClick={() => setPreviewOpen(true)}
              aria-label="พรีวิวผลงาน"
              title="พรีวิวผลงาน"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSubmit(false)} disabled={saving} className="rounded-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              บันทึกฉบับร่าง
            </Button>
            <Button
              size="sm"
              onClick={() => handleSubmit(true)}
              disabled={saving || !canPublish}
              title={publishBlockedReason}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              เผยแพร่
            </Button>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="border-b border-border/60 bg-background/60">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-1 sm:gap-2">
            {EDITOR_STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => setEditorStep(s.id)}
                  className={cn(
                    "flex items-center gap-1.5 min-w-0 rounded-full px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium transition-colors",
                    editorStep === s.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <span className={cn(
                    "w-5 h-5 rounded-full grid place-items-center text-[10px] shrink-0",
                    editorStep === s.id ? "bg-primary-foreground/20" : "bg-muted",
                  )}>
                    {s.id}
                  </span>
                  <span className="truncate hidden sm:inline">{s.label}</span>
                </button>
                {i < EDITOR_STEPS.length - 1 && (
                  <div className={cn("h-0.5 flex-1 rounded hidden sm:block", editorStep > s.id ? "bg-primary" : "bg-muted")} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <PortfolioEditorModeToggle mode={editorMode} onModeChange={handleEditorModeChange} />

      {isDrillPost ? (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <DrillPostNotice daily={isDailyDrillPost} />
        </div>
      ) : null}

      <div className="max-w-6xl mx-auto px-4 py-6 pb-28 lg:pb-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left: content */}
        <div className="space-y-6">
          <div className={cn(editorStep !== 1 && "hidden lg:block")}>
          {editorMode === "ai" ? (
            <PortfolioAiAssistPanel
              mediaItems={mediaItems}
              coverUrl={cover}
              category={category}
              categories={cats}
              hint={aiHint}
              onHintChange={setAiHint}
              onCategoryChange={setCategory}
              uploadingGallery={uploadingGallery}
              uploadingVideo={uploadingVideo}
              onPickFiles={handleGallery}
              onPickVideo={(f) => void handleVideo(f)}
              onReorder={setMediaItems}
              onSetCover={setCover}
              onRemove={removeMediaItem}
              maxGallery={maxGallery}
              maxVideos={limits.videosPerProject}
              aiLoading={aiLoading}
              aiResult={aiResult}
              limitReached={aiLimitReached}
              onRunAi={() => void handleRunAi()}
              onApplyAll={applyAiAll}
              onApplyField={applyAiField}
              onClearResult={clearResult}
            />
          ) : (
            <section className="space-y-2">
              <Label className="text-sm font-semibold">ภาพปก *</Label>
              <CoverDrop url={cover} loading={uploadingCover} onPick={handleCover} onClear={() => setCover("")} />
              <p className="text-xs text-muted-foreground">ใช้เป็นภาพหลักในฟีดและการค้นหา (จะถูกบีบเป็น WebP คุณภาพ HD)</p>
            </section>
          )}

          </div>

          <div className={cn(editorStep !== 2 && "hidden lg:block", "space-y-6")}>
          {/* Title */}
          <section className="space-y-2">
            <Label className="text-sm font-semibold">ชื่อผลงาน *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น โลโก้ร้านกาแฟเชียงใหม่ Doi Brew"
              className="text-2xl font-medium h-14 px-4"
              maxLength={120}
            />
          </section>

          {/* Subtitle */}
          <section className="space-y-2">
            <Label className="text-sm font-semibold">คำโปรย</Label>
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="สรุปสั้นๆ ใน 1 ประโยค"
              maxLength={180}
            />
          </section>

          {/* Description */}
          <section className="space-y-2">
            <Label className="text-sm font-semibold">รายละเอียด</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`เล่าที่มา แนวคิด กระบวนการ และผลลัพธ์ของงานนี้...\n\nรองรับการเว้นบรรทัดเพื่อให้อ่านง่าย`}
              rows={8}
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/5000</p>
          </section>
          </div>

          {/* Gallery — manual mode only (AI mode uses panel above) */}
          {editorMode === "manual" && (
          <div className={cn(editorStep !== 1 && "hidden lg:block")}>
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label className="text-sm font-semibold">
                  แกลเลอรีผลงาน ({imageCount}/{maxGallery} ภาพ
                  {limits.videosPerProject > 0 ? `, ${videoCount}/${limits.videosPerProject} วิดีโอ` : ""})
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">ลากเพื่อเรียงลำดับ · วิดีโอสูงสุด ~15MB/คลิป</p>
              </div>
              <GalleryMediaButtons
                imageDisabled={uploadingGallery || imageCount >= maxGallery}
                videoDisabled={uploadingVideo || videoCount >= limits.videosPerProject}
                uploadingImage={uploadingGallery}
                uploadingVideo={uploadingVideo}
                onPickImages={handleGallery}
                onPickVideo={(f) => void handleVideo(f)}
              />
            </div>

            {mediaItems.length === 0 ? (
              <GalleryDrop loading={uploadingGallery} onPick={handleGallery} />
            ) : (
              <div className="space-y-3">
                <SortableGalleryGrid
                  items={mediaItems}
                  coverUrl={cover}
                  onReorder={setMediaItems}
                  onSetCover={setCover}
                  onRemove={removeMediaItem}
                  layout="list"
                />
                {(uploadingGallery || uploadingVideo) && (
                  <div className="rounded-2xl border border-dashed border-border bg-card p-8 flex items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> กำลังอัปโหลด...
                  </div>
                )}
              </div>
            )}
          </section>
          </div>
          )}
        </div>

        {/* Right: sidebar */}
        <aside className={cn("space-y-5 lg:sticky lg:top-20 lg:self-start", editorStep !== 3 && editorStep !== 4 && "hidden lg:block")}>
          <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">หมวดงาน *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">การมองเห็น</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft — ฉบับร่าง</SelectItem>
                  <SelectItem value="Published">Published — เผยแพร่</SelectItem>
                  <SelectItem value="Private">Private — ส่วนตัว</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">ราคาเริ่มต้น (฿)</Label>
              <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="เช่น 3500" />
            </div>

            <div className="space-y-3 pt-2 border-t border-border/60">
              <LicensePicker
                value={licenseType}
                onChange={setLicenseType}
                licenseNote={licenseNote}
                onLicenseNoteChange={setLicenseNote}
                copyrightHolder={copyrightHolder}
                onCopyrightHolderChange={setCopyrightHolder}
              />
              <ThirdPartyAssetsToggle
                enabled={hasThirdPartyAssets}
                onEnabledChange={setHasThirdPartyAssets}
                note={thirdPartyNote}
                onNoteChange={setThirdPartyNote}
              />
              <OriginalWorkAttestation
                checked={rightsAttested}
                onCheckedChange={setRightsAttested}
              />
            </div>

            <div className="space-y-3 pt-2 border-t border-border/60">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">ปุ่มติดต่อในผลงานนี้</Label>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-foreground">ปุ่ม "สนใจจ้างงาน"</p>
                  <p className="text-xs text-muted-foreground">ให้ผู้ชมส่งคำขอจ้างได้</p>
                </div>
                <Switch checked={allowHire} onCheckedChange={setAllowHire} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-foreground">ปุ่ม "สนใจคอลแลป"</p>
                  <p className="text-xs text-muted-foreground">เปิดรับ Collab จากผู้ชม</p>
                </div>
                <Switch checked={allowCollab} onCheckedChange={setAllowCollab} />
              </div>
              {licenseType === "commercial_license" && !allowHire && (
                <p className="text-xs text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2">
                  แนะนำเปิดปุ่ม &quot;สนใจจ้างงาน&quot; เพื่อให้ผู้ชมติดต่อซื้อสิทธิ์ได้ง่ายขึ้น
                </p>
              )}
            </div>
          </div>

          {user && (
            <StudioCreditPicker
              studioId={studioId}
              setStudioId={setStudioId}
              creditedIds={creditedIds}
              setCreditedIds={setCreditedIds}
              ownerId={user.id}
            />
          )}



          <ToolPicker
            userId={user?.id}
            tools={tools}
            onChange={setTools}
            input={toolInput}
            setInput={setToolInput}
          />
          <TagPicker
            userId={user?.id}
            tags={tags}
            onChange={setTags}
            input={tagInput}
            setInput={setTagInput}
          />
        </aside>
      </div>

      {/* Mobile sticky CTA */}
      <div
        className="lg:hidden fixed inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-md px-4 py-3"
        style={{ bottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="max-w-6xl mx-auto flex items-center gap-2">
          {editorStep > 1 && (
            <Button type="button" variant="outline" className="rounded-xl shrink-0" onClick={() => setEditorStep((s) => s - 1)}>
              ย้อนกลับ
            </Button>
          )}
          {editorStep < 4 ? (
            <Button type="button" className="flex-1 rounded-xl" onClick={() => setEditorStep((s) => s + 1)}>
              ถัดไป — {EDITOR_STEPS[editorStep]?.label ?? ""}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => handleSubmit(false)}
                disabled={saving}
              >
                บันทึกฉบับร่าง
              </Button>
              <Button
                type="button"
                className="flex-1 rounded-xl bg-primary text-primary-foreground"
                onClick={() => handleSubmit(true)}
                disabled={saving || !canPublish}
                title={publishBlockedReason}
              >
                เผยแพร่
              </Button>
            </>
          )}
        </div>
      </div>

      <ProjectPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        data={previewData}
        ownerId={user?.id}
      />
    </div>
  );
};

/* ---------- subcomponents ---------- */

const CoverDrop = ({ url, loading, onPick, onClear }: { url: string; loading: boolean; onPick: (f: File) => void; onClear: () => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  if (url) {
    return (
      <div className="relative rounded-2xl overflow-hidden border border-border group">
        <img src={url} alt="cover" className="w-full aspect-[16/9] object-cover" />
        <Button size="sm" variant="destructive" className="absolute top-3 right-3 rounded-full opacity-0 group-hover:opacity-100 transition" onClick={onClear}>
          <X className="w-4 h-4 mr-1" /> ลบภาพปก
        </Button>
      </div>
    );
  }
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault(); setDrag(false);
        const f = e.dataTransfer.files?.[0]; if (f) onPick(f);
      }}
      onClick={() => ref.current?.click()}
      className={`rounded-2xl border-2 border-dashed cursor-pointer transition aspect-[16/9] min-h-[200px] flex flex-col items-center justify-center gap-3 glass-panel ${
        drag ? "border-primary bg-primary/10 shadow-lg shadow-primary/10" : "border-border/80 hover:border-primary/40 hover:bg-muted/20"
      }`}
    >
      {loading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <ImagePlus className="w-8 h-8 text-muted-foreground" />}
      <p className="text-sm font-medium text-foreground">ลากภาพมาวาง หรือคลิกเพื่อเลือก</p>
      <p className="text-xs text-muted-foreground">JPG / PNG / WebP — สูงสุด 5MB</p>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
    </div>
  );
};

const GalleryDrop = ({ loading, onPick }: { loading: boolean; onPick: (f: FileList) => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) onPick(e.dataTransfer.files); }}
      onClick={() => ref.current?.click()}
      className={`rounded-2xl border-2 border-dashed cursor-pointer p-12 min-h-[180px] flex flex-col items-center justify-center gap-3 transition glass-panel ${
        drag ? "border-primary bg-primary/10 shadow-lg shadow-primary/10" : "border-border/80 hover:border-primary/40 hover:bg-muted/20"
      }`}
    >
      {loading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Upload className="w-8 h-8 text-muted-foreground" />}
      <p className="text-sm font-medium text-foreground">ลากภาพหลายไฟล์มาวาง หรือคลิกเพื่อเลือก</p>
      <p className="text-xs text-muted-foreground">เพิ่มได้สูงสุด 20 ภาพ — เรียงลำดับได้ภายหลัง</p>
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && onPick(e.target.files)} />
    </div>
  );
};

export default ProjectEditorPage;
