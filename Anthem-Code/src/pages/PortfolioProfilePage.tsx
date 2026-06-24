import BriefcaseIcon from "../components/icons/BriefcaseIcon";
import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Settings, ExternalLink, LayoutGrid, Sparkles, Phone, UserPlus, FileCheck, Plus, Layers3, ArrowDownUp, Eye, Heart, Clock, ChevronDown, ChevronUp, Gift as GiftIcon, Target, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyProjects } from "@/hooks/useProjects";
import { useFollowState } from "@/hooks/useFollow";
import { useCollections } from "@/hooks/useCollections";
import { useInspireBoards } from "@/hooks/useInspire";
import CollectionCard from "@/components/collections/CollectionCard";
import { toast } from "sonner";
import type { ExperienceItem } from "@/lib/validators";
import ExperienceTimeline from "@/components/profile/ExperienceTimeline";
import SkillsList from "@/components/profile/SkillsList";
import ContactCards from "@/components/profile/ContactCards";
import PortfolioGrid from "@/components/profile/PortfolioGrid";
import ProfileMenuCard from "@/components/profile/ProfileMenuCard";
import ProfileCoverHeader from "@/components/profile/ProfileCoverHeader";
import ReceivedGiftsSummary from "@/components/profile/ReceivedGiftsSummary";
import OnboardingChecklist from "@/components/onboarding/OnboardingChecklist";
import { DesignDrillSection } from "@/components/drill/DesignDrillSection";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";
import { cn } from "@/lib/utils";
import { markOnboardingVisit } from "@/lib/onboardingStorage";
import { PORTFOLIO_DRILL_HASH } from "@/lib/drillProject";
import { profilePublicPath, profilePublicUrl } from "@/lib/profileRoutes";
import { COMMUNITY_NEW_PATH } from "@/data/createActions";
import { useSavedCommunityPosts } from "@/hooks/useCommunityPostInteractions";
import { useCreatorEligibility } from "@/hooks/useCreatorEligibility";
import CreatorEligibilityProgress from "@/components/verification/CreatorEligibilityProgress";
import CommunityPostGridCard from "@/components/feed/CommunityPostGridCard";
import { sortPortfolioProjects, type PortfolioSortMode } from "@/lib/portfolioSort";
import { Pin } from "lucide-react";


const SOLO_URL = "https://solofreelancer.com";

const PortfolioProfilePage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading } = useProfile(user?.id);
  const { data: myProjects = [] } = useMyProjects(user?.id);
  const { followers, following } = useFollowState(user?.id);
  const { data: collections = [] } = useCollections(user?.id);
  const { data: inspireBoards = [] } = useInspireBoards(user?.id);
  const { data: savedPosts = [] } = useSavedCommunityPosts(user?.id);
  const { data: eligibility } = useCreatorEligibility(user?.id);

  const [portfolioSort, setPortfolioSort] = useState<PortfolioSortMode>("portfolio");
  const [showAllPortfolio, setShowAllPortfolio] = useState(false);


  useEffect(() => {
    if (!authLoading && !user) navigate("/auth?redirect=/portfolio");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!profile) return;
    const drill = new URLSearchParams(window.location.search).get("drill");
    if (drill !== "daily" && window.location.hash !== `#${PORTFOLIO_DRILL_HASH}`) return;
    const timer = window.setTimeout(() => {
      document.getElementById(PORTFOLIO_DRILL_HASH)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
  const sortedPublished = useMemo(
    () => sortPortfolioProjects(published, portfolioSort),
    [published, portfolioSort],
  );
  const visiblePortfolio = showAllPortfolio ? sortedPublished : sortedPublished.slice(0, 6);
  const experience = (profile?.experience as unknown as ExperienceItem[]) ?? [];
  const skills = profile?.skills ?? [];

  const sharePublic = async () => {
    if (!profile || !user) return;
    const url = profilePublicUrl({ user_id: user.id, username: profile.username });
    try {
      await navigator.clipboard.writeText(url);
      markOnboardingVisit(user.id, "share_profile");
      toast.success("คัดลอกลิงก์โปรไฟล์แล้ว", { description: url });
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  };

  if (authLoading || isLoading || !profile) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">กำลังโหลด...</div>;
  }

  return (
    <div className={cn("min-h-screen bg-app-ambient", MOBILE_PAGE_BOTTOM_CLASS)}>
      {/* Top bar */}
      <div className="sticky top-0 z-30 glass-panel border-x-0 border-t-0 rounded-none">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> ฟีด
          </button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(SOLO_URL, "_blank", "noopener,noreferrer")}
              className="rounded-full glass-chip border-0 text-primary hover:text-primary"
            >
              <ExternalLink className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Solo Freelancer</span>
            </Button>
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
          onPost={() => navigate(COMMUNITY_NEW_PATH)}
          onPreview={() =>
            navigate(profilePublicPath({ user_id: user!.id, username: profile.username }))
          }
          onManage={() => navigate("/portfolio/manage")}
          onShare={sharePublic}
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

          <ProfileMenuCard />
        </aside>

        {/* RIGHT: Sections */}
        <main className="space-y-6 min-w-0">
          <OnboardingChecklist variant="full" />

          {eligibility && <CreatorEligibilityProgress data={eligibility} />}

          <Section id={PORTFOLIO_DRILL_HASH} icon={Target} title="Design Drill">
            <DesignDrillSection />
          </Section>

          <Section
            id="saved-posts"
            icon={Bookmark}
            title="โพสต์ที่บันทึก"
            count={savedPosts.length}
            action={
              savedPosts.length > 6 ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/portfolio/saved")}
                  className="rounded-full h-8"
                >
                  ดูทั้งหมด ({savedPosts.length})
                </Button>
              ) : savedPosts.length > 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/?mode=community")}
                  className="rounded-full h-8"
                >
                  ไปฟีด
                </Button>
              ) : null
            }
          >
            {savedPosts.length ? (
              <div className="space-y-4">
                <div className="columns-2 md:columns-3 gap-2 sm:gap-3">
                  {savedPosts.slice(0, 6).map((post) => (
                    <div key={post.id} className="break-inside-avoid mb-2 sm:mb-3">
                      <CommunityPostGridCard post={post} />
                    </div>
                  ))}
                </div>
                {savedPosts.length > 6 && (
                  <Button
                    variant="outline"
                    onClick={() => navigate("/portfolio/saved")}
                    className="w-full rounded-full"
                  >
                    <ChevronDown className="w-4 h-4 mr-1" /> ดูโพสต์ที่บันทึกทั้งหมด ({savedPosts.length})
                  </Button>
                )}
              </div>
            ) : (
              <EmptyHint
                text="ยังไม่มีโพสต์ที่บันทึก — กดไอคอนบุ๊กมาร์กข้างปุ่มแชร์ในโพสต์เพื่อเก็บไว้อ่านทีหลัง"
                cta="ไปดูฟีดชุมชน"
                onClick={() => navigate("/?mode=community")}
              />
            )}
          </Section>

          {/* About */}
          <Section icon={Sparkles} title="เกี่ยวกับฉัน" action={<EditLink to="/settings" />}>
            {profile.bio ? (
              <p className="text-sm md:text-base text-foreground/85 leading-7 whitespace-pre-wrap">{profile.bio}</p>
            ) : (
              <EmptyHint text="ยังไม่ได้แนะนำตัว" cta="เพิ่มประวัติย่อ" onClick={() => navigate("/settings")} />
            )}
          </Section>

          {/* Portfolio */}
          <Section
            icon={LayoutGrid}
            title="ผลงาน"
            count={published.length}
            action={
              <Button size="sm" onClick={() => navigate("/portfolio/new")} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-8">
                <Plus className="w-3.5 h-3.5 mr-1" /> เพิ่มผลงาน
              </Button>
            }
          >
            {published.length ? (
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0 mr-1">
                    <ArrowDownUp className="w-3 h-3" /> เรียง
                  </span>
                  {([
                    { key: "portfolio", label: "ลำดับของฉัน", Icon: Pin },
                    { key: "newest", label: "ล่าสุด", Icon: Clock },
                    { key: "views", label: "วิวมากสุด", Icon: Eye },
                    { key: "likes", label: "หัวใจมากสุด", Icon: Heart },
                  ] as const).map(({ key, label, Icon }) => {
                    const active = portfolioSort === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setPortfolioSort(key)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border whitespace-nowrap shrink-0 transition-colors ${
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="w-3 h-3" /> {label}
                      </button>
                    );
                  })}
                </div>
                <PortfolioGrid projects={visiblePortfolio} />
                {sortedPublished.length > 6 && (
                  <Button
                    variant="outline"
                    onClick={() => setShowAllPortfolio((v) => !v)}
                    className="w-full rounded-full"
                  >
                    {showAllPortfolio ? (
                      <><ChevronUp className="w-4 h-4 mr-1" /> ย่อรายการ</>
                    ) : (
                      <><ChevronDown className="w-4 h-4 mr-1" /> ดูผลงานทั้งหมด ({sortedPublished.length})</>
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <EmptyHint text="ยังไม่มีผลงานเผยแพร่" cta="ลงผลงานชิ้นแรก" onClick={() => navigate("/portfolio/new")} />
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

          {/* Received Gifts */}
          <Section icon={GiftIcon} title="ของขวัญที่ฉันได้รับ">
            <ReceivedGiftsSummary userId={user!.id} />
          </Section>







          <Section icon={BriefcaseIcon} title="ประสบการณ์ทำงาน" action={<EditLink to="/settings" />}>
            {experience.length ? (
              <ExperienceTimeline items={experience} />
            ) : (
              <EmptyHint text="ยังไม่ได้เพิ่มประวัติการทำงาน" cta="เพิ่มประสบการณ์" onClick={() => navigate("/settings")} />
            )}
          </Section>

          {/* Skills */}
          <Section icon={Sparkles} title="ความชำนาญ" count={skills.length} action={<EditLink to="/settings" />}>
            <SkillsList skills={skills} />
          </Section>

          {/* Contacts */}
          <Section icon={Phone} title="ข้อมูลติดต่อ" action={<EditLink to="/settings" />}>
            <ContactCards
              email={profile.email}
              phone={profile.phone}
              website={profile.website}
              lineId={profile.line_id}
              facebook={profile.facebook}
              instagram={profile.instagram}
            />
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

const EditLink = ({ to }: { to: string }) => {
  const navigate = useNavigate();
  return (
    <Button size="sm" variant="ghost" onClick={() => navigate(to)} className="rounded-full h-8 text-xs text-muted-foreground hover:text-primary">
      แก้ไข
    </Button>
  );
};

const EmptyHint = ({ text, cta, onClick }: { text: string; cta: string; onClick: () => void }) => (
  <div className="text-center py-8">
    <p className="text-sm text-muted-foreground mb-3">{text}</p>
    <Button size="sm" variant="outline" onClick={onClick} className="rounded-full">
      <Plus className="w-3.5 h-3.5 mr-1" /> {cta}
    </Button>
  </div>
);

export default PortfolioProfilePage;
