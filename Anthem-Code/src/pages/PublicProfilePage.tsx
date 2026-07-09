import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect, useCallback } from "react";
import { Globe, Instagram, Facebook, MessageSquare, UserX, MessageCircle, Handshake, Eye, X } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import PageLoader from "@/components/ui/PageLoader";
import EmptyState from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProfileSectionTabs } from "@/components/profile/ProfileSectionTabs";
import { supabase } from "@/integrations/supabase/client";
import FollowButton from "@/components/FollowButton";
import SupportButton from "@/components/gifting/SupportButton";
import ReportTrigger from "@/components/report/ReportTrigger";
import HireDialog from "@/components/HireDialog";
import OpportunityTypeChips from "@/components/opportunity/OpportunityTypeChips";
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
import { navigateToAuth, stripSearchParams } from "@/lib/authRedirect";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";
import { toast } from "sonner";

const PREVIEW_TOAST = "นี่คือมุมมองผู้เยี่ยมชม — ปุ่มนี้ใช้งานได้จริงเมื่อคนอื่นเปิดโปรไฟล์ของคุณ";


const PublicProfilePage = () => {
  const { userId, vanityHandle } = useParams();
  const vanityRedirect = userId?.startsWith("@") && !vanityHandle ? `/${userId}` : null;
  const slug = userId ?? (vanityHandle?.startsWith("@") ? vanityHandle.slice(1) : "");
  const navigate = useNavigate();
  const [params, setSearchParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const { user } = useAuth();
  const [hireOpen, setHireOpen] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("works");

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

  const isSelf = !!user?.id && !!resolvedUserId && user.id === resolvedUserId;
  const visitorPreview = isSelf && params.get("preview") === "1";
  const showAsVisitor = !isSelf || visitorPreview;

  const previewToast = useCallback(() => {
    toast.message(PREVIEW_TOAST);
  }, []);

  const exitPreview = useCallback(() => {
    const next = stripSearchParams(params, ["preview"]);
    const q = next.toString();
    setSearchParams(q ? next : {}, { replace: true });
    navigate("/portfolio");
  }, [navigate, params, setSearchParams]);

  useEffect(() => {
    if (!user || params.get("hire") !== "1" || !resolvedUserId || isSelf) return;
    setHireOpen(true);
    const next = stripSearchParams(params, ["hire"]);
    const q = next.toString();
    setSearchParams(q ? next : {}, { replace: true });
  }, [user, params, setSearchParams, resolvedUserId, isSelf]);

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
    const q = params.toString();
    return <Navigate to={`/@${profile.username}${q ? `?${q}` : ""}`} replace />;
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

  const openHire = () => {
    if (visitorPreview) {
      previewToast();
      return;
    }
    if (!user) {
      navigateToAuth(navigate, { hire: "1" });
      return;
    }
    setHireOpen(true);
  };
  const openCollab = () => {
    if (visitorPreview) {
      previewToast();
      return;
    }
    setCollabOpen(true);
  };
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
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2">
          <BackButton to={visitorPreview ? "/portfolio" : undefined} />
          {visitorPreview && (
            <div className="flex-1 min-w-0 flex items-center justify-between gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs text-foreground min-w-0">
                <Eye className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">มุมมองผู้เยี่ยมชม (พรีวิว)</span>
              </span>
              <button
                type="button"
                onClick={exitPreview}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
              >
                <X className="w-3 h-3" /> ปิด
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl glass-panel p-4 sm:p-6 md:p-10">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-brand opacity-40 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-gradient-brand-soft blur-3xl pointer-events-none" />

          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 z-10 hidden md:flex flex-col items-end gap-2">
            {showAsVisitor && (
              <>
                <FollowButton freelancerId={resolvedUserId} visitorPreview={visitorPreview} />
                <SupportButton
                  recipientId={resolvedUserId}
                  recipientName={profile.display_name ?? "ครีเอเตอร์"}
                  recipientAvatar={profile.avatar_url ?? undefined}
                  variant="compact"
                  visitorPreview={visitorPreview}
                />
              </>
            )}
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
              <OpportunityTypeChips
                className="mt-2"
                status={(profile as { opportunity_status?: string }).opportunity_status}
                types={(profile as { opportunity_types?: string[] }).opportunity_types}
              />
              {(profile as { open_for_work?: boolean; open_for_work_badge?: string }).open_for_work && (
                <Badge className="mt-2 ml-1 rounded-full bg-primary/15 text-primary border-0 text-xs font-normal">
                  {(profile as { open_for_work_badge?: string }).open_for_work_badge || "Open for Work"}
                </Badge>
              )}
              {profile.bio && (
                <p className="text-base text-foreground mt-2 sm:mt-3 max-w-xl leading-relaxed">
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

              {showAsVisitor && (
                <div className="flex flex-col gap-2 mt-3 sm:mt-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      onClick={openHire}
                      className="w-full rounded-full bg-gradient-brand text-white hover:opacity-90 h-10 text-sm font-medium gap-1.5"
                    >
                      <BriefcaseIcon className="w-4 h-4 shrink-0" />
                      ชวนมาทำงาน
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={openCollab}
                      className="w-full rounded-full glass-panel h-10 text-sm font-medium gap-1.5"
                    >
                      <Handshake className="w-4 h-4 shrink-0" />
                      คอลแลป
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:hidden">
                    <FollowButton
                      freelancerId={resolvedUserId}
                      showFollowerCount={false}
                      className="w-full h-10 text-sm font-medium"
                      visitorPreview={visitorPreview}
                    />
                    <SupportButton
                      recipientId={resolvedUserId}
                      recipientName={profile.display_name ?? "ครีเอเตอร์"}
                      recipientAvatar={profile.avatar_url ?? undefined}
                      variant="compact"
                      hideSubtext
                      className="w-full items-center"
                      visitorPreview={visitorPreview}
                    />
                  </div>
                </div>
              )}

              {isSelf && !visitorPreview && (
                <div className="mt-3 sm:mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      const next = new URLSearchParams(params);
                      next.set("preview", "1");
                      setSearchParams(next, { replace: true });
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1.5" /> ดูมุมมองผู้เยี่ยมชม
                  </Button>
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

              {!isSelf && (
                <div className="mt-3">
                  <ReportTrigger
                    targetType="user"
                    targetId={resolvedUserId!}
                    targetOwnerId={resolvedUserId!}
                    variant="text"
                  />
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 pb-16">
        <ProfileSectionTabs
          className="mt-4 sm:mt-6"
          value={activeTab}
          onValueChange={setActiveTab}
          tabs={[
            { value: "works", label: `ผลงาน (${portfolioProjects.length})` },
            { value: "posts", label: `Area (${communityPosts.length})` },
            {
              value: "drill",
              label: (
                <>
                  <span className="sm:hidden">Drill ({drillProjects.length})</span>
                  <span className="hidden sm:inline">Design Drill ({drillProjects.length})</span>
                </>
              ),
            },
            {
              value: "collections",
              label: (
                <>
                  <span className="sm:hidden">คอลฯ ({collections.length})</span>
                  <span className="hidden sm:inline">คอลเลกชัน ({collections.length})</span>
                </>
              ),
            },
            { value: "about", label: "เกี่ยวกับ" },
          ]}
        >
          {activeTab === "works" &&
            (portfolioProjects.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground glass-panel rounded-2xl">ยังไม่มีผลงานที่เผยแพร่</div>
            ) : (
              <PortfolioGrid projects={portfolioProjects as any} />
            ))}

          {activeTab === "posts" &&
            (communityPosts.length === 0 ? (
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
            ))}

          {activeTab === "drill" &&
            (drillProjects.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground glass-panel rounded-2xl">ยังไม่มีผลงาน Design Drill</div>
            ) : (
              <PortfolioGrid projects={drillProjects as Parameters<typeof PortfolioGrid>[0]["projects"]} />
            ))}

          {activeTab === "collections" &&
            (collections.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground glass-panel rounded-2xl">ยังไม่มีคอลเลกชันสาธารณะ</div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
                {collections.map((c) => (
                  <CollectionCard key={c.id} collection={c} compact />
                ))}
              </div>
            ))}

          {activeTab === "about" && (
            <div className="space-y-6">
              <div className="rounded-2xl glass-panel p-6 space-y-3">
                <h3 className="font-medium text-foreground">เกี่ยวกับ {profile.display_name}</h3>
                <p className="text-base text-foreground leading-7 whitespace-pre-wrap">
                  {profile.bio || "ยังไม่มีข้อมูลแนะนำตัว"}
                </p>
              </div>
            </div>
          )}
        </ProfileSectionTabs>
      </div>

      <HireDialog
        open={hireOpen}
        onOpenChange={setHireOpen}
        projectTitle={displayName}
        freelancerId={resolvedUserId}
        source="profile"
        profileName={displayName}
      />
      <CollabDialog
        open={collabOpen}
        onOpenChange={setCollabOpen}
        recipientId={resolvedUserId!}
        recipientName={displayName}
        source="profile"
      />
    </div>
  );
};


export default PublicProfilePage;
