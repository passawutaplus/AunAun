import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Settings, Sparkles, UserPlus, FileCheck, Plus, Layers3, Target, UserRound, Pencil, Library } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyProjects } from "@/hooks/useProjects";
import { useFollowState } from "@/hooks/useFollow";
import { useCollections } from "@/hooks/useCollections";
import { useMyProjectSeries } from "@/hooks/useProjectSeries";
import { useInspireBoards } from "@/hooks/useInspire";
import CollectionCard from "@/components/collections/CollectionCard";
import { SeriesCard } from "@/components/series/SeriesCard";
import type { ExperienceItem } from "@/lib/validators";
import { ProfileAboutReadOnly } from "@/components/profile/ProfileAboutReadOnly";
import PageLoader from "@/components/ui/PageLoader";
import ProfileMenuCard from "@/components/profile/ProfileMenuCard";
import ProfileWalletCard from "@/components/profile/ProfileWalletCard";
import ProfileCoverHeader from "@/components/profile/ProfileCoverHeader";
import OnboardingChecklist from "@/components/onboarding/OnboardingChecklist";
import { DesignDrillSection } from "@/components/drill/DesignDrillSection";
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
import { ProfileHiringRequestsSection } from "@/components/profile/ProfileHiringRequestsSection";
import CollabRequestsSection from "@/components/CollabRequestsSection";

const parseExperience = (raw: unknown): ExperienceItem[] =>
  Array.isArray(raw) ? (raw as ExperienceItem[]) : [];

const parseSkills = (raw: unknown): string[] =>
  Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string") : [];

const PortfolioProfilePage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading } = useProfile(user?.id);
  const launchMinimal = isAplus1LaunchMinimal();
  const designDrillEnabled = isLaunchDesignDrillEnabled();
  const { data: myProjects = [] } = useMyProjects(user?.id);
  const { followers, following } = useFollowState(user?.id);
  const { data: collections = [] } = useCollections(user?.id);
  const { data: seriesList = [] } = useMyProjectSeries(user?.id);
  const { data: inspireBoards = [] } = useInspireBoards(user?.id);

  const [opportunityOpen, setOpportunityOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth?redirect=/portfolio");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!profile || !designDrillEnabled) return;
    const drill = new URLSearchParams(window.location.search).get("drill");
    if (drill !== "daily" && window.location.hash !== `#${PORTFOLIO_DRILL_HASH}`) return;
    const timer = window.setTimeout(() => {
      document.getElementById(PORTFOLIO_DRILL_HASH)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [profile, designDrillEnabled]);

  useEffect(() => {
    if (!profile) return;
    const focus = new URLSearchParams(window.location.search).get("focus");
    const el =
      focus === "collab"
        ? document.getElementById("collab-section")
        : focus === "hiring"
          ? document.getElementById("hiring-section")
          : null;
    if (!el) return;
    const timer = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [profile]);

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

  const published = useMemo(() => myProjects.filter((p) => p.status === "Published"), [myProjects]);
  const totalViews = useMemo(() => published.reduce((s, p) => s + (p.views ?? 0), 0), [published]);
  const experience = parseExperience(profile?.experience);
  const skills = parseSkills(profile?.skills);

  if (authLoading || isLoading || !profile) {
    return <PageLoader />;
  }

  return (
    <div className={cn("min-h-screen bg-app-ambient", MOBILE_PAGE_BOTTOM_CLASS)}>
      {/* Top bar */}
      <div className="sticky top-0 z-30 glass-panel border-x-0 border-t-0 rounded-none">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <BackButton to="/" label="กลับฟีด" />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/settings")} className="rounded-full glass-chip border-0">
              <Settings className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">ตั้งค่า</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <ProfileCoverHeader
          userId={user!.id}
          profile={profile}
          stats={{ works: published.length, followers, following }}
          opportunityStatus={(profile as { opportunity_status?: string }).opportunity_status}
          opportunityTypes={(profile as { opportunity_types?: string[] }).opportunity_types}
          opportunityNote={(profile as { opportunity_note?: string | null }).opportunity_note}
          onOpportunityEdit={() => setOpportunityOpen(true)}
          onPost={() => navigate("/portfolio/new")}
          onPreview={() =>
            navigate(profileVisitorPreviewPath({ user_id: user!.id, username: profile.username }))
          }
          onManage={() => navigate("/portfolio/manage")}
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

      <div className="max-w-6xl mx-auto px-4 pt-2 pb-16 grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 md:gap-8">
        <aside className="md:sticky md:top-20 md:self-start space-y-4">
          <div className="rounded-3xl glass-panel p-5 grid grid-cols-3 gap-3">
            <MiniStat icon={UserPlus} label="คำขอจ้าง" value={hireCount} />
            <MiniStat icon={FileCheck} label="เผยแพร่" value={published.length} />
            <MiniStat icon={Sparkles} label="ยอดดูรวม" value={totalViews} />
          </div>

          {!launchMinimal && <ProfileWalletCard />}

          <ProfileMenuCard opportunityOpen={opportunityOpen} onOpportunityOpenChange={setOpportunityOpen} />

          <OnboardingChecklist variant="full" />
        </aside>

        {/* RIGHT: Sections */}
        <main className="space-y-6 min-w-0">

          {designDrillEnabled && (
            <Section id={PORTFOLIO_DRILL_HASH} icon={Target} title="Design Drill">
              <DesignDrillSection />
            </Section>
          )}

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
            <ProfileAboutReadOnly profile={profile} experience={experience} skills={skills} />
          </Section>

          <ProfileHiringRequestsSection />

          <CollabRequestsSection />

          {/* ชุดผลงาน */}
          <Section
            icon={Library}
            title="ชุดผลงานของฉัน"
            count={seriesList.length}
            action={
              <Button
                size="sm"
                onClick={() => navigate("/series")}
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-8"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> จัดการ
              </Button>
            }
          >
            {seriesList.length ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {seriesList.slice(0, 6).map((s) => (
                  <SeriesCard key={s.id} series={s} />
                ))}
              </div>
            ) : (
              <EmptyHint
                text="รวมหลายชิ้นของลูกค้า/โปรเจกต์เดียวกัน — สร้างโฟลเดอร์ว่างก่อนก็ได้"
                cta="สร้างชุดผลงาน"
                onClick={() => navigate("/series")}
              />
            )}
          </Section>

          {/* My Collections */}
          <Section
            icon={Layers3}
            title="คอลเลกชันของฉัน"
            count={collections.length}
            action={
              <Button
                size="sm"
                onClick={() => navigate("/collections")}
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-8"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> จัดการ
              </Button>
            }
          >
            {collections.length ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {collections.slice(0, 6).map((c) => (
                  <CollectionCard key={c.id} collection={c} />
                ))}
              </div>
            ) : (
              <EmptyHint
                text="ยังไม่มีคอลเลกชัน เริ่มเก็บผลงานที่บอกสไตล์ของคุณ"
                cta="สร้างคอลเลกชัน"
                onClick={() => navigate("/collections")}
              />
            )}
          </Section>

          {/* My Inspire */}
          <Section
            icon={Sparkles}
            title="My Inspire"
            count={inspireBoards.length}
            action={
              inspireBoards.length > 0 ? (
                <span className="text-xs text-muted-foreground">รวมภาพที่ฉันชอบ</span>
              ) : null
            }
          >
            {inspireBoards.length ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {inspireBoards.slice(0, 6).map((b) => (
                  <button
                    key={b.id}
                    onClick={() => navigate(`/inspire/${b.id}`)}
                    className="group text-left rounded-2xl overflow-hidden border border-border bg-card hover:border-primary/60 hover:shadow-md transition"
                  >
                    <div className="aspect-[4/3] bg-muted overflow-hidden">
                      {b.cover_url ? (
                        <img src={b.cover_url} alt={b.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-muted-foreground">
                          <Sparkles className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-foreground truncate">{b.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{b.item_count} ภาพ</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyHint
                text="ยังไม่มีบอร์ดแรงบันดาลใจ กดปุ่ม Inspire บนภาพในผลงานเพื่อเริ่มเก็บ"
                cta="ดูฟีดเพื่อหาแรงบันดาลใจ"
                onClick={() => navigate("/")}
              />
            )}
          </Section>
        </main>
      </div>
    </div>
  );
};

const MiniStat = ({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) => (
  <div className="flex items-center gap-2.5">
    <div className="text-primary flex items-center justify-center">
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-sm font-medium text-foreground leading-none">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  </div>
);

const Section = ({
  id,
  icon: Icon, title, count, action, children,
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
          {typeof count === "number" && <span className="text-muted-foreground font-normal ml-1.5 text-sm">({count})</span>}
        </h2>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const EmptyHint = ({ text, cta, onClick }: { text: string; cta: string; onClick: () => void }) => (
  <div className="text-center py-8">
    <p className="text-sm text-muted-foreground mb-3">{text}</p>
    <Button size="sm" variant="outline" onClick={onClick} className="rounded-full">
      <Plus className="w-3.5 h-3.5 mr-1" /> {cta}
    </Button>
  </div>
);

export default PortfolioProfilePage;
