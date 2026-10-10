import { useMemo, useEffect, useState } from "react";
import { isInspireEnabled } from "@/lib/aplus1Launch";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { BackButton } from "@/components/ui/BackButton";
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
import PortfolioHiringPanel from "@/components/portfolio/PortfolioHiringPanel";
import { useMyApplications, useMySavedJobs } from "@/hooks/useJobs";
import { useSavedCreatorServiceIds } from "@/hooks/useCreatorServiceBookmarks";
import type { ExperienceItem } from "@/lib/validators";
import { normalizeExperienceItem } from "@/lib/validators";
import ProfileAboutPanel from "@/components/profile/ProfileAboutPanel";
import PageLoader from "@/components/ui/PageLoader";
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
import { isAplus1HiringBoardEnabled, isLaunchDesignDrillEnabled } from "@/lib/aplus1Launch";
import { parseSocialLinks } from "@/lib/parseSocialLinks";
import { FEED_PAGE_GUTTER_X } from "@/components/feed/FeedHero";
import Footer from "@/components/Footer";

const PAGE_SHELL = cn("max-w-7xl mx-auto", FEED_PAGE_GUTTER_X);

const parseExperience = (raw: unknown): ExperienceItem[] =>
  Array.isArray(raw)
    ? raw.map(normalizeExperienceItem).filter((x): x is ExperienceItem => !!x)
    : [];

const parseSkills = (raw: unknown): string[] =>
  Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string") : [];

type ProfileTab = "overall" | "about" | "collections" | "booking" | "hiring" | "inspire";

const TAB_IDS: ProfileTab[] = ["overall", "collections", "booking", "hiring", "inspire", "about"];

function resolveTab(raw: string | null, hiringEnabled: boolean): ProfileTab {
  if (raw === "hiring" && !hiringEnabled) return "overall";
  if (raw === "inspire" && !isInspireEnabled()) return "overall";
  if (raw && (TAB_IDS as string[]).includes(raw)) return raw as ProfileTab;
  return "overall";
}

const PortfolioProfilePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading } = useProfile(user?.id);
  const designDrillEnabled = isLaunchDesignDrillEnabled();
  const hiringBoardEnabled = isAplus1HiringBoardEnabled();
  const { data: myProjects = [], isLoading: projectsLoading } = useMyProjects(user?.id);
  const { followers, following } = useFollowState(user?.id);
  const { data: collections = [] } = useCollections(user?.id);
  const { data: savedPackageIds } = useSavedCreatorServiceIds();
  // Tabs that are switched off at launch don't need their data either.
  const { data: myApplications = [] } = useMyApplications({ enabled: hiringBoardEnabled });
  const { data: mySavedJobs = [] } = useMySavedJobs({ enabled: hiringBoardEnabled });
  const { data: inspireBoardsRaw = [] } = useInspireBoards(isInspireEnabled() ? user?.id : undefined);
  const inspireBoards = useMemo(
    () => inspireBoardsRaw.filter((b) => !isDefaultInspireBoard(b)),
    [inspireBoardsRaw],
  );

  const [opportunityOpen, setOpportunityOpen] = useState(false);
  const activeTab = resolveTab(searchParams.get("tab"), hiringBoardEnabled);

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
  const projectIdsKey = useMemo(() => [...projectIds].sort().join(","), [projectIds]);

  useEffect(() => {
    if (!user?.id) return;

    const invalidateProjects = () => {
      void queryClient.invalidateQueries({ queryKey: ["my-projects", user.id] });
    };
    // Realtime `in` filters take up to 100 values; beyond that the view count refreshes on refetch.
    const idCount = projectIdsKey ? projectIdsKey.split(",").length : 0;
    const viewFilter = idCount > 0 && idCount <= 100 ? `project_id=in.(${projectIdsKey})` : null;
    let channel = supabase
      .channel(`portfolio-profile-stats-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "anthem", table: "projects", filter: `owner_id=eq.${user.id}` },
        invalidateProjects,
      );
    if (viewFilter) {
      channel = channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "anthem", table: "project_views", filter: viewFilter },
        invalidateProjects,
      );
    }
    const ch = channel.subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [projectIdsKey, queryClient, user?.id]);

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
    { id: "booking", label: "Packages", count: savedPackageIds?.size ?? 0 },
    ...(hiringBoardEnabled
      ? [{ id: "hiring" as const, label: "Hiring", count: myApplications.length + mySavedJobs.length }]
      : []),
    ...(isInspireEnabled()
      ? [{ id: "inspire" as const, label: "Inspiration", count: inspireBoards.length }]
      : []),
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
            onWallet={isVerified ? () => navigate("/earnings") : undefined}
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
          onWallet={isVerified ? () => navigate("/earnings") : undefined}
          onFollowersClick={() => navigate("/portfolio/followers")}
          onFollowingClick={() => navigate("/portfolio/followers?tab=following")}
          showFollowStats
        />
      </div>

      <div className={cn(PAGE_SHELL, "pt-2 pb-8 space-y-4")}>
        <main className="min-w-0 space-y-4">
          <div className="border-b border-border/70">
            <nav
              aria-label="เมนูโปรไฟล์"
              className="flex items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {tabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTab(tab.id)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative inline-flex h-11 shrink-0 items-center justify-center px-3.5 text-center text-[13px] uppercase leading-tight tracking-wide whitespace-nowrap transition-colors",
                      active
                        ? "font-semibold text-foreground"
                        : "font-medium text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className="min-w-0 truncate">
                      {tab.label}
                      {typeof tab.count === "number" && tab.count > 0 ? (
                        <span className="ml-1.5 text-[11px] font-normal tabular-nums tracking-normal text-muted-foreground">
                          {tab.count}
                        </span>
                      ) : null}
                    </span>
                    {active ? (
                      <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-foreground" />
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>

          {activeTab === "overall" ? (
            <ProfileOverallWorksPanel
              projects={myProjects}
              isLoading={projectsLoading}
              afterHeading={<OnboardingChecklist variant="compact" />}
            />
          ) : null}

          {activeTab === "about" ? (
            <ProfileAboutPanel
                userId={user!.id}
                profile={profile}
                experience={experience}
                skills={skills}
                socialLinks={socialLinks}
                mode="owner"
                profileUrl={profilePublicUrl({
                  user_id: user!.id,
                  username: profile.username,
                })}
              />
          ) : null}

          {activeTab === "collections" ? (
            <CollectionsManagePanel userId={user!.id} embedded />
          ) : null}

          {activeTab === "booking" ? (
            <PortfolioBookingPanel userId={user!.id} />
          ) : null}

          {activeTab === "hiring" ? <PortfolioHiringPanel /> : null}

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

export default PortfolioProfilePage;
