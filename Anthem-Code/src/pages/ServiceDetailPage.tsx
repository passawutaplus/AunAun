import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Share2 } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import SharePopover from "@/components/SharePopover";
import { Button } from "@/components/ui/button";
import PageLoader from "@/components/ui/PageLoader";
import HireDialog from "@/components/HireDialog";
import ServiceDetailView from "@/components/services/ServiceDetailView";
import SeoHead from "@/components/SeoHead";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/hooks/useAuth";
import {
  formatServiceDurationDays,
  formatServicePriceRange,
  useCreatorService,
  useCreatorServices,
  useSimilarCreatorServices,
  type CreatorService,
} from "@/hooks/useCreatorServices";
import { useProfile } from "@/hooks/useProfile";
import { recordCreatorServiceView } from "@/hooks/usePackageOverviewSeries";
import { navigateToAuth } from "@/lib/authRedirect";
import { absoluteUrl, truncateDescription } from "@/lib/seo";
import { BRAND_NAME } from "@/lib/brandConfig";
import { isLocalDevSelfHirePreview } from "@/lib/localDevSelfHire";
import { formatCategoryBreadcrumb, stripCategorySubTags } from "@/data/categoryTaxonomy";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

function OtherPackageCard({ service }: { service: CreatorService }) {
  const cover = service.cover_url?.trim() || service.gallery_urls[0] || "";
  const duration = formatServiceDurationDays(service.duration_label);

  return (
    <Link
      to={`/service/${service.id}`}
      className={cn(
        "group flex flex-col sm:flex-row overflow-hidden rounded-2xl border border-border/70 bg-card/60",
        "transition-colors hover:border-primary/40 hover:bg-card",
      )}
    >
      <div className="relative aspect-[4/3] w-full shrink-0 bg-muted sm:aspect-auto sm:min-h-[7.5rem] sm:w-[38%] sm:max-w-[14rem]">
        {cover ? (
          <img
            src={cover}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <Briefcase className="h-7 w-7 opacity-40" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1 p-3 sm:border-l sm:border-border/50 sm:p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary sm:text-base">
          {service.title}
        </h3>
        <p className="text-sm font-semibold tabular-nums text-primary">
          {formatServicePriceRange(service.price_min_thb, service.price_thb)}
        </p>
        {service.summary?.trim() ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{service.summary}</p>
        ) : null}
        {duration ? (
          <p className="text-[11px] text-muted-foreground">ระยะเวลา {duration}</p>
        ) : null}
      </div>
    </Link>
  );
}

type SimilarOwner = {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

function SimilarPackageCard({
  service,
  owner,
}: {
  service: CreatorService;
  owner?: SimilarOwner | null;
}) {
  const cover = service.cover_url?.trim() || service.gallery_urls[0] || "";
  const name = owner?.display_name?.trim() || owner?.username?.trim() || "ครีเอเตอร์";
  const categoryLabel = service.category
    ? formatCategoryBreadcrumb(service.category, service.tags)
    : "";
  const tags = stripCategorySubTags(service.tags).slice(0, 2);

  return (
    <Link
      to={`/service/${service.id}`}
      className={cn(
        "group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/60",
        "transition-colors hover:border-primary/40 hover:bg-card",
      )}
    >
      <div className="relative aspect-[4/3] w-full bg-muted">
        {cover ? (
          <img
            src={cover}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <Briefcase className="h-6 w-6 opacity-40" />
          </div>
        )}
      </div>
      <div className="min-w-0 space-y-1.5 p-3">
        <div className="flex items-center gap-2 min-w-0">
          <UserAvatar
            src={owner?.avatar_url}
            name={owner?.display_name}
            username={owner?.username}
            className="h-5 w-5 shrink-0"
            fallbackClassName="text-[9px]"
          />
          <span className="truncate text-[11px] text-muted-foreground">{name}</span>
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
          {service.title}
        </h3>
        <p className="text-sm font-semibold tabular-nums text-primary">
          {formatServicePriceRange(service.price_min_thb, service.price_thb)}
        </p>
        {categoryLabel ? (
          <p className="truncate text-[11px] text-muted-foreground">{categoryLabel}</p>
        ) : null}
        {tags.length > 0 ? (
          <p className="truncate text-[11px] text-muted-foreground">
            {tags.map((t) => `#${t}`).join(" ")}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

/**
 * Public deep link for a package: /service/:id
 * Detail → other packages from same creator → similar packages from other creators.
 */
export default function ServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: service, isLoading, isError, refetch, isFetching } = useCreatorService(id);
  const { data: ownerProfile } = useProfile(service?.owner_id);
  const { data: ownerServices = [] } = useCreatorServices(service?.owner_id, {
    includeDrafts: false,
  });
  const { data: similarPackages = [] } = useSimilarCreatorServices(service, 4);
  const [hireOpen, setHireOpen] = useState(false);
  const [autoSubmitId, setAutoSubmitId] = useState<string | null>(null);

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
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", similarOwnerIds);
      if (error) throw error;
      const map: Record<string, SimilarOwner> = {};
      for (const row of data ?? []) {
        map[row.user_id] = {
          display_name: row.display_name,
          username: row.username,
          avatar_url: row.avatar_url,
        };
      }
      return map;
    },
  });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [id]);

  useEffect(() => {
    if (!service?.id || !user?.id) return;
    if (service.status !== "Published" && service.owner_id !== user.id) return;
    void recordCreatorServiceView({
      viewerId: user.id,
      serviceId: service.id,
      ownerId: service.owner_id,
    });
  }, [service?.id, service?.owner_id, service?.status, user?.id]);

  if (isLoading || (isFetching && !service)) {
    return <PageLoader label="กำลังโหลดแพ็กเกจ… รอสักครู่" className="bg-app-ambient" />;
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-app-ambient flex items-center justify-center px-4">
        <div className="text-center space-y-3 max-w-sm">
          <p className="font-medium text-foreground">โหลดแพ็กเกจไม่สำเร็จ</p>
          <p className="text-sm text-muted-foreground">ลองใหม่อีกครั้ง หรือกลับหน้าแรก</p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => void refetch()}>
              ลองใหม่
            </Button>
            <Button className="rounded-full" asChild>
              <Link to="/">หน้าแรก</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = !!user?.id && service?.owner_id === user.id;
  const visible = service && (service.status === "Published" || isOwner);

  if (!visible) {
    return (
      <div className="min-h-screen bg-app-ambient flex items-center justify-center px-4">
        <div className="text-center space-y-3 max-w-sm">
          <p className="font-medium text-foreground">ไม่พบแพ็กเกจนี้</p>
          <p className="text-sm text-muted-foreground">อาจถูกลบ หรือยังไม่เผยแพร่</p>
          <Button className="rounded-full" asChild>
            <Link to="/">หน้าแรก</Link>
          </Button>
        </div>
      </div>
    );
  }

  const creatorName =
    ownerProfile?.display_name?.trim() ||
    ownerProfile?.username?.trim() ||
    "ครีเอเตอร์";
  const shareUrl = absoluteUrl(`/service/${service.id}`);
  const desc = truncateDescription(service.summary || `${service.title} — แพ็กเกจบน ${BRAND_NAME}`);
  const profilePackagesHref = `/u/${ownerProfile?.username || service.owner_id}?tab=services`;

  const requestService = () => {
    if (!user) {
      navigateToAuth(navigate);
      return;
    }
    if (
      user.id === service.owner_id &&
      !isLocalDevSelfHirePreview(ownerProfile?.username)
    ) {
      return;
    }
    setAutoSubmitId(service.id);
    setHireOpen(true);
  };

  return (
    <div className="min-h-screen bg-app-ambient pb-28 md:pb-8">
      <SeoHead
        title={service.title}
        description={desc}
        path={`/service/${service.id}`}
        type="website"
        image={service.cover_url || service.gallery_urls[0] || undefined}
      />

      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 md:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <BackButton />
            <h1 className="truncate text-sm font-semibold md:text-base">{service.title}</h1>
            {service.status === "Draft" ? (
              <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                แบบร่าง
              </span>
            ) : null}
          </div>
          <SharePopover url={shareUrl} title={service.title}>
            <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="แชร์">
              <Share2 className="h-4 w-4" />
            </Button>
          </SharePopover>
        </div>
      </header>

      <main className="mx-auto max-w-5xl">
        <div className="overflow-hidden border-x-0 border-b border-border/40 bg-card/40 md:mx-4 md:mt-4 md:rounded-2xl md:border lg:mx-6">
          <ServiceDetailView
            service={service}
            creatorName={creatorName}
            creatorUsername={ownerProfile?.username}
            creatorAvatarUrl={ownerProfile?.avatar_url}
            creatorRole={ownerProfile?.role}
            creatorId={service.owner_id}
            variant="page"
            onRequest={() => requestService()}
          />
        </div>

        {otherPackages.length > 0 ? (
          <section className="space-y-3 px-4 py-8 md:px-5 lg:px-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">แพ็กเกจอื่นของ {creatorName}</h2>
                <p className="text-xs text-muted-foreground">เลือกดูรายละเอียดเพิ่มได้</p>
              </div>
              <Link
                to={profilePackagesHref}
                className="shrink-0 text-xs text-primary underline-offset-2 hover:underline"
              >
                ดูทั้งหมด
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              {otherPackages.map((svc) => (
                <OtherPackageCard key={svc.id} service={svc} />
              ))}
            </div>
          </section>
        ) : (
          <p className="px-4 py-4 text-center text-xs text-muted-foreground md:px-5">
            <Link to={profilePackagesHref} className="underline-offset-2 hover:underline">
              ดูแพ็กเกจทั้งหมดของ {creatorName}
            </Link>
          </p>
        )}

        {similarPackages.length > 0 ? (
          <section className="space-y-3 px-4 pb-10 pt-2 md:px-5 lg:px-6">
            <div>
              <h2 className="text-base font-semibold text-foreground">แพ็กเกจที่คล้ายกัน</h2>
              <p className="text-xs text-muted-foreground">จากครีเอเตอร์คนอื่นในหมวด/แท็กใกล้เคียง</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {similarPackages.map((svc) => (
                <SimilarPackageCard
                  key={svc.id}
                  service={svc}
                  owner={similarOwners[svc.owner_id]}
                />
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <HireDialog
        open={hireOpen}
        onOpenChange={(next) => {
          setHireOpen(next);
          if (!next) setAutoSubmitId(null);
        }}
        freelancerId={service.owner_id}
        freelancerUsername={ownerProfile?.username}
        profileName={creatorName}
        source="service"
        initialPanel="services"
        autoSubmitServiceId={autoSubmitId}
        onAutoSubmitHandled={() => setAutoSubmitId(null)}
      />
    </div>
  );
}
