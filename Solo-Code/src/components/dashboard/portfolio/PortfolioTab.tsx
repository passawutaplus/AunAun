import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { usePortfolio, portfolioErrorMessage, type PortfolioPatch } from "@/store/portfolio";
import { portfolioCompleteness, type PortfolioPage } from "@/lib/portfolioSchema";
import { PortfolioPublicView } from "@/components/portfolio/PortfolioPublicView";
import { PortfolioShareBar } from "./PortfolioShareBar";
import {
  AboutSectionEditor,
  ExperienceSectionEditor,
  FeaturedSectionEditor,
  HeroSectionEditor,
  LinksSectionEditor,
  ResumeSectionEditor,
  SkillsSectionEditor,
} from "./portfolioEditorSections";
import { PageFooterActions } from "@/components/dashboard/PageFooterActions";

function useDebouncedSave(
  save: ReturnType<typeof usePortfolio>["save"],
  delay = 800,
) {
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  return React.useCallback(
    (patch: Parameters<typeof save>[0]) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void save(patch).catch((e) =>
          toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ"),
        );
      }, delay);
    },
    [save, delay],
  );
}

function PortfolioWizard({ onStart }: { onStart: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">สร้าง Portfolio ของคุณ</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            หน้า pitch ส่วนตัวที่แชร์ลิงก์เดียวให้ลูกค้าดูประสบการณ์ ผลงาน และ CV ได้ทันที
          </p>
        </div>
        <Button onClick={onStart}>เริ่มสร้าง Portfolio</Button>
      </CardContent>
    </Card>
  );
}

function PortfolioEditor({ page }: { page: PortfolioPage }) {
  const { save, setPublished, uploadFile, isSaving, isPublishing } = usePortfolio();
  const debouncedSave = useDebouncedSave(save);
  const [local, setLocal] = React.useState(page);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [uploadingResume, setUploadingResume] = React.useState(false);
  const [uploadingWorkId, setUploadingWorkId] = React.useState<string | null>(null);

  React.useEffect(() => setLocal(page), [page]);

  const patch = (p: PortfolioPatch) => {
    setLocal((prev) => ({
      ...prev,
      slug: p.slug ?? prev.slug,
      status: p.status ?? prev.status,
      hero: p.hero ? { ...prev.hero, ...p.hero } : prev.hero,
      about: p.about ? { ...prev.about, ...p.about } : prev.about,
      skills: p.skills ?? prev.skills,
      experience: p.experience ?? prev.experience,
      featuredWork: p.featuredWork ?? prev.featuredWork,
      externalLinks: p.externalLinks ?? prev.externalLinks,
      resume: p.resume ? { ...prev.resume, ...p.resume } : prev.resume,
      visibility: p.visibility ? { ...prev.visibility, ...p.visibility } : prev.visibility,
      publishedAt:
        p.publishedAt !== undefined ? (p.publishedAt ?? undefined) : prev.publishedAt,
    }));
    debouncedSave(p);
  };

  const completeness = portfolioCompleteness(local);

  const previewData = {
    slug: local.slug,
    hero: local.hero,
    about: local.about,
    skills: local.skills,
    experience: local.experience,
    featuredWork: local.featuredWork,
    externalLinks: local.externalLinks,
    resume: local.resume,
    visibility: local.visibility,
  };

  const sections = (
    <div className="space-y-4">
      <HeroSectionEditor
        value={local.hero}
        visibility={local.visibility}
        onChange={(h) => patch({ hero: h })}
        onVisibilityChange={(v) => patch({ visibility: v })}
        uploading={uploadingAvatar}
        onUploadAvatar={async (file) => {
          setUploadingAvatar(true);
          try {
            const url = await uploadFile("avatar", file);
            patch({ hero: { avatarUrl: url } });
            toast.success("อัปโหลดรูปแล้ว");
          } finally {
            setUploadingAvatar(false);
          }
        }}
      />
      <AboutSectionEditor
        value={local.about}
        visible={local.visibility.about}
        onChange={(a) => patch({ about: a })}
        onVisibleChange={(v) => patch({ visibility: { about: v } })}
      />
      <SkillsSectionEditor
        value={local.skills}
        visible={local.visibility.skills}
        onChange={(s) => patch({ skills: s })}
        onVisibleChange={(v) => patch({ visibility: { skills: v } })}
      />
      <ExperienceSectionEditor
        items={local.experience}
        visible={local.visibility.experience}
        onChange={(e) => patch({ experience: e })}
        onVisibleChange={(v) => patch({ visibility: { experience: v } })}
      />
      <FeaturedSectionEditor
        items={local.featuredWork}
        visible={local.visibility.featured_work}
        onChange={(f) => patch({ featuredWork: f })}
        onVisibleChange={(v) => patch({ visibility: { featured_work: v } })}
        uploadingId={uploadingWorkId}
        onUploadCover={async (id, file) => {
          setUploadingWorkId(id);
          try {
            const url = await uploadFile("work", file);
            const next = local.featuredWork.map((item) =>
              item.id === id ? { ...item, coverUrl: url } : item,
            );
            patch({ featuredWork: next });
            toast.success("อัปโหลดภาพแล้ว");
          } finally {
            setUploadingWorkId(null);
          }
        }}
      />
      <LinksSectionEditor
        items={local.externalLinks}
        visible={local.visibility.external_links}
        onChange={(l) => patch({ externalLinks: l })}
        onVisibleChange={(v) => patch({ visibility: { external_links: v } })}
      />
      <ResumeSectionEditor
        value={local.resume}
        visible={local.visibility.resume}
        onChange={(r) => patch({ resume: r })}
        onVisibleChange={(v) => patch({ visibility: { resume: v } })}
        uploading={uploadingResume}
        onUpload={async (file) => {
          setUploadingResume(true);
          try {
            const url = await uploadFile("resume", file);
            patch({ resume: { fileUrl: url, fileName: file.name, label: local.resume.label } });
            toast.success("อัปโหลด CV แล้ว");
          } finally {
            setUploadingResume(false);
          }
        }}
      />
    </div>
  );

  return (
    <div className="space-y-4 pb-24 lg:pb-4">
      <PortfolioShareBar
        slug={local.slug}
        status={local.status}
        completeness={completeness}
        publishing={isPublishing}
        onSlugChange={(slug) => patch({ slug })}
        onPublishChange={async (published) => {
          try {
            await setPublished(published);
            setLocal((prev) => ({
              ...prev,
              status: published ? "published" : "draft",
              publishedAt: published ? new Date().toISOString() : prev.publishedAt,
            }));
            toast.success(published ? "เผยแพร่ Portfolio แล้ว" : "เปลี่ยนเป็นแบบร่างแล้ว");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
          }
        }}
      />

      {/* Desktop: side-by-side */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
        <div>{sections}</div>
        <div className="sticky top-28">
          <p className="text-xs text-muted-foreground mb-2">ตัวอย่างที่ลูกค้าเห็น</p>
          <PortfolioPublicView data={previewData} showFooter={false} />
        </div>
      </div>

      {/* Mobile: tabs */}
      <div className="lg:hidden">
        <Tabs defaultValue="edit">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="edit">แก้ไข</TabsTrigger>
            <TabsTrigger value="preview">ตัวอย่าง</TabsTrigger>
            <TabsTrigger value="share">แชร์</TabsTrigger>
          </TabsList>
          <TabsContent value="edit" className="mt-4">
            {sections}
          </TabsContent>
          <TabsContent value="preview" className="mt-4">
            <PortfolioPublicView data={previewData} showFooter={false} />
          </TabsContent>
          <TabsContent value="share" className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              เปิดสวิตช์ &quot;เผยแพร่&quot; ด้านบน แล้วคัดลอกลิงก์ด้านล่าง
            </p>
            {local.status === "published" ? (
              <PortfolioPublicView data={previewData} />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Portfolio ยังเป็นแบบร่าง — ลูกค้าจะเปิดลิงก์ไม่ได้จนกว่าจะเผยแพร่
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {isSaving ? (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> กำลังบันทึก...
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">บันทึกอัตโนมัติ</p>
      )}

      <PageFooterActions feature="portfolio" label="Portfolio" />
    </div>
  );
}

export function PortfolioTab() {
  const { page, isLoading, isError, error, ensurePortfolio, isEnsuring } = usePortfolio();
  const [started, setStarted] = React.useState(false);

  const handleStart = async () => {
    try {
      await ensurePortfolio();
      setStarted(true);
    } catch (e) {
      toast.error(portfolioErrorMessage(e));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError && !page) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="py-10 text-center space-y-3">
          <p className="text-sm text-destructive">{portfolioErrorMessage(error)}</p>
          <p className="text-xs text-muted-foreground">
            ถ้าเป็นข้อความเกี่ยวกับ migration ให้รัน{" "}
            <code className="text-[11px]">node scripts/push-portfolio-migration.mjs</code>
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!page && !started) {
    return (
      <div className="animate-fade-in pb-24 lg:pb-4">
        <PortfolioWizard onStart={handleStart} />
        {isEnsuring ? (
          <div className="flex justify-center mt-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : null}
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PortfolioEditor page={page} />
    </div>
  );
}
