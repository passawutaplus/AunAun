import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Globe, Instagram, Facebook, MessageSquare, UserX, MessageCircle, Users } from "lucide-react";
import PageLoader from "@/components/ui/PageLoader";
import EmptyState from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import FollowButton from "@/components/FollowButton";
import SupportButton from "@/components/gifting/SupportButton";
import ReportTrigger from "@/components/report/ReportTrigger";
import HireDialog from "@/components/HireDialog";
import CollabDialog from "@/components/CollabDialog";
import BriefcaseIcon from "@/components/icons/BriefcaseIcon";

import { useFollowState } from "@/hooks/useFollow";
import { useAuth } from "@/hooks/useAuth";
import { usePublicCollections } from "@/hooks/useCollections";
import PortfolioGrid from "@/components/profile/PortfolioGrid";
import CollectionCard from "@/components/collections/CollectionCard";
import { safeHttpUrl } from "@/lib/safeUrl";
import { highlight } from "@/lib/highlight";
import { PROJECT_FEED_SELECT, PUBLIC_PROFILE_SELECT } from "@/lib/dbSelects";
import SeoHead from "@/components/SeoHead";
import { BRAND_NAME } from "@/lib/brandConfig";
import { truncateDescription } from "@/lib/seo";
import { isUuid, profilePublicPath } from "@/lib/profileRoutes";
import { sortPortfolioProjects } from "@/lib/portfolioSort";
import CommunityPostGridCard from "@/components/feed/CommunityPostGridCard";
import { useCommunityPostsByAuthor } from "@/hooks/useCommunityPosts";
import { Navigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";


const PublicProfilePage = () => {
  const { userId, vanityHandle } = useParams();
  const vanityRedirect = userId?.startsWith("@") && !vanityHandle ? `/${userId}` : null;
  const slug = userId ?? (vanityHandle?.startsWith("@") ? vanityHandle.slice(1) : "");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const { user } = useAuth();
  const [hireOpen, setHireOpen] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["public-profile", slug],
    enabled: !!slug && !vanityRedirect,
    queryFn: async () => {
      let query = supabase.from("profiles").select(PUBLIC_PROFILE_SELECT);
      if (isUuid(slug)) {
        query = query.eq("user_id", slug);
      } else {
        query = query.eq("username", slug.toLowerCase());
      }
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const resolvedUserId = profile?.user_id;
  const { followers, following } = useFollowState(resolvedUserId);
  const { data: collections = [] } = usePublicCollections(resolvedUserId);
  const { data: communityPosts = [] } = useCommunityPostsByAuthor(resolvedUserId);

  const { data: projects = [] } = useQuery({
    queryKey: ["public-projects", resolvedUserId],
    enabled: !!resolvedUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(PROJECT_FEED_SELECT)
        .eq("owner_id", resolvedUserId!)
        .eq("status", "Published")
        .order("is_pinned", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });

  const orderedProjects = useMemo(
    () => sortPortfolioProjects(projects as Parameters<typeof sortPortfolioProjects>[0]),
    [projects],
  );

  const totalLikes = useMemo(
    () => orderedProjects.reduce((sum, p) => sum + ((p as { likes?: number }).likes ?? 0), 0),
    [orderedProjects],
  );

  const topCategories = useMemo(() => {
    const counts = new Map<string, number>();
    orderedProjects.forEach((p) => {
      if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);
  }, [orderedProjects]);
  const drillProjects = useMemo(
    () =>
      orderedProjects.filter(
        (p) => Array.isArray(p.tags) && p.tags.includes("So1oDrill"),
      ),
    [orderedProjects],
  );
  const portfolioProjects = useMemo(
    () =>
      orderedProjects.filter(
        (p) => !Array.isArray(p.tags) || !p.tags.includes("So1oDrill"),
      ),
    [orderedProjects],
  );

  if (vanityRedirect) {
    return <Navigate to={vanityRedirect} replace />;
  }

  if (isLoading) {
    return <PageLoader label="กำลังโหลดโปรไฟล์..." />;
  }

  if (
    profile?.username &&
    userId &&
    isUuid(userId) &&
    !vanityHandle &&
    profile.user_id === userId
  ) {
    return <Navigate to={`/@${profile.username}`} replace />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <EmptyState
          icon={UserX}
          title="ไม่พบโปรไฟล์นี้"
          description="ลิงก์อาจหมดอายุ หรือผู้ใช้ปิดการแสดงผลแล้ว"
          action={
            <Button onClick={() => navigate("/")} className="rounded-full">
              กลับหน้าหลัก
            </Button>
          }
        />
      </div>
    );
  }

  const displayName = profile.display_name || profile.username || "ครีเอเตอร์";
  const isSelf = !!user?.id && user.id === resolvedUserId;
  const profileFaq =
    ((profile as { profile_faq?: { question: string; answer: string }[] }).profile_faq) ?? [];
  const seoDesc = truncateDescription(
    profile.bio || `ดูพอร์ตโฟลิโอและผลงานของ ${displayName} บน ${BRAND_NAME}`,
  );

  const statItems = [
    { label: "ผลงาน", value: projects.length },
    { label: "ยอดดูรวม", value: projects.reduce((s: number, p: { views?: number }) => s + (p.views ?? 0), 0) },
    { label: "ถูกใจรวม", value: totalLikes },
    { label: "ผู้ติดตาม", value: followers, href: `/u/${resolvedUserId}/followers` },
    { label: "กำลังติดตาม", value: following, href: `/u/${resolvedUserId}/followers?tab=following` },
  ];

  return (
    <div className={cn("min-h-screen bg-app-ambient thai-body font-normal", MOBILE_PAGE_BOTTOM_CLASS)}>
      <SeoHead
        title={displayName}
        description={seoDesc}
        path={profilePublicPath(profile)}
        image={profile.avatar_url ?? undefined}
        type="profile"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: displayName,
          description: profile.bio || undefined,
          image: profile.avatar_url || undefined,
          url: typeof window !== "undefined" ? window.location.href : undefined,
        }}
      />
      <div className="sticky top-0 z-20 glass-panel border-x-0 border-t-0 rounded-none">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> กลับ
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl glass-panel p-4 sm:p-6 md:p-10">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-brand opacity-40 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-gradient-brand-soft blur-3xl pointer-events-none" />

          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 z-10 hidden md:flex flex-col items-end gap-2">
            <FollowButton freelancerId={resolvedUserId} />
            <SupportButton
              recipientId={resolvedUserId}
              recipientName={profile.display_name ?? "ครีเอเตอร์"}
              recipientAvatar={profile.avatar_url ?? undefined}
              variant="compact"
            />
          </div>

          <div className="relative flex flex-row items-start gap-3.5 sm:gap-6 pr-0 md:pr-36">
            <div className="shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-[4.5rem] h-[4.5rem] sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full object-cover border-[3px] sm:border-4 border-white/70 shadow-lg"
                />
              ) : (
                <div className="w-[4.5rem] h-[4.5rem] sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full bg-gradient-brand flex items-center justify-center text-2xl sm:text-3xl font-medium text-white border-[3px] sm:border-4 border-white/70 shadow-lg">
                  {profile.display_name?.[0] ?? "?"}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl md:text-3xl font-semibold text-foreground leading-snug tracking-normal">
                {highlight(profile.display_name, q)}
              </h1>
              {profile.username && (
                <p className="text-sm text-muted-foreground mt-0.5">@{profile.username}</p>
              )}
              {profile.role && (
                <Badge className="mt-2 rounded-full glass-chip text-foreground border-0 text-xs font-normal">
                  {highlight(profile.role, q)}
                </Badge>
              )}
              {(profile as { open_for_work?: boolean; open_for_work_badge?: string }).open_for_work && (
                <Badge className="mt-2 ml-1 rounded-full bg-primary/15 text-primary border-0 text-xs font-normal">
                  {(profile as { open_for_work_badge?: string }).open_for_work_badge || "Open for Work"}
                </Badge>
              )}
              {profile.bio && (
                <p className="text-sm text-foreground/85 mt-2 sm:mt-3 max-w-xl leading-relaxed">
                  {highlight(profile.bio, q)}
                </p>
              )}

              {(profile.skills?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 sm:mt-3">
                  {profile.skills!.map((s: string) => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-normal">
                      {highlight(s, q)}
                    </span>
                  ))}
                </div>
              )}

              {topCategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {topCategories.map((c) => (
                    <span key={c} className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground font-normal">
                      {c}
                    </span>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-3 sm:mt-4 sm:flex sm:flex-wrap sm:gap-3">
                {statItems.map((s) => {
                  const chip = (
                    <div className="glass-chip rounded-xl sm:rounded-2xl px-2 py-2 sm:px-4 sm:py-2 w-full text-center sm:text-left">
                      <div className="font-semibold text-foreground leading-tight text-base tabular-nums">{s.value}</div>
                      <div className="text-xs text-muted-foreground leading-tight mt-0.5">{s.label}</div>
                    </div>
                  );
                  if (s.href) {
                    return (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => navigate(s.href!)}
                        className="text-left hover:border-primary/30 transition-colors rounded-xl sm:rounded-2xl"
                      >
                        {chip}
                      </button>
                    );
                  }
                  return <div key={s.label}>{chip}</div>;
                })}
              </div>

              {!isSelf && (
                <div className="flex flex-col gap-2 mt-3 sm:mt-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      onClick={() => setHireOpen(true)}
                      className="w-full rounded-full bg-gradient-brand text-white hover:opacity-90 h-10 text-sm font-medium gap-1.5"
                    >
                      <BriefcaseIcon className="w-4 h-4 shrink-0" />
                      ชวนมาทำงาน
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCollabOpen(true)}
                      className="w-full rounded-full glass-panel h-10 text-sm font-medium gap-1.5"
                    >
                      <Users className="w-4 h-4 shrink-0" />
                      คอลแลป
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:hidden">
                    <FollowButton
                      freelancerId={resolvedUserId}
                      showFollowerCount={false}
                      className="w-full h-10 text-sm font-medium"
                    />
                    <SupportButton
                      recipientId={resolvedUserId}
                      recipientName={profile.display_name ?? "ครีเอเตอร์"}
                      recipientAvatar={profile.avatar_url ?? undefined}
                      variant="compact"
                      hideSubtext
                      className="w-full items-center"
                    />
                  </div>
                </div>
              )}

              {(profile.website || profile.instagram || profile.facebook || profile.line_id) && (
                <div className="flex items-center gap-3 mt-3 sm:mt-4 text-muted-foreground flex-wrap">
                  {safeHttpUrl(profile.website) && (
                    <a href={safeHttpUrl(profile.website)} target="_blank" rel="noopener noreferrer" className="hover:text-primary"><Globe className="w-4 h-4" /></a>
                  )}
                  {profile.instagram && (
                    <a href={`https://instagram.com/${encodeURIComponent(profile.instagram)}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary"><Instagram className="w-4 h-4" /></a>
                  )}
                  {safeHttpUrl(profile.facebook) && (
                    <a href={safeHttpUrl(profile.facebook)} target="_blank" rel="noopener noreferrer" className="hover:text-primary"><Facebook className="w-4 h-4" /></a>
                  )}
                  {profile.line_id && (
                    <span className="flex items-center gap-1 text-xs"><MessageSquare className="w-4 h-4" /> {profile.line_id}</span>
                  )}
                </div>
              )}

              <div className="mt-3">
                <ReportTrigger
                  targetType="user"
                  targetId={resolvedUserId!}
                  targetOwnerId={resolvedUserId!}
                  variant="text"
                />
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 pb-16">
        <Tabs defaultValue="works" className="mt-4 sm:mt-6">
          <div className="px-3 sm:px-4">
            <TabsList className="glass-chip rounded-2xl sm:rounded-full p-1.5 h-auto gap-1 flex flex-col w-full sm:inline-flex sm:flex-row sm:flex-nowrap sm:w-max">
              <div className="grid grid-cols-2 gap-1 w-full sm:contents">
                <TabsTrigger value="works" className="rounded-full text-sm px-2.5 sm:px-4 py-2 font-normal data-[state=active]:bg-gradient-brand data-[state=active]:text-white data-[state=active]:font-medium">
                  ผลงาน ({portfolioProjects.length})
                </TabsTrigger>
                <TabsTrigger value="posts" className="rounded-full text-sm px-2.5 sm:px-4 py-2 font-normal data-[state=active]:bg-gradient-brand data-[state=active]:text-white data-[state=active]:font-medium">
                  Area ({communityPosts.length})
                </TabsTrigger>
              </div>
              <div className="grid grid-cols-3 gap-1 w-full sm:contents">
                <TabsTrigger value="drill" className="rounded-full text-sm px-2 sm:px-4 py-2 font-normal data-[state=active]:bg-gradient-brand data-[state=active]:text-white data-[state=active]:font-medium">
                  <span className="sm:hidden">Drill ({drillProjects.length})</span>
                  <span className="hidden sm:inline">Design Drill ({drillProjects.length})</span>
                </TabsTrigger>
                <TabsTrigger value="collections" className="rounded-full text-sm px-2 sm:px-4 py-2 font-normal data-[state=active]:bg-gradient-brand data-[state=active]:text-white data-[state=active]:font-medium">
                  <span className="sm:hidden">คอลฯ ({collections.length})</span>
                  <span className="hidden sm:inline">คอลเลกชัน ({collections.length})</span>
                </TabsTrigger>
                <TabsTrigger value="about" className="rounded-full text-sm px-2.5 sm:px-4 py-2 font-normal data-[state=active]:bg-gradient-brand data-[state=active]:text-white data-[state=active]:font-medium">
                  เกี่ยวกับ
                </TabsTrigger>
              </div>
            </TabsList>
          </div>

          <TabsContent value="works" className="mt-6">
            {portfolioProjects.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground glass-panel rounded-2xl">ยังไม่มีผลงานที่เผยแพร่</div>
            ) : (
              <PortfolioGrid projects={portfolioProjects as any} />
            )}
          </TabsContent>

          <TabsContent value="posts" className="mt-6">
            {communityPosts.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground glass-panel rounded-2xl flex flex-col items-center gap-2">
                <MessageCircle className="w-8 h-8 opacity-50" />
                ยังไม่มีโพสต์ใน Area
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3">
                {communityPosts.map((post) => (
                  <CommunityPostGridCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="drill" className="mt-6">
            {drillProjects.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground glass-panel rounded-2xl">ยังไม่มีผลงาน Design Drill</div>
            ) : (
              <PortfolioGrid projects={drillProjects as Parameters<typeof PortfolioGrid>[0]["projects"]} />
            )}
          </TabsContent>

          <TabsContent value="collections" className="mt-6">
            {collections.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground glass-panel rounded-2xl">ยังไม่มีคอลเลกชันสาธารณะ</div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
                {collections.map((c) => (
                  <CollectionCard key={c.id} collection={c} compact />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="about" className="mt-6 space-y-6">
            <div className="rounded-2xl glass-panel p-6 space-y-3">
              <h3 className="font-medium text-foreground">เกี่ยวกับ {profile.display_name}</h3>
              <p className="text-sm text-foreground/80 leading-7 whitespace-pre-wrap">
                {profile.bio || "ยังไม่มีข้อมูลแนะนำตัว"}
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium text-foreground px-1">ถาม-ตอบ</h3>
              {profileFaq.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground glass-panel rounded-2xl">ยังไม่มีคำถาม-ตอบ</div>
              ) : (
                profileFaq.map((item, i) => (
                  <div key={i} className="rounded-2xl glass-panel p-5 space-y-2">
                    <p className="font-medium text-foreground">{item.question}</p>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">{item.answer}</p>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <HireDialog
        open={hireOpen}
        onOpenChange={setHireOpen}
        projectTitle={displayName}
        freelancerId={resolvedUserId}
      />
      <CollabDialog
        open={collabOpen}
        onOpenChange={setCollabOpen}
        recipientId={resolvedUserId!}
        recipientName={displayName}
      />
    </div>
  );
};


export default PublicProfilePage;
