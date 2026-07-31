import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Share2 } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import SharePopover from "@/components/SharePopover";
import { Button } from "@/components/ui/button";
import PageLoader from "@/components/ui/PageLoader";
import HireDialog from "@/components/HireDialog";
import ServiceDetailView from "@/components/services/ServiceDetailView";
import ServiceRelatedPackages from "@/components/services/ServiceRelatedPackages";
import SeoHead from "@/components/SeoHead";
import { useAuth } from "@/hooks/useAuth";
import { useCreatorService } from "@/hooks/useCreatorServices";
import { useProfile } from "@/hooks/useProfile";
import { recordCreatorServiceView } from "@/hooks/usePackageOverviewSeries";
import { navigateToAuth } from "@/lib/authRedirect";
import { absoluteUrl, truncateDescription } from "@/lib/seo";
import { BRAND_NAME } from "@/lib/brandConfig";
import { PACKAGE_INQUIRY_PLATFORM_DISCLAIMER } from "@/lib/legalSignupCopy";
import { isLocalDevSelfHirePreview } from "@/lib/localDevSelfHire";

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
  const [hireOpen, setHireOpen] = useState(false);
  const [autoSubmitId, setAutoSubmitId] = useState<string | null>(null);

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

        <div className="px-4 py-8 md:px-5 lg:px-6 space-y-8">
          <ServiceRelatedPackages
            service={service}
            creatorName={creatorName}
            creatorUsername={ownerProfile?.username}
            creatorAvatarUrl={ownerProfile?.avatar_url}
            profilePackagesHref={profilePackagesHref}
          />
          <p className="text-[11px] leading-relaxed text-muted-foreground border-t border-border/50 pt-5">
            {PACKAGE_INQUIRY_PLATFORM_DISCLAIMER}
          </p>
        </div>
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
