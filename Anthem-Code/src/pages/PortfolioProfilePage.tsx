import BriefcaseIcon from "../components/icons/BriefcaseIcon";
import { useMemo, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, LayoutGrid, Sparkles, Phone, UserPlus, FileCheck, Plus, Layers3, ChevronDown, Gift as GiftIcon, Target, Bookmark, MessageSquare } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useMyProjects } from "@/hooks/useProjects";
import { useFollowState } from "@/hooks/useFollow";
import { useCollections } from "@/hooks/useCollections";
import { useInspireBoards } from "@/hooks/useInspire";
import CollectionCard from "@/components/collections/CollectionCard";
import { toast } from "sonner";
import type { ExperienceItem } from "@/lib/validators";
import { experienceItemSchema } from "@/lib/validators";
import ExperienceTimeline from "@/components/profile/ExperienceTimeline";
import ExperienceEditor from "@/components/profile/ExperienceEditor";
import SkillsEditor from "@/components/profile/SkillsEditor";
import SkillsList from "@/components/profile/SkillsList";
import ContactCards from "@/components/profile/ContactCards";
import ContactEditor, { type ContactFormValues } from "@/components/profile/ContactEditor";
import { ProfileEditableSection } from "@/components/profile/ProfileEditableSection";
import PortfolioGrid from "@/components/profile/PortfolioGrid";
import ProfileMenuCard from "@/components/profile/ProfileMenuCard";
import ProfileWalletCard from "@/components/profile/ProfileWalletCard";
import ProfileCoverHeader from "@/components/profile/ProfileCoverHeader";
import ReceivedGiftsSummary from "@/components/profile/ReceivedGiftsSummary";
import OnboardingChecklist from "@/components/onboarding/OnboardingChecklist";
import { DesignDrillSection } from "@/components/drill/DesignDrillSection";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";
import { cn } from "@/lib/utils";
import { isAplus1LaunchMinimal } from "@/lib/aplus1Launch";
import { markOnboardingVisit } from "@/lib/onboardingStorage";
import { PORTFOLIO_DRILL_HASH } from "@/lib/drillProject";
import { profilePublicUrl, profileVisitorPreviewPath } from "@/lib/profileRoutes";
import { useSavedCommunityPosts } from "@/hooks/useCommunityPostInteractions";
import { useCommunityPostsByAuthor } from "@/hooks/useCommunityPosts";
import CommunityPostGridCard from "@/components/feed/CommunityPostGridCard";
import { ContentSortChips } from "@/components/profile/ContentSortChips";
import {
  sortCommunityPostsForProfile,
  sortProjectsForProfile,
  type ProfileContentSort,
} from "@/lib/contentSort";
import { ProfileHiringRequestsSection } from "@/components/profile/ProfileHiringRequestsSection";
import CollabRequestsSection from "@/components/CollabRequestsSection";

type ProfileEditKey = "bio" | "experience" | "skills" | "contact";

const parseExperience = (raw: unknown): ExperienceItem[] =>
  Array.isArray(raw) ? (raw as ExperienceItem[]) : [];

const parseSkills = (raw: unknown): string[] =>
  Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string") : [];

const PortfolioProfilePage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading } = useProfile(user?.id);
  const updateProfile = useUpdateProfile(user?.id);
  const { data: myProjects = [] } = useMyProjects(user?.id);
  const { followers, following } = useFollowState(user?.id);
  const { data: collections = [] } = useCollections(user?.id);
  const { data: inspireBoards = [] } = useInspireBoards(user?.id);
  const { data: savedPosts = [] } = useSavedCommunityPosts(user?.id);
  const { data: myPosts = [] } = useCommunityPostsByAuthor(user?.id);

  const [projectSort, setProjectSort] = useState<ProfileContentSort>("newest");
  const [postSort, setPostSort] = useState<ProfileContentSort>("newest");
  const [editKey, setEditKey] = useState<ProfileEditKey | null>(null);
  const [draftBio, setDraftBio] = useState("");
  const [draftExperience, setDraftExperience] = useState<ExperienceItem[]>([]);
  const [draftSkills, setDraftSkills] = useState<string[]>([]);
  const [draftContact, setDraftContact] = useState<ContactFormValues>({
    email: "",
    phone: "",
    website: "",
    lineId: "",
    facebook: "",
    instagram: "",
  });
  const [opportunityOpen, setOpportunityOpen] = useState(false);


  useEffect(() => {
    if (!authLoading && !user) navigate("/auth?redirect=/portfolio");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user?.id) return;
    void qc.invalidateQueries({ queryKey: ["community-posts-by-author", user.id] });
  }, [user?.id, qc]);

  useEffect(() => {
    if (!profile) return;
    const drill = new URLSearchParams(window.location.search).get("drill");
    if (drill !== "daily" && window.location.hash !== `#${PORTFOLIO_DRILL_HASH}`) return;
    const timer = window.setTimeout(() => {
      document.getElementById(PORTFOLIO_DRILL_HASH)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [profile]);

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
  const sortedPublished = useMemo(
    () => sortProjectsForProfile(published, projectSort),
    [published, projectSort],
  );
  const visiblePortfolio = sortedPublished.slice(0, 6);
  const sortedPosts = useMemo(
    () => sortCommunityPostsForProfile(myPosts, postSort),
    [myPosts, postSort],
  );
  const visiblePosts = sortedPosts.slice(0, 6);
  const experience = parseExperience(profile?.experience);
  const skills = parseSkills(profile?.skills);

  const cancelEdit = useCallback(() => setEditKey(null), []);

  const startEdit = useCallback(
    (key: ProfileEditKey) => {
      if (!profile) return;
      if (key === "bio") setDraftBio(profile.bio ?? "");
      if (key === "experience") {
        setDraftExperience(experience.length ? experience.map((it) => ({ ...it })) : [{ title: "", company: "", period: "", description: "" }]);
      }
      if (key === "skills") setDraftSkills([...skills]);
      if (key === "contact") {
        setDraftContact({
          email: profile.email ?? user?.email ?? "",
          phone: profile.phone ?? "",
          website: profile.website ?? "",
          lineId: profile.line_id ?? "",
          facebook: profile.facebook ?? "",
          instagram: profile.instagram ?? "",
        });
      }
      setEditKey(key);
    },
    [profile, user?.email, experience, skills],
  );

  const saveSection = async () => {
    if (!editKey) return;
    try {
      if (editKey === "bio") {
        if (draftBio.trim().length > 500) {
          toast.error("แนะนำตัวยาวเกิน 500 ตัวอักษร");
          return;
        }
        await updateProfile.mutateAsync({ bio: draftBio.trim() });
      }
      if (editKey === "experience") {
        const cleaned = draftExperience
          .map((it) => ({
            title: it.title.trim(),
            company: (it.company ?? "").trim(),
            period: (it.period ?? "").trim(),
            description: (it.description ?? "").trim(),
          }))
          .filter((it) => it.title);
        for (const item of cleaned) {
          const parsed = experienceItemSchema.safeParse(item);
          if (!parsed.success) {
            toast.error(parsed.error.issues[0]?.message ?? "ข้อมูลประสบการณ์ไม่ถูกต้อง");
            return;
          }
        }
        await updateProfile.mutateAsync({ experience: cleaned });
      }
      if (editKey === "skills") {
        await updateProfile.mutateAsync({ skills: draftSkills });
      }
      if (editKey === "contact") {
        if (!draftContact.email.trim()) {
          toast.error("กรุณากรอกอีเมล");
          return;
        }
        await updateProfile.mutateAsync({
          email: draftContact.email.trim(),
          phone: draftContact.phone.trim(),
          website: draftContact.website.trim(),
          lineId: draftContact.lineId.trim(),
          facebook: draftContact.facebook.trim(),
          instagram: draftContact.instagram.trim(),
        });
      }
      toast.success("บันทึกแล้ว");
      setEditKey(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
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
          onOpportunityEdit={() => setOpportunityOpen(true)}
          onPost={() => navigate("/portfolio/new")}
          onPreview={() =>
            navigate(profileVisitorPreviewPath({ user_id: user!.id, username: profile.username }))
          }
          onManage={() => navigate("/portfolio/manage")}
          shareUrl={profilePublicUrl({ user_id: user!.id, username: profile.username })}
          shareTitle={profile.display_name || profile.username || "โปรไฟล์"}
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

          <ProfileWalletCard />

          <ProfileMenuCard opportunityOpen={opportunityOpen} onOpportunityOpenChange={setOpportunityOpen} />
        </aside>

        {/* RIGHT: Sections */}
        <main className="space-y-6 min-w-0">
          <OnboardingChecklist variant="full" />

          <Section id={PORTFOLIO_DRILL_HASH} icon={Target} title="Design Drill">
            <DesignDrillSection />
          </Section>

          {/* About — right after Design Drill */}
          <ProfileEditableSection
            icon={Sparkles}
            title="เกี่ยวกับฉัน"
            isEditing={editKey === "bio"}
            saving={updateProfile.isPending}
            onEdit={() => startEdit("bio")}
            onCancel={cancelEdit}
            onSave={saveSection}
            editContent={
              <div>
                <textarea
                  value={draftBio}
                  onChange={(e) => setDraftBio(e.target.value)}
                  rows={5}
                  maxLength={500}
                  placeholder="แนะนำตัวสั้น ๆ ให้ลูกค้ารู้จักคุณ"
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
                <p className="mt-1 text-xs text-muted-foreground">{draftBio.length}/500 ตัวอักษร</p>
              </div>
            }
          >
            {profile.bio ? (
              <p className="text-base text-foreground leading-7 whitespace-pre-wrap">{profile.bio}</p>
            ) : (
              <EmptyHint text="ยังไม่ได้แนะนำตัว" cta="เพิ่มประวัติย่อ" onClick={() => startEdit("bio")} />
            )}
          </ProfileEditableSection>

          <ProfileHiringRequestsSection />

          <CollabRequestsSection />

          {!isAplus1LaunchMinimal() ? (
          <Section
            id="my-posts"
            icon={MessageSquare}
            title="โพสต์ของฉัน"
            count={myPosts.length}
            action={
              myPosts.length > 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/portfolio/manage?tab=posts")}
                  className="rounded-full h-8"
                >
                  จัดการโพสต์
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/community/new")}
                  className="rounded-full h-8"
                >
                  สร้างโพสต์
                </Button>
              )
            }
          >
            {myPosts.length ? (
              <div className="space-y-4">
                <ContentSortChips value={postSort} onChange={setPostSort} />
                <div className="columns-2 md:columns-3 gap-2 sm:gap-3">
                  {visiblePosts.map((post) => (
                    <div key={post.id} className="break-inside-avoid mb-2 sm:mb-3">
                      <CommunityPostGridCard post={post} />
                    </div>
                  ))}
                </div>
                {myPosts.length > 6 && (
                  <Button
                    variant="outline"
                    onClick={() => navigate("/portfolio/manage?tab=posts")}
                    className="w-full rounded-full"
                  >
                    ดูโพสต์ทั้งหมด ({myPosts.length})
                  </Button>
                )}
              </div>
            ) : (
              <EmptyHint
                text="ยังไม่มีโพสต์ชุมชน — แชร์งาน ถามคำถาม หรือโพสต์ไปยัง Area"
                cta="สร้างโพสต์แรก"
                onClick={() => navigate("/community/new")}
              />
            )}
          </Section>
          ) : null}

          {!isAplus1LaunchMinimal() ? (
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
          ) : null}

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
                <ContentSortChips value={projectSort} onChange={setProjectSort} />
                <PortfolioGrid projects={visiblePortfolio} />
                {sortedPublished.length > 6 && (
                  <Button
                    variant="outline"
                    onClick={() => navigate("/portfolio/manage?tab=projects")}
                    className="w-full rounded-full"
                  >
                    ดูผลงานทั้งหมด ({sortedPublished.length})
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







          <ProfileEditableSection
            icon={BriefcaseIcon}
            title="ประสบการณ์ทำงาน"
            isEditing={editKey === "experience"}
            saving={updateProfile.isPending}
            onEdit={() => startEdit("experience")}
            onCancel={cancelEdit}
            onSave={saveSection}
            editContent={<ExperienceEditor value={draftExperience} onChange={setDraftExperience} />}
          >
            {experience.length ? (
              <ExperienceTimeline items={experience} />
            ) : (
              <EmptyHint text="ยังไม่ได้เพิ่มประวัติการทำงาน" cta="เพิ่มประสบการณ์" onClick={() => startEdit("experience")} />
            )}
          </ProfileEditableSection>

          {/* Skills */}
          <ProfileEditableSection
            icon={Sparkles}
            title="ความชำนาญ"
            count={skills.length}
            isEditing={editKey === "skills"}
            saving={updateProfile.isPending}
            onEdit={() => startEdit("skills")}
            onCancel={cancelEdit}
            onSave={saveSection}
            editContent={<SkillsEditor value={draftSkills} onChange={setDraftSkills} />}
          >
            <SkillsList skills={skills} />
          </ProfileEditableSection>

          {/* Contacts */}
          <ProfileEditableSection
            icon={Phone}
            title="ข้อมูลติดต่อ"
            isEditing={editKey === "contact"}
            saving={updateProfile.isPending}
            onEdit={() => startEdit("contact")}
            onCancel={cancelEdit}
            onSave={saveSection}
            editContent={
              <ContactEditor
                value={draftContact}
                onChange={(patch) => setDraftContact((c) => ({ ...c, ...patch }))}
              />
            }
          >
            <ContactCards
              email={profile.email}
              phone={profile.phone}
              website={profile.website}
              lineId={profile.line_id}
              facebook={profile.facebook}
              instagram={profile.instagram}
            />
          </ProfileEditableSection>
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
