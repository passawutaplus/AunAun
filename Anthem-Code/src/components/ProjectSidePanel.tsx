import { Link, useNavigate } from "react-router-dom";
import { exploreProjectsUrl } from "@/lib/exploreRoutes";
import {
  Eye,
  Sparkles,
  Calendar,
  Hash,
  Users,
  Wrench,
  Copyright,
} from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { useProfilesByIds } from "@/core/profiles";
import { Badge } from "@/components/ui/badge";
import ToolsGrid from "@/components/ToolsGrid";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import { ProjectOwnerMenu } from "@/components/project/ProjectOwnerMenu";
import { ProjectViewerMenu } from "@/components/project/ProjectViewerMenu";
import { formatThaiDate, formatCompact } from "@/lib/format";
import type { ProjectAsset } from "@/lib/projectAssets";
import ProjectAssetsSection from "@/components/project/ProjectAssetsSection";
import LicenseDetailBlock from "@/components/license/LicenseDetailBlock";
import { ProjectSeriesBlock } from "@/components/series/ProjectSeriesBlock";
import { PriceCurrencyAmount } from "@/components/payments/PriceCurrencySelect";
import {
  formatCategoryBreadcrumb,
  findSubAcrossParents,
  getCategoryParent,
  parentIdForProjectCategory,
  parseCategorySubId,
  stripCategorySubTags,
} from "@/data/categoryTaxonomy";
import { cn } from "@/lib/utils";
import { isCommerceEnabled } from "@/lib/aplus1Launch";

interface Props {
  projectId?: string;
  title: string;
  category: string;
  ownerName: string;
  ownerAvatar?: string;
  ownerId?: string;
  ownerVerified?: boolean;
  publishedDate?: string;
  description?: string;
  tools: string[];
  tags?: string[];
  /** Formatted fallback label (legacy). Prefer priceThb. */
  price?: string;
  /** Starting budget in THB — enables FX display dropdown. */
  priceThb?: number | null;
  views: number;
  commentsCount: number;
  /** Kept for callers; like / save / share / message / follow now live in ProjectActionRail. */
  likes?: number;
  liked?: boolean;
  onLike?: () => void;
  onHire?: () => void;
  onCollab?: () => void;
  onChat?: () => void;
  allowHire?: boolean;
  allowCollab?: boolean;
  isOwner?: boolean;
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
  /** People the owner credited as co-creators (editor: ผู้ร่วมงาน). */
  collaboratorIds?: string[];
  /** Two columns on large screens (details under the work on /showcase/:id). */
  wide?: boolean;
}

/** Work details: title, creator, description, stats, then icon-labelled tools / tags, rights, assets and series. */
const ProjectSidePanel = (p: Props) => {
  const navigate = useNavigate();
  const ownerView = !!p.isOwner;
  const collaboratorIds = (p.collaboratorIds ?? []).filter(
    (id) => id && id !== p.ownerId,
  );
  const { data: collaboratorData } = useProfilesByIds(collaboratorIds);
  const collaborators = collaboratorData?.list ?? [];
  const visibleTags = stripCategorySubTags(p.tags);

  const category = (() => {
    // Parent and sub each open the project feed filtered to that category.
    const found = findSubAcrossParents(parseCategorySubId(p.tags));
    const parent =
      found?.parent ??
      getCategoryParent(parentIdForProjectCategory(p.category));
    const crumb =
      "rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary";
    return (
      <Badge className="bg-primary/15 text-primary border-0 hover:bg-primary/15">
        <Sparkles className="w-3 h-3 mr-1" aria-hidden />
        {parent ? (
          <>
            <Link
              to={`/?cat=${parent.id}`}
              className={crumb}
              title={`ดูผลงานหมวด ${parent.label}`}
            >
              {parent.label}
            </Link>
            {found ? (
              <>
                <span className="mx-1 opacity-70" aria-hidden>
                  &gt;
                </span>
                <Link
                  to={`/?cat=${parent.id}&sub=${found.sub.id}`}
                  className={crumb}
                  title={`ดูผลงานหมวด ${found.sub.label}`}
                >
                  {found.sub.label}
                </Link>
              </>
            ) : null}
          </>
        ) : (
          formatCategoryBreadcrumb(p.category, p.tags)
        )}
      </Badge>
    );
  })();

  const owner = (
    <span className="flex items-center gap-2 min-w-0">
      {p.ownerAvatar ? (
        <img
          loading="lazy"
          decoding="async"
          src={p.ownerAvatar}
          alt=""
          className="w-8 h-8 rounded-full object-cover shrink-0"
        />
      ) : (
        <span className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-medium text-primary shrink-0">
          {p.ownerName[0]}
        </span>
      )}
      <span className="truncate font-medium text-foreground group-hover:text-primary transition-colors">
        {p.ownerName}
      </span>
      <VerifiedBadge verified={p.ownerVerified} size="sm" />
    </span>
  );

  return (
    <section
      aria-label="รายละเอียดผลงาน"
      className={cn(
        "space-y-6",
        p.wide &&
          "lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-12 lg:space-y-0",
      )}
    >
      <div className="space-y-4 min-w-0">
        <div className="flex items-start justify-between gap-2">
          {category}
          {ownerView && p.projectId ? (
            <ProjectOwnerMenu variant="buttons" projectId={p.projectId} projectTitle={p.title} />
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

        <div className="space-y-2">
          <h1 className="text-2xl lg:text-3xl font-medium text-foreground leading-tight">
            {p.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {p.ownerId ? (
              <Link to={`/u/${p.ownerId}`} className="group min-w-0">
                {owner}
              </Link>
            ) : (
              owner
            )}
            <span className="flex items-center gap-1 text-xs">
              <Calendar className="w-3 h-3" aria-hidden />{" "}
              {formatThaiDate(p.publishedDate)}
            </span>
            <span className="flex items-center gap-1 text-xs">
              <Eye className="w-3 h-3" aria-hidden /> {formatCompact(p.views)} วิว
            </span>
          </div>
        </div>

        {collaborators.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden /> ทำร่วมกับ
            </span>
            {collaborators.map((c) => (
              <Link
                key={c.id}
                to={`/u/${c.id}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 py-0.5 pl-0.5 pr-2 text-foreground hover:bg-muted"
              >
                <UserAvatar
                  src={c.avatar_url}
                  name={c.display_name}
                  username={c.username}
                  className="h-5 w-5"
                  fallbackClassName="text-[8px]"
                />
                <span className="max-w-[8rem] truncate">
                  {c.display_name || c.username}
                </span>
              </Link>
            ))}
          </div>
        ) : null}

        {p.description ? (
          <p className="text-base text-muted-foreground leading-7 whitespace-pre-wrap max-w-[62ch]">
            {p.description}
          </p>
        ) : null}


        {/* Prices return with the commerce phase. */}
        {isCommerceEnabled() &&
        ((typeof p.priceThb === "number" && p.priceThb > 0) || p.price) ? (
          <p className="text-sm flex flex-wrap items-center gap-1">
            <span className="text-muted-foreground">ราคาเริ่มต้นงานนี้ : </span>
            {typeof p.priceThb === "number" && p.priceThb > 0 ? (
              <PriceCurrencyAmount amountThb={p.priceThb} />
            ) : (
              <span className="text-primary font-semibold">{p.price}</span>
            )}
          </p>
        ) : null}
      </div>

      <div className="space-y-4 min-w-0">
        <dl className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3 gap-y-3 text-sm">
            {p.tools.length > 0 ? (
              <>
                <dt className="pt-1.5 text-muted-foreground" title="เครื่องมือ">
                  <Wrench className="h-4 w-4" aria-hidden />
                  <span className="sr-only">เครื่องมือ</span>
                </dt>
                <dd className="m-0 min-w-0">
                  <ToolsGrid tools={p.tools} compact />
                </dd>
              </>
            ) : null}
            {visibleTags.length > 0 ? (
              <>
                <dt className="pt-1 text-muted-foreground" title="แท็ก">
                  <Hash className="h-4 w-4" aria-hidden />
                  <span className="sr-only">แท็ก</span>
                </dt>
                <dd className="m-0 flex flex-wrap gap-1.5">
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
                </dd>
              </>
            ) : null}
            <dt className="pt-1.5 text-muted-foreground" title="สิทธิ์การใช้งาน">
              <Copyright className="h-4 w-4" aria-hidden />
              <span className="sr-only">สิทธิ์การใช้งาน</span>
            </dt>
            <dd className="m-0 min-w-0">
              <LicenseDetailBlock
                bare
                licenseType={p.licenseType}
                licenseNote={p.licenseNote}
                copyrightHolder={p.copyrightHolder}
                ownerName={p.ownerName}
                hasThirdPartyAssets={p.hasThirdPartyAssets}
                thirdPartyNote={p.thirdPartyNote}
                aiAssisted={p.aiAssisted}
                aiDisclosureNote={p.aiDisclosureNote}
                allowHire={p.allowHire}
              />
            </dd>
          </dl>

        {p.projectId && (
          <ProjectAssetsSection
            projectId={p.projectId}
            assets={p.projectAssets ?? []}
            isOwner={p.isOwner}
          />
        )}

        <ProjectSeriesBlock projectId={p.projectId} compact />
      </div>
    </section>
  );
};

export default ProjectSidePanel;
