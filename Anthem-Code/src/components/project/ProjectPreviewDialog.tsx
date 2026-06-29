import { useEffect, useState } from "react";
import { Eye, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ProjectSidePanel from "@/components/ProjectSidePanel";
import LicenseDetailBlock from "@/components/license/LicenseDetailBlock";
import ToolsGrid from "@/components/ToolsGrid";
import SafeDemoImage from "@/components/SafeDemoImage";
import { ProjectPreviewModeTabs, type ProjectPreviewMode } from "@/components/project/ProjectPreviewModeTabs";
import { ProjectFeedPreview } from "@/components/project/ProjectFeedPreview";
import { ProjectMobilePreviewContent } from "@/components/project/ProjectMobilePreviewContent";
import { supabase } from "@/integrations/supabase/client";
import type { LicenseType } from "@/lib/licenses";
import { isVideoUrl } from "@/lib/portfolioMedia";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface ProjectPreviewData {
  title: string;
  subtitle?: string;
  description?: string;
  category: string;
  cover: string;
  gallery: string[];
  tools: string[];
  tags: string[];
  price?: string;
  allowHire: boolean;
  allowCollab: boolean;
  licenseType: LicenseType;
  licenseNote: string;
  copyrightHolder: string;
  hasThirdPartyAssets: boolean;
  thirdPartyNote: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ProjectPreviewData;
  ownerId?: string;
  defaultMode?: ProjectPreviewMode;
}

const previewToast = () => toast.message("นี่คือพรีวิว — บันทึกผลงานก่อนจึงจะโต้ตอบได้จริง");

function ProjectPcPreview({
  data,
  ownerName,
  ownerAvatar,
  ownerId,
  displayTitle,
  images,
}: {
  data: ProjectPreviewData;
  ownerName: string;
  ownerAvatar?: string;
  ownerId?: string;
  displayTitle: string;
  images: string[];
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8">
      <div className="grid lg:grid-cols-[1fr_360px] gap-6 lg:gap-10">
        <div className="space-y-4 min-w-0">
          {data.subtitle?.trim() && (
            <p className="text-sm text-muted-foreground">{data.subtitle.trim()}</p>
          )}
          {images.length > 0 ? (
            images.map((src, i) =>
              isVideoUrl(src) ? (
                <video
                  key={src + i}
                  src={src}
                  controls
                  playsInline
                  className="w-full rounded-2xl border border-border/60 bg-black max-h-[480px]"
                />
              ) : (
                <SafeDemoImage
                  key={src + i}
                  src={src}
                  index={i}
                  alt={`${displayTitle} ${i + 1}`}
                  className="w-full rounded-2xl border border-border/60 bg-card object-contain"
                  loading="lazy"
                />
              ),
            )
          ) : (
            <div className="aspect-video rounded-2xl bg-muted flex items-center justify-center text-sm text-muted-foreground">
              ยังไม่มีรูปภาพ — อัปโหลดภาพปกหรือแกลเลอรีเพื่อดูพรีวิว
            </div>
          )}

          {data.tools.length > 0 && (
            <div className="rounded-2xl glass-panel p-5 space-y-3 lg:hidden">
              <h3 className="text-sm font-medium text-foreground">เครื่องมือ &amp; เทคโนโลยี</h3>
              <ToolsGrid tools={data.tools} compact linkable={false} />
            </div>
          )}

          {data.tags.length > 0 && (
            <div className="rounded-2xl glass-panel p-5 space-y-3 lg:hidden">
              <h3 className="text-sm font-medium text-foreground">แท็ก</h3>
              <div className="flex flex-wrap gap-1.5">
                {data.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="rounded-full font-normal">
                    #{t}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start space-y-4">
          <ProjectSidePanel
            title={displayTitle}
            category={data.category}
            ownerName={ownerName}
            ownerAvatar={ownerAvatar}
            ownerId={ownerId}
            publishedDate={new Date().toISOString()}
            description={data.description}
            tools={data.tools}
            tags={data.tags}
            price={data.price}
            views={0}
            likes={0}
            commentsCount={0}
            liked={false}
            onLike={previewToast}
            onHire={previewToast}
            onCollab={previewToast}
            allowHire={data.allowHire}
            allowCollab={data.allowCollab}
          />
          <LicenseDetailBlock
            licenseType={data.licenseType}
            licenseNote={data.licenseNote}
            copyrightHolder={data.copyrightHolder}
            ownerName={ownerName}
            hasThirdPartyAssets={data.hasThirdPartyAssets}
            thirdPartyNote={data.thirdPartyNote}
            allowHire={data.allowHire}
            onHire={previewToast}
          />
        </div>
      </div>
    </div>
  );
}

const ProjectPreviewDialog = ({
  open,
  onOpenChange,
  data,
  ownerId,
  defaultMode = "pc",
}: Props) => {
  const [ownerName, setOwnerName] = useState("คุณ");
  const [ownerAvatar, setOwnerAvatar] = useState<string | undefined>();
  const [mode, setMode] = useState<ProjectPreviewMode>(defaultMode);

  useEffect(() => {
    if (open) setMode(defaultMode);
  }, [open, defaultMode]);

  useEffect(() => {
    if (!open || !ownerId) return;
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", ownerId)
      .maybeSingle()
      .then(({ data: p }) => {
        if (p?.display_name) setOwnerName(p.display_name);
        if (p?.avatar_url) setOwnerAvatar(p.avatar_url);
      });
  }, [open, ownerId]);

  const images =
    data.gallery.length > 0 ? data.gallery : data.cover ? [data.cover] : [];
  const displayTitle = data.title.trim() || "ชื่อผลงาน (ยังไม่ได้กรอก)";
  const coverImage = data.cover || images.find((u) => !isVideoUrl(u)) || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[calc(100vw-1.5rem)] h-[min(92vh,900px)] p-0 gap-0 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Eye className="w-4 h-4 text-primary shrink-0" />
            <DialogTitle className="text-sm font-semibold truncate">พรีวิวผลงาน</DialogTitle>
            <Badge variant="outline" className="text-[10px] shrink-0">
              ตัวอย่าง
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="ปิดพรีวิว">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="px-4 pt-3 pb-2 border-b border-border/50 shrink-0">
          <ProjectPreviewModeTabs value={mode} onChange={setMode} />
        </div>

        <div
          className={cn(
            "flex-1 min-h-0 bg-app-ambient",
            mode === "mobile" ? "overflow-hidden flex flex-col" : "overflow-y-auto",
          )}
        >
          {mode === "feed" ? (
            <div className="p-4 max-w-lg mx-auto h-full min-h-[480px]">
              <ProjectFeedPreview
                title={displayTitle}
                cover={coverImage}
                ownerName={ownerName}
                ownerAvatar={ownerAvatar}
                fit
              />
            </div>
          ) : mode === "mobile" ? (
            <div className="flex-1 min-h-0 flex justify-center p-3 sm:p-4">
              <div
                className={cn(
                  "w-full max-w-[390px] h-full min-h-[520px] max-h-full",
                  "flex flex-col overflow-hidden",
                  "rounded-[1.75rem] border-[6px] border-foreground/10 shadow-xl bg-background",
                )}
              >
                <ProjectMobilePreviewContent
                  data={data}
                  ownerName={ownerName}
                  ownerAvatar={ownerAvatar}
                  ownerId={ownerId}
                  displayTitle={displayTitle}
                  images={images}
                  onPreviewAction={previewToast}
                  className="rounded-[1.35rem] overflow-hidden"
                />
              </div>
            </div>
          ) : (
            <ProjectPcPreview
              data={data}
              ownerName={ownerName}
              ownerAvatar={ownerAvatar}
              ownerId={ownerId}
              displayTitle={displayTitle}
              images={images}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectPreviewDialog;
