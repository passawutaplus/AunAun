import { useMemo, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  Sparkles,
  UserPlus,
  FileCheck,
  UserRound,
  Pencil,
  Briefcase,
  Handshake,
  LayoutGrid,
} from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyProjects } from "@/hooks/useProjects";
import { useFollowState } from "@/hooks/useFollow";
import { useCollections } from "@/hooks/useCollections";
import { useMyProjectSeries } from "@/hooks/useProjectSeries";
import { useInspireBoards, isDefaultInspireBoard } from "@/hooks/useInspire";
import CollectionsManagePanel from "@/components/collections/CollectionsManagePanel";
import PortfolioWorksManagePanel from "@/components/portfolio/PortfolioWorksManagePanel";
import InspireManagePanel from "@/components/inspire/InspireManagePanel";
import CatalogManagePanel from "@/components/series/CatalogManagePanel";
import PortfolioPackagesManagePanel from "@/components/portfolio/PortfolioPackagesManagePanel";
import { useCreatorServices } from "@/hooks/useCreatorServices";
import type { ExperienceItem } from "@/lib/validators";
import { ProfileAboutReadOnly } from "@/components/profile/ProfileAboutReadOnly";
import PageLoader from "@/components/ui/PageLoader";
import ProfileMenuCard from "@/components/profile/ProfileMenuCard";
import ProfileWalletCard from "@/components/profile/ProfileWalletCard";
import ProfileAboutMeCard from "@/components/profile/ProfileAboutMeCard";
import ProfileCoverHeader from "@/components/profile/ProfileCoverHeader";
import OnboardingChecklist from "@/components/onboarding/OnboardingChecklist";
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

const PAGE_SHELL = cn("max-w-[1920px] mx-auto", FEED_PAGE_GUTTER_X);

const parseExperience = (raw: unknown): ExperienceItem[] =>
  Array.isArray(raw) ? (raw as ExperienceItem[]) : [];

const parseSkills = (raw: unknown): string[] =>
  Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string") : [];

type ProfileTab = "work" | "services" | "about" | "catalog" | "collections" | "inspire";

const TAB_IDS: ProfileTab[] = ["work", "services", "catalog", "collections", "inspire", "about"];

function resolveTab(raw: string | null): ProfileTab {
  if (raw && (TAB_IDS as string[]).includes(raw)) return raw as ProfileTab;
  return "work";
}

const PortfolioProfilePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading } = useProfile(user?.id);
  const launchMinimal = isAplus1LaunchMinimal();
  const designDrillEnabled = isLaunchDesignDrillEnabled();
  const { data: myProjects = [] } = useMyProjects(user?.id);
  const { followers, following } = useFollowState(user?.id);
  const { data: collections = [] } = useCollections(user?.id);
  const { data: seriesList = [] } = useMyProjectSeries(user?.id);
  const { data: myServices = [] } = useCreatorServices(user?.id, { includeDrafts: true });
  const { data: inspireBoardsRaw = [] } = useInspireBoards(user?.id);
  const inspireBoards = useMemo(
    () => inspireBoardsRaw.filter((b) => !isDefaultInspireBoard(b)),
    [inspireBoardsRaw],
  );

  const [opportunityOpen, setOpportunityOpen] = useState(false);
  const activeTab = resolveTab(searchParams.get("tab"));

  const setTab = (tab: ProfileTab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "work") next.delete("tab");
    else next.set("tab", tab);
    next.delete("focus");
    if (tab !== "inspire") next.delete("b");
    if (tab !== "catalog") next.delete("s");
    if (tab !== "collections") next.delete("c");
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth?redirect=/portfolio");
  }, [authLoading, user, navigate]);

  // Legacy focus=hiring|collab → dedicated dashboard pages
  useEffect(() => {
    const focus = searchParams.get("focus");
    if (focus === "hiring") {
      navigate("/dashboard", { replace: true });
      return;
    }
    if (focus === "collab") {
      navigate("/dashboard/collab", { replace: true });
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    if (!profile || !designDrillEnabled) return;
    const drill = searchParams.get("drill");
    if (drill !== "daily" && window.location.hash !== `#${PORTFOLIO_DRILL_HASH}`) return;
    setTab("work");
    const timer = window.setTimeout(() => {
      document.getElementById(PORTFOLIO_DRILL_HASH)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to drill deep-link
  }, [profile, designDrillEnabled, searchParams]);

  const { data: hireCount = 0 } = useQuery({
    queryKey: ["hire-count", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count } = await supabase
        .from("hiring_requests")
        .select("id", { count: "exact", head: true })
        .eq("freelancer_id", user!.id);
      return count ?? 0;
    },
  });

  const { data: collabCount = 0 } = useQuery({
    queryKey: ["collab-count", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count } = await supabase
        .from("collab_requests")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user!.id);
      return count ?? 0;
    },
  });

  const published = useMemo(() => myProjects.filter((p) => p.status === "Published"), [myProjects]);
  const totalViews = useMemo(() => published.reduce((s, p) => s + (p.views ?? 0), 0), [published]);
  const projectIds = useMemo(() => myProjects.map((p) => p.id), [myProjects]);

  useEffect(() => {
    if (!user?.id) return;

    const invalidateRequests = () => {
      void queryClient.invalidateQueries({ queryKey: ["hire-count", user.id] });
      void queryClient.invalidateQueries({ queryKey: ["collab-count", user.id] });
      void queryClient.invalidateQueries({ queryKey: ["hiring_requests", user.id] });
      void queryClient.invalidateQueries({ queryKey: ["collab-requests"] });
    };
    const invalidateProjects = () => {
      void queryClient.invalidateQueries({ queryKey: ["my-projects", user.id] });
    };
    const projectIdSet = new Set(projectIds);
    const ch = supabase
      .channel(`portfolio-profile-stats-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "anthem", table: "hiring_requests", filter: `freelancer_id=eq.${user.id}` },
        invalidateRequests,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "anthem", table: "collab_requests", filter: `recipient_id=eq.${user.id}` },
        invalidateRequests,
      )
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
    { id: "work", label: "Works", count: published.length },
    { id: "services", label: "Packages", count: myServices.length },
    { id: "catalog", label: "Catalogs", count: seriesList.length },
    { id: "collections", label: "Collections", count: collections.length },
    { id: "inspire", label: "Inspiration", count: inspireBoards.length },
    { id: "about", label: "About Me" },
  ];

  if (authLoading || isLoading || !profile) {
    return <PageLoader />;
  }

  return (
    <div className={cn("min-h-screen bg-app-ambient", MOBILE_PAGE_BOTTOM_CLASS)}>
      <div className="sticky top-0 z-30 lg:hidden border-b border-border/40 bg-background/40 backdrop-blur-xl supports-[backdrop-filter]:bg-background/30">
        <div className={cn(PAGE_SHELL, "py-3 flex items-center justify-between")}>
          <BackButton to="/" label="กลับฟีด" />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/settings")} className="rounded-full glass-chip border-0">
              <Settings className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">ตั้งค่า</span>
            </Button>
          </div>
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
          onPreview={() =>
            navigate(profileVisitorPreviewPath({ user_id: user!.id, username: profile.username }))
          }
          shareUrl={profilePublicUrl({ user_id: user!.id, username: profile.username })}
          shareTitle={profileShareTitle({
            user_id: user!.id,
            username: profile.username,
            display_name: profile.display_name,
          })}
          shareMessage={profileShareMessage({
            user_id: user!.id,
            username: profile.username,
            display_name: profile.display_name,
            bio: profile.bio,
            role: profile.role,
          })}
          sharePathLabel={profilePublicPathLabel({ user_id: user!.id, username: profile.username })}
          onShareInteract={() => markOnboardingVisit(user!.id, "share_profile")}
          onFollowersClick={() => navigate("/portfolio/followers")}
          onFollowingClick={() => navigate("/portfolio/followers?tab=following")}
        />
      </div>

      <div className={cn(PAGE_SHELL, "pt-2 pb-16 grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 md:gap-8")}>
        {/* SIDEBAR — unchanged structure */}
        <aside className="md:sticky md:top-20 md:self-start space-y-4">
          <div className="rounded-3xl glass-panel p-5 grid grid-cols-3 gap-3">
            <RequestMiniStat
              icon={UserPlus}
              label="คำขอ"
              hireCount={hireCount}
              collabCount={collabCount}
              onClick={() => {
                navigate(
                  hireCount > 0 || collabCount === 0 ? "/dashboard" : "/dashboard/collab",
                );
              }}
            />
            <MiniStat
              icon={FileCheck}
              label="เผยแพร่"
              value={published.length}
              onClick={() => setTab("work")}
            />
            <MiniStat
              icon={Sparkles}
              label="คนดู"
              value={totalViews}
              title="รวมยอดเข้าชมหน้ารายละเอียดผลงานที่เผยแพร่แล้ว (นับครั้งต่อเซสชันต่อชิ้น)"
            />
          </div>

          <ProfileAboutMeCard
            bio={profile.bio}
            location={displayProfileAddress(
              (profile as { profile_address?: unknown }).profile_address,
              profile.location,
              "full",
            )}
            onEdit={() => navigate("/settings#profile-about")}
          />

          {!launchMinimal && <ProfileWalletCard />}

          <ProfileMenuCard opportunityOpen={opportunityOpen} onOpportunityOpenChange={setOpportunityOpen} />

          <OnboardingChecklist variant="full" />
        </aside>

        {/* RIGHT: Tabs + one panel */}
        <main className="min-w-0 space-y-4">
          {(hireCount > 0 || collabCount > 0) && (
            <div className="flex flex-wrap gap-2">
              {hireCount > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full h-8 text-xs gap-1.5"
                  onClick={() => navigate("/dashboard")}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  คำขอจ้างงาน
                  <span className="tabular-nums text-sky-500 font-semibold">{hireCount}</span>
                </Button>
              ) : null}
              {collabCount > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full h-8 text-xs gap-1.5"
                  onClick={() => navigate("/dashboard/collab")}
                >
                  <Handshake className="w-3.5 h-3.5" />
                  คำขอคอลแลป
                  <span className="tabular-nums text-primary font-semibold">{collabCount}</span>
                </Button>
              ) : null}
            </div>
          )}

          <div className="flex items-end gap-2 border-b border-border/70">
            <div className="min-w-0 flex-1 overflow-x-auto scrollbar-hide">
              <nav className="flex min-w-max items-center gap-1" aria-label="เมนูโปรไฟล์">
                {tabs.map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <div key={tab.id} className="flex items-center gap-1">
                      {tab.id === "collections" ? (
                        <span
                          aria-hidden
                          className="mx-1 h-4 w-px shrink-0 bg-border/80"
                        />
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setTab(tab.id)}
                        className={cn(
                          "relative px-3.5 py-2.5 text-sm whitespace-nowrap transition-colors",
                          active
                            ? "font-semibold text-foreground"
                            : "font-medium text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {tab.label}
                        {typeof tab.count === "number" && tab.count > 0 ? (
                          <span className="ml-1 text-xs text-muted-foreground font-normal tabular-nums">
                            ({tab.count})
                          </span>
                        ) : null}
                        {active ? (
                          <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-foreground" />
                        ) : null}
                      </button>
                    </div>
                  );
                })}
              </nav>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mb-1.5 shrink-0 rounded-full h-8 text-xs gap-1.5"
              onClick={() => navigate("/dashboard")}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              จัดการงาน
            </Button>
          </div>

          {activeTab === "work" ? (
            <PortfolioWorksManagePanel userId={user!.id} showDesignDrill />
          ) : null}

          {activeTab === "services" ? (
            <PortfolioPackagesManagePanel ownerId={user!.id} />
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
              />
            </Section>
          ) : null}

          {activeTab === "catalog" ? (
            <CatalogManagePanel userId={user!.id} embedded />
          ) : null}

          {activeTab === "collections" ? (
            <CollectionsManagePanel userId={user!.id} embedded />
          ) : null}

          {activeTab === "inspire" ? (
            <InspireManagePanel userId={user!.id} embedded />
          ) : null}
        </main>
      </div>
    </div>
  );
};

const MiniStat = ({
  icon: Icon,
  label,
  value,
  onClick,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  onClick?: () => void;
  title?: string;
}) => {
  const body = (
    <>
      <div className="text-primary flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
      </div>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        className="flex items-center gap-2.5 rounded-xl text-left hover:bg-muted/40 transition-colors -m-1.5 p-1.5"
      >
        {body}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2.5" title={title}>
      {body}
    </div>
  );
};

const RequestMiniStat = ({
  icon: Icon,
  label,
  hireCount,
  collabCount,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hireCount: number;
  collabCount: number;
  onClick?: () => void;
}) => {
  const body = (
    <>
      <div className="text-primary flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm leading-none" aria-label={`จ้าง ${hireCount} คอลแลป ${collabCount}`}>
          <span className="font-semibold text-sky-400">{hireCount}</span>
          <span className="px-0.5 text-muted-foreground">/</span>
          <span className="font-semibold text-primary">{collabCount}</span>
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
      </div>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-2.5 rounded-xl text-left hover:bg-muted/40 transition-colors -m-1.5 p-1.5"
      >
        {body}
      </button>
    );
  }
  return <div className="flex items-center gap-2.5">{body}</div>;
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
