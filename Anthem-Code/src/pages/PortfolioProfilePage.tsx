import { useMemo, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  UserRound,
  Pencil,
  Wallet,
} from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyProjects } from "@/hooks/useProjects";
import { useFollowState } from "@/hooks/useFollow";
import { useCollections } from "@/hooks/useCollections";
import { useInspireBoards, isDefaultInspireBoard } from "@/hooks/useInspire";
import CollectionsManagePanel from "@/components/collections/CollectionsManagePanel";
import ProfileOverallWorksPanel from "@/components/profile/ProfileOverallWorksPanel";
import InspireManagePanel from "@/components/inspire/InspireManagePanel";
import PortfolioBookingPanel from "@/components/portfolio/PortfolioBookingPanel";
import { useSavedCreatorServiceIds } from "@/hooks/useCreatorServiceBookmarks";
import type { ExperienceItem } from "@/lib/validators";
import { normalizeExperienceItem } from "@/lib/validators";
import { ProfileAboutReadOnly } from "@/components/profile/ProfileAboutReadOnly";
import PageLoader from "@/components/ui/PageLoader";
import ProfileWalletCard from "@/components/profile/ProfileWalletCard";
import ProfileAboutMeCard from "@/components/profile/ProfileAboutMeCard";
import ProfileCoverHeader from "@/components/profile/ProfileCoverHeader";
import ProfileOwnerActions from "@/components/profile/ProfileOwnerActions";
import OnboardingChecklist from "@/components/onboarding/OnboardingChecklist";
import OpportunityStatusDialog from "@/components/opportunity/OpportunityStatusDialog";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";
import { cn } from "@/lib/utils";
import { markOnboardingVisit } from "@/lib/onboardingStorage";
import { PORTFOLIO_DRILL_HASH } from "@/lib/drillProject";
import {
  profilePublicUrl,
  profilePublicPathLabel,
  profileShareMessage,
  profileShareTitle,
  profileVisitorPreviewPath,
} from "@/lib/profileRoutes";
import { isAplus1LaunchMinimal, isLaunchDesignDrillEnabled } from "@/lib/aplus1Launch";
import { parseSocialLinks } from "@/lib/parseSocialLinks";
import { displayProfileAddress } from "@/lib/profileAddress";
import { FEED_PAGE_GUTTER_X } from "@/components/feed/FeedHero";
import Footer from "@/components/Footer";

const PAGE_SHELL = cn("max-w-7xl mx-auto", FEED_PAGE_GUTTER_X);

const parseExperience = (raw: unknown): ExperienceItem[] =>
  Array.isArray(raw)
    ? raw.map(normalizeExperienceItem).filter((x): x is ExperienceItem => !!x)
    : [];

const parseSkills = (raw: unknown): string[] =>
  Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string") : [];

type ProfileTab = "overall" | "about" | "collections" | "booking" | "inspire";

const TAB_IDS: ProfileTab[] = ["overall", "collections", "booking", "inspire", "about"];

function resolveTab(raw: string | null): ProfileTab {
  if (raw && (TAB_IDS as string[]).includes(raw)) return raw as ProfileTab;
  return "overall";
}

const PortfolioProfilePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading } = useProfile(user?.id);
  const launchMinimal = isAplus1LaunchMinimal();
  const designDrillEnabled = isLaunchDesignDrillEnabled();
  const { data: myProjects = [], isLoading: projectsLoading } = useMyProjects(user?.id);
  const { followers, following } = useFollowState(user?.id);
  const { data: collections = [] } = useCollections(user?.id);
  const { data: savedPackageIds } = useSavedCreatorServiceIds();
  const { data: inspireBoardsRaw = [] } = useInspireBoards(user?.id);
  const inspireBoards = useMemo(
    () => inspireBoardsRaw.filter((b) => !isDefaultInspireBoard(b)),
    [inspireBoardsRaw],
  );

  const [opportunityOpen, setOpportunityOpen] = useState(false);
  const activeTab = resolveTab(searchParams.get("tab"));

  const setTab = (tab: ProfileTab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "overall") next.delete("tab");
    else next.set("tab", tab);
    next.delete("focus");
    if (tab !== "inspire") next.delete("b");
    if (tab !== "collections") next.delete("c");
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth?redirect=/portfolio");
  }, [authLoading, user, navigate]);

  // Legacy manage tabs + inbox focus → My Studio
  useEffect(() => {
    const focus = searchParams.get("focus");
    const tab = searchParams.get("tab");
    if (focus === "hiring") {
      navigate("/dashboard/hire", { replace: true });
      return;
    }
    if (focus === "collab") {
      navigate("/dashboard/collab", { replace: true });
      return;
    }
    if (tab === "reviews" || focus === "reviews") {
      navigate("/dashboard/reviews", { replace: true });
      return;
    }
    if (tab === "work") {
      navigate("/dashboard/projects", { replace: true });
      return;
    }
    if (tab === "services") {
      navigate("/dashboard/packages", { replace: true });
      return;
    }
    if (tab === "catalog") {
      const s = searchParams.get("s");
      navigate(s ? `/dashboard/catalogs?s=${encodeURIComponent(s)}` : "/dashboard/catalogs", {
        replace: true,
      });
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    if (!profile || !designDrillEnabled) return;
    const drill = searchParams.get("drill");
    if (drill !== "daily" && window.location.hash !== `#${PORTFOLIO_DRILL_HASH}`) return;
    navigate(`/dashboard/projects#${PORTFOLIO_DRILL_HASH}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to drill deep-link
  }, [profile, designDrillEnabled, searchParams, navigate]);

  const published = useMemo(() => myProjects.filter((p) => p.status === "Published"), [myProjects]);
  const projectIds = useMemo(() => myProjects.map((p) => p.id), [myProjects]);

  useEffect(() => {
    if (!user?.id) return;

    const invalidateProjects = () => {
      void queryClient.invalidateQueries({ queryKey: ["my-projects", user.id] });
    };
    const projectIdSet = new Set(projectIds);
    const ch = supabase
      .channel(`portfolio-profile-stats-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "anthem", table: "projects", filter: `owner_id=eq.${user.id}` },
        invalidateProjects,
      )
      .on("postgres_changes", { event: "INSERT", schema: "anthem", table: "project_views" }, (payload) => {
        const projectId = (payload.new as { project_id?: string }).project_id;
        if (!projectId || projectIdSet.has(projectId)) invalidateProjects();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [projectIds, queryClient, user?.id]);

  const experience = parseExperience(profile?.experience);
  const skills = parseSkills(profile?.skills);
  const disciplines = parseSkills(
    (profile as { preferred_categories?: unknown } | null | undefined)?.preferred_categories,
  );
  const opportunityTypes = parseSkills(
    (profile as { opportunity_types?: unknown } | null | undefined)?.opportunity_types,
  );
  const socialLinks = parseSocialLinks(
    (profile as { social_links?: unknown } | null | undefined)?.social_links,
  );

  const tabs: { id: ProfileTab; label: string; count?: number }[] = [
    { id: "overall", label: "My Projects", count: published.length },
    { id: "collections", label: "Collections", count: collections.length },
    { id: "booking", label: "Booking", count: savedPackageIds?.size ?? 0 },
    { id: "inspire", label: "Inspiration", count: inspireBoards.length },
    { id: "about", label: "About Me" },
  ];

  if (authLoading || isLoading || !profile) {
    return <PageLoader />;
  }

  const isVerified = !!(profile as { is_verified?: boolean }).is_verified;
  const shareUrl = profilePublicUrl({ user_id: user!.id, username: profile.username });
  const shareTitle = profileShareTitle({
    user_id: user!.id,
    username: profile.username,
    display_name: profile.display_name,
  });
  const shareMessage = profileShareMessage({
    user_id: user!.id,
    username: profile.username,
    display_name: profile.display_name,
    bio: profile.bio,
    role: profile.role,
  });
  const sharePathLabel = profilePublicPathLabel({ user_id: user!.id, username: profile.username });
  const coverUrl = profile.cover_url?.trim();
  const shareImageUrl =
    coverUrl && coverUrl.startsWith("http") ? coverUrl : profile.avatar_url ?? undefined;

  return (
    <div className={cn("min-h-screen bg-app-ambient", MOBILE_PAGE_BOTTOM_CLASS)}>
      <div className="sticky top-0 z-30 lg:hidden border-b border-border/40 bg-background/40 backdrop-blur-xl supports-[backdrop-filter]:bg-background/30">
        <div className={cn(PAGE_SHELL, "px-4 py-2 flex items-center justify-between gap-2")}>
          <BackButton to="/" label="กลับฟีด" />
          <ProfileOwnerActions
            compact
            onPost={() => navigate("/portfolio/new")}
            onBecomeCreator={!isVerified ? () => navigate("/verify") : undefined}
            onStudio={() => navigate("/dashboard")}
            onPreview={() =>
              navigate(profileVisitorPreviewPath({ user_id: user!.id, username: profile.username }))
            }
            onSettings={() => navigate("/settings")}
            shareUrl={shareUrl}
            shareTitle={shareTitle}
            shareMessage={shareMessage}
            sharePathLabel={sharePathLabel}
            shareImageUrl={shareImageUrl}
            onShareInteract={() => markOnboardingVisit(user!.id, "share_profile")}
          />
        </div>
      </div>

      <div className={PAGE_SHELL}>
        <ProfileCoverHeader
          userId={user!.id}
          profile={profile}
          stats={{ works: published.length, followers, following }}
          opportunityStatus={(profile as { opportunity_status?: string }).opportunity_status}
          opportunityTypes={(profile as { opportunity_types?: string[] }).opportunity_types}
          disciplines={disciplines}
          onOpportunityEdit={() => setOpportunityOpen(true)}
          onPost={() => navigate("/portfolio/new")}
          onBecomeCreator={!isVerified ? () => navigate("/verify") : undefined}
          onStudio={() => navigate("/dashboard")}
          onPreview={() =>
            navigate(profileVisitorPreviewPath({ user_id: user!.id, username: profile.username }))
          }
          shareUrl={shareUrl}
          shareTitle={shareTitle}
          shareMessage={shareMessage}
          sharePathLabel={sharePathLabel}
          onShareInteract={() => markOnboardingVisit(user!.id, "share_profile")}
          onSettings={() => navigate("/settings")}
          onFollowersClick={() => navigate("/portfolio/followers")}
          onFollowingClick={() => navigate("/portfolio/followers?tab=following")}
          showFollowStats={false}
        />
      </div>

      <div className={cn(PAGE_SHELL, "pt-2 pb-8 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 md:gap-12 lg:gap-16")}>
        {/* SIDEBAR */}
        <aside className="md:sticky md:top-20 md:self-start space-y-0">
          <div className="flex items-center justify-between gap-1 min-h-[2.75rem] border-b border-border/70 dark:border-border/50 text-sm">
            <span>
              <strong className="text-foreground tabular-nums">{published.length}</strong>{" "}
              <span className="text-muted-foreground">ผลงาน</span>
            </span>
            <button
              type="button"
              onClick={() => navigate("/portfolio/followers")}
              className="hover:text-primary transition-colors"
            >
              <strong className="text-foreground tabular-nums">{followers}</strong>{" "}
              <span className="text-muted-foreground">ผู้ติดตาม</span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/portfolio/followers?tab=following")}
              className="hover:text-primary transition-colors"
            >
              <strong className="text-foreground tabular-nums">{following}</strong>{" "}
              <span className="text-muted-foreground">ติดตาม</span>
            </button>
          </div>

          <ProfileAboutMeCard
            bio={profile.bio}
            role={profile.role}
            location={displayProfileAddress(
              (profile as { profile_address?: unknown }).profile_address,
              profile.location,
              "full",
            )}
            email={(profile as { email?: string | null }).email}
            skills={skills}
            experience={experience}
            socialLinks={socialLinks}
            onEdit={() => navigate("/settings#profile-about")}
          />

          {!launchMinimal && (
            <div className="pt-4 border-t border-border/70 dark:border-border/50">
              <ProfileWalletCard />
            </div>
          )}

          <div className="pt-4 border-t border-border/70 dark:border-border/50 space-y-4">
            <OnboardingChecklist variant="full" />
          </div>
        </aside>

        {/* RIGHT: Tabs + one panel */}
        <main className="min-w-0 space-y-4">
          <div className="border-b border-border/70">
            <nav
              aria-label="เมนูโปรไฟล์"
              className="grid grid-cols-3 lg:flex lg:items-center lg:gap-1"
            >
              {tabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTab(tab.id)}
                    className={cn(
                      "relative inline-flex h-11 min-w-0 items-center justify-center px-1 text-center text-[11px] leading-tight whitespace-nowrap transition-colors sm:text-[13px]",
                      "lg:w-auto lg:justify-start lg:px-3.5 lg:text-sm",
                      active
                        ? "font-semibold text-foreground"
                        : "font-medium text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className="min-w-0 truncate">
                      {tab.label}
                      {typeof tab.count === "number" && tab.count > 0 ? (
                        <span className="ml-0.5 text-[10px] font-normal tabular-nums text-muted-foreground lg:ml-1 lg:text-xs">
                          ({tab.count})
                        </span>
                      ) : null}
                    </span>
                    {active ? (
                      <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-foreground lg:inset-x-2" />
                    ) : null}
                  </button>
                );
              })}
              {isVerified ? (
                <div className="flex h-11 min-w-0 items-center justify-center lg:ml-auto lg:justify-end lg:pr-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 max-w-full rounded-full px-2.5 text-[11px] lg:text-xs"
                    onClick={() => navigate("/earnings")}
                  >
                    <Wallet className="mr-1 h-3.5 w-3.5 lg:mr-1.5" />
                    My Wallet
                  </Button>
                </div>
              ) : null}
            </nav>
          </div>

          {activeTab === "overall" ? (
            <ProfileOverallWorksPanel projects={myProjects} isLoading={projectsLoading} />
          ) : null}

          {activeTab === "about" ? (
            <Section
              icon={UserRound}
              title="เกี่ยวกับฉัน"
              action={
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate("/settings#profile-about")}
                  className="rounded-full h-8 text-xs text-muted-foreground hover:text-primary"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1" /> แก้ไขที่ตั้งค่า
                </Button>
              }
            >
              <ProfileAboutReadOnly
                profile={profile}
                experience={experience}
                skills={skills}
                disciplines={disciplines}
                opportunityTypes={opportunityTypes}
                socialLinks={socialLinks}
                mode="owner"
              />
            </Section>
          ) : null}

          {activeTab === "collections" ? (
            <CollectionsManagePanel userId={user!.id} embedded />
          ) : null}

          {activeTab === "booking" ? (
            <PortfolioBookingPanel userId={user!.id} />
          ) : null}

          {activeTab === "inspire" ? (
            <InspireManagePanel userId={user!.id} embedded />
          ) : null}
        </main>
      </div>
      <Footer />
      <OpportunityStatusDialog open={opportunityOpen} onOpenChange={setOpportunityOpen} />
    </div>
  );
};

const Section = ({
  id,
  icon: Icon,
  title,
  count,
  action,
  children,
}: {
  id?: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section id={id} className={cn("rounded-3xl glass-panel p-5 md:p-6", id && "scroll-mt-24")}>
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2">
        <div className="text-primary flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <h2 className="font-medium text-foreground">
          {title}
          {typeof count === "number" && (
            <span className="text-muted-foreground font-normal ml-1.5 text-sm">({count})</span>
          )}
        </h2>
      </div>
      {action}
    </div>
    {children}
  </section>
);

export default PortfolioProfilePage;
