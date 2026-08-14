import { Link, useNavigate } from "react-router-dom";
import { exploreProjectsUrl } from "@/lib/exploreRoutes";
import { Layers3, Eye, MessageCircle, Sparkles, Calendar, Handshake, AlignLeft, Palette, Hash, Share2 } from "lucide-react";
import BriefcaseIcon from "@/components/icons/BriefcaseIcon";
import { PlusOneControl } from "@/components/brand/PlusOneControl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ToolsGrid from "@/components/ToolsGrid";
import FollowButton from "@/components/FollowButton";
import SaveToCollectionPopover from "@/components/collections/SaveToCollectionPopover";
import SupportButton from "@/components/gifting/SupportButton";
import SharePopover from "@/components/SharePopover";
import { ProjectOwnerMenu } from "@/components/project/ProjectOwnerMenu";
import { ProjectViewerMenu } from "@/components/project/ProjectViewerMenu";
import { formatThaiDate, formatCompact } from "@/lib/format";
import type { ProjectAsset } from "@/lib/projectAssets";
import ProjectAssetsSection from "@/components/project/ProjectAssetsSection";
import LicenseDetailBlock from "@/components/license/LicenseDetailBlock";
import AiDisclosureBadge from "@/components/license/AiDisclosureBadge";
import { ProjectSeriesBlock } from "@/components/series/ProjectSeriesBlock";
import { PriceCurrencyAmount } from "@/components/payments/PriceCurrencySelect";
import { formatCategoryBreadcrumb, stripCategorySubTags } from "@/data/categoryTaxonomy";

interface Props {
  projectId?: string;
  title: string;
  category: string;
  ownerName: string;
  ownerAvatar?: string;
  ownerId?: string;
  publishedDate?: string;
  description?: string;
  tools: string[];
  tags?: string[];
  /** Formatted fallback label (legacy). Prefer priceThb. */
  price?: string;
  /** Starting budget in THB — enables FX display dropdown. */
  priceThb?: number | null;
  views: number;
  likes: number;
  commentsCount: number;
  liked: boolean;
  onLike: () => void;
  onHire: () => void;
  onCollab: () => void;
  allowHire?: boolean;
  allowCollab?: boolean;
  isOwner?: boolean;
  /** Local Vite only — allow hire CTA on own work for allowlisted usernames. */
  localSelfHirePreview?: boolean;
  projectAssets?: ProjectAsset[];
  licenseType?: string | null;
  licenseNote?: string | null;
  copyrightHolder?: string | null;
  hasThirdPartyAssets?: boolean;
  thirdPartyNote?: string | null;
  aiAssisted?: boolean;
  aiDisclosureNote?: string | null;
  shareUrl?: string;
  shareTitle?: string;
  shareImageUrl?: string;
  onHidden?: () => void;
  onBlocked?: () => void;
}

const ProjectSidePanel = (p: Props) => {
  const navigate = useNavigate();
  const showHire = p.allowHire ?? true;
  const showCollab = p.allowCollab ?? true;
  const ownerView = !!p.isOwner;
  const hireLocked = ownerView && !p.localSelfHirePreview;

  return (
    <aside className="space-y-4">
      <div className="rounded-2xl glass-panel p-5 space-y-4 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-2">
          <Badge className="bg-primary/15 text-primary border-0 hover:bg-primary/15">
            <Sparkles className="w-3 h-3 mr-1" /> {formatCategoryBreadcrumb(p.category, p.tags)}
          </Badge>
          <div className="flex items-center shrink-0 -mr-1">
            {p.shareUrl ? (
              <SharePopover
                url={p.shareUrl}
                title={p.shareTitle || p.title}
                label="แชร์"
                imageUrl={p.shareImageUrl}
              >
                <button
                  type="button"
                  aria-label="แชร์ผลงาน"
                  className="inline-flex items-center justify-center rounded-md p-2 min-h-11 min-w-11 text-muted-foreground/50 hover:bg-muted/30 hover:text-foreground transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </SharePopover>
            ) : null}
            {p.isOwner && p.projectId ? (
              <ProjectOwnerMenu projectId={p.projectId} projectTitle={p.title} />
            ) : !p.isOwner && p.projectId && p.ownerId ? (
              <ProjectViewerMenu
                projectId={p.projectId}
                ownerId={p.ownerId}
                ownerName={p.ownerName}
                onHidden={p.onHidden}
                onBlocked={p.onBlocked}
              />
            ) : null}
          </div>
        </div>
        <h1 className="text-2xl font-medium text-foreground leading-tight">{p.title}</h1>
        {p.aiAssisted ? (
          <div className="pt-1">
            <AiDisclosureBadge
              assisted={p.aiAssisted}
              note={p.aiDisclosureNote}
              tone="inline"
              size="md"
            />
          </div>
        ) : null}

        <div className="flex items-center gap-3 pt-2 border-t border-border/50">
          {p.ownerId ? (
            <Link to={`/u/${p.ownerId}`} className="flex items-center gap-3 group flex-1 min-w-0">
              {p.ownerAvatar ? (
                <img src={p.ownerAvatar} alt="" className="w-11 h-11 rounded-full object-cover" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                  {p.ownerName[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">{p.ownerName}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {formatThaiDate(p.publishedDate)}
                </p>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                {p.ownerName[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{p.ownerName}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {formatThaiDate(p.publishedDate)}
                </p>
              </div>
            </div>
          )}
          <FollowButton freelancerId={p.ownerId} size="sm" variant="compact" />
        </div>

        {showHire && (
          <Button
            onClick={p.onHire}
            disabled={hireLocked}
            size="lg"
            title={
              hireLocked
                ? "ปุ่มนี้สำหรับผู้ชม — ไม่สามารถกดในผลงานของตัวเองได้"
                : ownerView && p.localSelfHirePreview
                  ? "Local preview — ทดลองฟอร์มจ้างได้ (ไม่เปิดแชท)"
                  : undefined
            }
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full shadow-sm"
          >
            <BriefcaseIcon className="w-4 h-4 mr-1.5" />
            สนใจจ้างงาน
          </Button>
        )}

        {showCollab && (
          <Button
            onClick={p.onCollab}
            disabled={ownerView}
            size="lg"
            variant="outline"
            title={ownerView ? "ปุ่มนี้สำหรับผู้ชม — ไม่สามารถกดในผลงานของตัวเองได้" : undefined}
            className="w-full rounded-full border-primary/30 text-foreground hover:bg-primary/5 hover:text-primary hover:border-primary/50"
          >
            <Handshake className="w-4 h-4 mr-1.5 text-primary" />
            สนใจคอลแลป
          </Button>
        )}

        {p.ownerId && !p.isOwner && (
          <SupportButton
            recipientId={p.ownerId}
            recipientName={p.ownerName}
            recipientAvatar={p.ownerAvatar}
            projectId={p.projectId ?? null}
          />
        )}



        {(typeof p.priceThb === "number" && p.priceThb > 0) || p.price ? (
          <p className="text-center text-sm flex flex-wrap items-center justify-center gap-1">
            <span className="text-muted-foreground">งบประมาณงานนี้ : </span>
            {typeof p.priceThb === "number" && p.priceThb > 0 ? (
              <PriceCurrencyAmount amountThb={p.priceThb} />
            ) : (
              <span className="text-primary font-semibold">{p.price}</span>
            )}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <PlusOneControl
            active={p.liked}
            count={p.likes}
            showCount={false}
            size="md"
            ariaLabel={p.liked ? "เลิกถูกใจ" : "ถูกใจ"}
            onClick={p.onLike}
            className="inline-flex items-center justify-center rounded-full border border-input bg-background h-9 px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground w-full"
          />
          <SaveToCollectionPopover projectId={p.projectId}>
            <Button variant="outline" className="rounded-full w-full" size="sm">
              <Layers3 className="w-4 h-4 mr-1" />
              Keep Collection
            </Button>
          </SaveToCollectionPopover>
        </div>

        <div className="flex items-center justify-around text-xs text-muted-foreground pt-3 border-t border-border/50">
          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {formatCompact(p.views)} วิว</span>
          <PlusOneControl active={false} count={p.likes} showCount ariaLabel="ถูกใจ" />
          <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {formatCompact(p.commentsCount)}</span>
        </div>

        <LicenseDetailBlock
          embedded
          licenseType={p.licenseType}
          licenseNote={p.licenseNote}
          copyrightHolder={p.copyrightHolder}
          ownerName={p.ownerName}
          hasThirdPartyAssets={p.hasThirdPartyAssets}
          thirdPartyNote={p.thirdPartyNote}
          aiAssisted={p.aiAssisted}
          aiDisclosureNote={p.aiDisclosureNote}
          allowHire={p.allowHire}
          onHire={p.onHire}
        />
      </div>

      {p.description && (
        <div className="rounded-2xl glass-panel p-5 space-y-2">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <AlignLeft className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
            รายละเอียดแบบย่อ
          </h3>
          <p className="text-base text-foreground leading-6 whitespace-pre-wrap">{p.description}</p>
        </div>
      )}

      {p.projectId && (
        <ProjectAssetsSection
          projectId={p.projectId}
          assets={p.projectAssets ?? []}
          isOwner={p.isOwner}
        />
      )}

      {p.tools.length > 0 && (
        <div className="rounded-2xl glass-panel p-5 space-y-3">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
            เครื่องมือ &amp; เทคโนโลยี
          </h3>
          <ToolsGrid tools={p.tools} compact />
        </div>
      )}

      {(() => {
        const visibleTags = stripCategorySubTags(p.tags);
        if (!visibleTags.length) return null;
        return (
          <div className="rounded-2xl glass-panel p-5 space-y-3">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
              แท็ก
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {visibleTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => navigate(exploreProjectsUrl("tag", t))}
                  className="inline-flex"
                >
                  <Badge
                    variant="secondary"
                    className="rounded-full font-normal hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                  >
                    #{t}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      <ProjectSeriesBlock projectId={p.projectId} compact />
    </aside>
  );
};

export default ProjectSidePanel;
