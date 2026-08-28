import { useMemo } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import { AnimatedDensityGrid } from "@/components/ui/AnimatedDensityGrid";
import { useProfilesByIds } from "@/core/profiles";
import {
  collectionGridClass,
  type CollectionGridDensity,
} from "@/lib/collectionGridDensity";
import { profilePublicPath } from "@/lib/profileRoutes";
import { cn } from "@/lib/utils";
import type { ProfileLite } from "@/server/queries/profiles";

export type CollectionWorkProject = {
  id: string;
  title?: string | null;
  cover_url?: string | null;
  owner_id?: string | null;
};

type CardProps = {
  project: CollectionWorkProject;
  density: CollectionGridDensity;
  owner?: ProfileLite | null;
  onRemove?: () => void;
};

function OwnerRow({
  project,
  owner,
  compact,
}: {
  project: CollectionWorkProject;
  owner?: ProfileLite | null;
  compact?: boolean;
}) {
  const name = owner?.display_name?.trim() || owner?.username?.trim() || "ผู้สร้าง";
  const href = project.owner_id
    ? profilePublicPath({ user_id: project.owner_id, username: owner?.username })
    : null;

  const inner = (
    <>
      <UserAvatar
        src={owner?.avatar_url}
        name={owner?.display_name}
        username={owner?.username}
        className={compact ? "h-5 w-5" : "h-6 w-6"}
        fallbackClassName="text-[9px]"
      />
      <span className="min-w-0 truncate">{name}</span>
      <VerifiedBadge verified={!!owner?.is_verified} size="sm" />
    </>
  );

  if (!href) {
    return (
      <div
        className={cn(
          "flex min-w-0 items-center gap-2 text-foreground",
          compact ? "text-[11px]" : "text-sm",
        )}
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      to={href}
      className={cn(
        "flex min-w-0 items-center gap-2 text-foreground hover:text-primary",
        compact ? "text-[11px]" : "text-sm",
      )}
      aria-label={`เปิดโปรไฟล์ ${name}`}
    >
      {inner}
    </Link>
  );
}

function CollectionWorkCard({ project, density, owner, onRemove }: CardProps) {
  const title = project.title?.trim() || "ไม่มีชื่อ";
  const list = density === "list";

  if (list) {
    return (
      <div className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 glass-panel">
        <Link to={`/project/${project.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
            {project.cover_url ? (
              <img
                src={project.cover_url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <h3 className="line-clamp-1 text-sm font-medium text-foreground">{title}</h3>
          </div>
        </Link>
        <div className="min-w-0 max-w-[42%] shrink">
          <OwnerRow project={project} owner={owner} compact />
        </div>
        {onRemove ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }}
            aria-label="เอาออก"
            className="rounded-full p-1.5 transition-colors hover:bg-destructive hover:text-destructive-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="group relative">
      <Link to={`/project/${project.id}`} className="block">
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-md bg-muted",
            density === "large" ? "aspect-[16/10]" : "aspect-[4/3]",
          )}
        >
          {project.cover_url ? (
            <img
              src={project.cover_url}
              alt={title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : null}
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"
            aria-hidden
          />
          <h3 className="pointer-events-none absolute inset-x-2 bottom-2 line-clamp-2 text-sm font-medium leading-snug text-white drop-shadow">
            {title}
          </h3>
        </div>
      </Link>
      <div className="mt-2 px-0.5">
        <OwnerRow project={project} owner={owner} />
      </div>
      {onRemove ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          aria-label="เอาออก"
          className="absolute right-2 top-2 rounded-full border border-white/15 bg-background/70 p-1.5 shadow-sm backdrop-blur-md transition-opacity hover:bg-destructive hover:text-destructive-foreground md:opacity-0 md:group-hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

type GridProps = {
  projects: CollectionWorkProject[];
  density: CollectionGridDensity;
  layoutGroupId: string;
  onRemove?: (projectId: string) => void | Promise<void>;
};

/** Collection item cards: full image, title on the photo, owner profile under the card. */
export function CollectionWorkItemsGrid({
  projects,
  density,
  layoutGroupId,
  onRemove,
}: GridProps) {
  const ownerIds = useMemo(
    () => [...new Set(projects.map((p) => p.owner_id).filter((id): id is string => !!id))],
    [projects],
  );
  const { data: ownersData } = useProfilesByIds(ownerIds);
  const ownersMap = ownersData?.map ?? {};

  return (
    <AnimatedDensityGrid
      density={density}
      gridClassName={collectionGridClass(density)}
      layoutGroupId={layoutGroupId}
    >
      {projects.map((project) => (
        <CollectionWorkCard
          key={project.id}
          project={project}
          density={density}
          owner={project.owner_id ? ownersMap[project.owner_id] ?? null : null}
          onRemove={onRemove ? () => void onRemove(project.id) : undefined}
        />
      ))}
    </AnimatedDensityGrid>
  );
}
