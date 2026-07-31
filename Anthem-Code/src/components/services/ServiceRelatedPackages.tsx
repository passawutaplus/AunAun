import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, BadgeCheck } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import {
  formatServicePriceRange,
  useCreatorServices,
  useSimilarCreatorServices,
  type CreatorService,
} from "@/hooks/useCreatorServices";
import { profilesPublicFrom, PUBLIC_PROFILE_READ_SELECT } from "@/lib/profileAccess";
import { cn } from "@/lib/utils";

type PackageOwner = {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_verified?: boolean | null;
};

function PackageRowCard({
  service,
  owner,
  onSelect,
}: {
  service: CreatorService;
  owner?: PackageOwner | null;
  onSelect?: (service: CreatorService) => void;
}) {
  const cover = service.cover_url?.trim() || service.gallery_urls[0] || "";
  const name =
    owner?.display_name?.trim() || owner?.username?.trim() || null;
  const className = cn(
    "group flex min-w-0 flex-col text-left",
    "transition-opacity hover:opacity-95",
  );

  const body = (
    <>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted shadow-sm ring-1 ring-border/50">
        {cover ? (
          <img
            src={cover}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <Briefcase className="h-5 w-5 opacity-40" />
          </div>
        )}
      </div>
      <div className="min-w-0 space-y-1.5 pt-2.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {service.title}
        </h3>
        {name ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <UserAvatar
              src={owner?.avatar_url}
              name={owner?.display_name}
              username={owner?.username}
              className="h-5 w-5 shrink-0"
              fallbackClassName="text-[9px]"
            />
            <span className="truncate text-xs text-muted-foreground">{name}</span>
            {owner?.is_verified ? (
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="ยืนยันแล้ว" />
            ) : null}
          </div>
        ) : null}
        <p className="text-sm font-semibold tabular-nums text-foreground">
          {formatServicePriceRange(service.price_min_thb, service.price_thb)}
        </p>
      </div>
    </>
  );

  if (onSelect) {
    return (
      <button type="button" className={className} onClick={() => onSelect(service)}>
        {body}
      </button>
    );
  }

  return (
    <Link to={`/service/${service.id}`} className={className}>
      {body}
    </Link>
  );
}

function PackageRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

type Props = {
  service: Pick<CreatorService, "id" | "owner_id" | "category" | "tags"> | null | undefined;
  creatorName?: string | null;
  creatorUsername?: string | null;
  creatorAvatarUrl?: string | null;
  profilePackagesHref?: string | null;
  /** Compact spacing for dialogs */
  compact?: boolean;
  /** Always show creator packages block (empty placeholders when none). */
  alwaysShowCreatorSection?: boolean;
  /** When set, cards call this instead of navigating (modal flows). */
  onSelectService?: (service: CreatorService) => void;
  className?: string;
};

/** Other packages by the same creator + similar packages from other creators. */
export default function ServiceRelatedPackages({
  service,
  creatorName,
  creatorUsername,
  creatorAvatarUrl,
  profilePackagesHref,
  compact,
  alwaysShowCreatorSection,
  onSelectService,
  className,
}: Props) {
  const { data: ownerServices = [] } = useCreatorServices(service?.owner_id, {
    includeDrafts: false,
  });
  const {
    data: similarPackages = [],
    isLoading: similarLoading,
    isFetched: similarFetched,
  } = useSimilarCreatorServices(service, 4);

  const otherPackages = useMemo(
    () => ownerServices.filter((s) => s.id !== service?.id && s.status === "Published"),
    [ownerServices, service?.id],
  );

  const similarOwnerIds = useMemo(
    () => Array.from(new Set(similarPackages.map((s) => s.owner_id))),
    [similarPackages],
  );

  const { data: similarOwners = {} } = useQuery({
    queryKey: ["similar-package-owners", similarOwnerIds.join(",")],
    enabled: similarOwnerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await profilesPublicFrom()
        .select(PUBLIC_PROFILE_READ_SELECT)
        .in("user_id", similarOwnerIds);
      if (error) throw error;
      const map: Record<string, PackageOwner> = {};
      for (const row of data ?? []) {
        map[row.user_id] = {
          display_name: row.display_name,
          username: row.username,
          avatar_url: row.avatar_url,
          is_verified: row.is_verified,
        };
      }
      return map;
    },
  });

  if (!service) return null;

  const showSimilarBlock = similarLoading || similarFetched || similarPackages.length > 0;
  const showCreatorBlock = Boolean(alwaysShowCreatorSection || otherPackages.length > 0);
  if (!showCreatorBlock && !showSimilarBlock) return null;

  const name =
    creatorUsername?.trim()
      ? `@${creatorUsername.trim().replace(/^@/, "")}`
      : creatorName?.trim() || "ครีเอเตอร์";
  const sameOwner: PackageOwner = {
    display_name: creatorName ?? null,
    username: creatorUsername ?? null,
    avatar_url: creatorAvatarUrl ?? null,
  };

  const placeholderCount = alwaysShowCreatorSection
    ? Math.max(0, 4 - otherPackages.length)
    : 0;

  return (
    <div className={cn(compact ? "space-y-6" : "space-y-8", className)}>
      {showCreatorBlock ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground sm:text-base">
              แพ็กเกจของ {name}
            </h2>
            {profilePackagesHref && !onSelectService && otherPackages.length > 0 ? (
              <Link
                to={profilePackagesHref}
                className="shrink-0 text-xs text-primary underline-offset-2 hover:underline"
              >
                ดูทั้งหมด
              </Link>
            ) : null}
          </div>
          <PackageRow>
            {otherPackages.map((svc) => (
              <PackageRowCard
                key={svc.id}
                service={svc}
                owner={sameOwner}
                onSelect={onSelectService}
              />
            ))}
            {Array.from({ length: placeholderCount }).map((_, i) => (
              <div key={`creator-empty-${i}`} className="min-w-0">
                <div className="aspect-[4/3] rounded-xl border border-dashed border-border/70 bg-muted/20" />
                <div className="space-y-2 pt-2.5">
                  <div className="h-3.5 w-4/5 rounded bg-muted/50" />
                  <div className="h-3 w-1/2 rounded bg-muted/40" />
                  <div className="h-3.5 w-1/3 rounded bg-muted/40" />
                </div>
              </div>
            ))}
          </PackageRow>
          {alwaysShowCreatorSection && otherPackages.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              ยังไม่มีแพ็กเกจอื่นของครีเอเตอร์นี้ — แสดงช่องว่างเพื่อให้เห็นเลย์เอาต์เต็ม
            </p>
          ) : null}
        </section>
      ) : null}

      {showCreatorBlock && showSimilarBlock ? (
        <div className="border-t border-border/70" aria-hidden />
      ) : null}

      {showSimilarBlock ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground sm:text-base">
            แพ็กเกจจากครีเอเตอร์อื่น
          </h2>
          {similarLoading ? (
            <PackageRow>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`similar-skel-${i}`} className="min-w-0">
                  <div className="aspect-[4/3] animate-pulse rounded-xl bg-muted" />
                  <div className="space-y-2 pt-2.5">
                    <div className="h-3.5 w-4/5 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                    <div className="h-3.5 w-1/3 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </PackageRow>
          ) : similarPackages.length > 0 ? (
            <PackageRow>
              {similarPackages.map((svc) => (
                <PackageRowCard
                  key={svc.id}
                  service={svc}
                  owner={similarOwners[svc.owner_id]}
                  onSelect={onSelectService}
                />
              ))}
            </PackageRow>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">ยังไม่มีแพ็กเกจจากครีเอเตอร์อื่นที่ใกล้เคียง</p>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
