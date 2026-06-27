import { useState } from "react";
import BriefcaseIcon from "../components/icons/BriefcaseIcon";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useStudioBySlug, useStudioMembers, useMyStudios } from "@/hooks/useStudios";
import { useStudioConversation } from "@/hooks/useChat";
import { useStudioJobs } from "@/hooks/useJobs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Building2, CheckCircle2, FileText, MapPin, Globe, Users } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import StudioFollowButton from "@/components/StudioFollowButton";
import { useStudioFollowState } from "@/hooks/useStudioFollow";
import { safeHttpUrl } from "@/lib/safeUrl";
import JobCard from "@/components/jobs/JobCard";
import { useAuth } from "@/hooks/useAuth";
import { requireAuth } from "@/lib/requireAuth";
import SeoHead from "@/components/SeoHead";
import { BRAND_NAME } from "@/lib/brandConfig";
import { truncateDescription } from "@/lib/seo";
import ReportTrigger from "@/components/report/ReportTrigger";
import { useSubscription } from "@/core/subscription/useSubscription";
import {
  canOpenStudioCombinedQuote,
  canShowStudioQuoteUpsell,
  openStudioQuotation,
} from "@/lib/studioQuotationHandoff";
import HireStudioDialog from "@/components/HireStudioDialog";
import {
  StudioClientPickerDialog,
  type StudioClientContext,
} from "@/components/studio/StudioClientPickerDialog";
import { StudioQuoteUpsellDialog } from "@/components/studio/StudioQuoteUpsellDialog";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const StudioProfilePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: studio, isLoading } = useStudioBySlug(slug);
  const { data: members = [] } = useStudioMembers(studio?.id);
  const { data: jobs = [] } = useStudioJobs(studio?.id);
  const { data: myStudios = [] } = useMyStudios();
  const studioChat = useStudioConversation();
  const { tier } = useSubscription();
  const isMember = myStudios.some((s) => s.id === studio?.id);
  const myMembership = members.find((m) => m.user_id === user?.id);
  const { followers: studioFollowers } = useStudioFollowState(studio?.id);
  const canCombinedQuote =
    isMember && canOpenStudioCombinedQuote(tier, myMembership?.role);
  const showQuoteUpsell =
    isMember && canShowStudioQuoteUpsell(tier, myMembership?.role);
  const [hireOpen, setHireOpen] = useState(false);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [upsellOpen, setUpsellOpen] = useState(false);

  const launchStudioQuote = async (ctx: StudioClientContext) => {
    if (!studio) return;
    try {
      await openStudioQuotation({
        tier,
        studio,
        members,
        source: "studio_profile",
        projectTitle: ctx.projectTitle ?? studio.name,
        clientName: ctx.clientName,
        clientEmail: ctx.clientEmail,
        clientPhone: ctx.clientPhone,
        onRequireInHouse: () => setUpsellOpen(true),
      });
    } catch {
      toast.error("เปิด So1o ไม่สำเร็จ");
    }
  };

  if (isLoading) return <div className="min-h-screen grid place-items-center text-muted-foreground">กำลังโหลด...</div>;
  if (!studio) return <div className="min-h-screen grid place-items-center text-muted-foreground">ไม่พบสตูดิโอ</div>;

  const websiteUrl = safeHttpUrl(studio.website);

  return (
    <div className="min-h-screen bg-app-ambient pb-24 lg:pb-12">
      <SeoHead
        title={studio.name}
        description={truncateDescription(studio.description || `สตูดิโอ ${studio.name} บน ${BRAND_NAME}`)}
        path={`/s/${slug}`}
        image={studio.cover_url ?? studio.avatar_url ?? undefined}
      />
      <div className="relative h-48 lg:h-64 bg-gradient-to-br from-primary/20 to-primary/5">
        {studio.cover_url && <img src={studio.cover_url} alt="" className="w-full h-full object-cover" />}
        <BackButton className="absolute top-4 left-4 bg-background/70 backdrop-blur" />
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-12 relative">
        <div className="glass-panel-strong rounded-2xl p-5 lg:p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
            <Avatar className="w-24 h-24 ring-4 ring-background">
              <AvatarImage src={studio.avatar_url} />
              <AvatarFallback className="bg-gradient-brand text-white text-2xl">
                <Building2 />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-medium tracking-tight thai-display">{studio.name}</h1>
                <Badge className="bg-primary/10 text-primary border-primary/30 hover:bg-primary/15">STUDIO</Badge>
                {studio.verified && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CheckCircle2 className="w-5 h-5 text-primary cursor-help" aria-label="Studio ยืนยันนิติบุคคลแล้ว" />
                      </TooltipTrigger>
                      <TooltipContent>Studio ยืนยันนิติบุคคลแล้ว — ออกใบกำกับ/สัญญาได้</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              {studio.tagline && <p className="text-sm text-muted-foreground mt-1 thai-body">{studio.tagline}</p>}
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {studio.member_count} สมาชิก</span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {studioFollowers} ผู้ติดตาม</span>
                {studio.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {studio.location}</span>}
                {websiteUrl && (
                  <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">
                    <Globe className="w-3.5 h-3.5" /> เว็บไซต์
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <StudioFollowButton studioId={studio.id} size="sm" />
              {canCombinedQuote && (
                <Button
                  variant="outline"
                  className="rounded-xl gap-1.5"
                  onClick={() =>
                    requireAuth(user, () => setClientPickerOpen(true))
                  }
                >
                  <FileText className="w-4 h-4" />
                  สร้างใบเสนอราคารวม
                </Button>
              )}
              {showQuoteUpsell && (
                <Button
                  variant="outline"
                  className="rounded-xl gap-1.5"
                  onClick={() => setUpsellOpen(true)}
                >
                  <FileText className="w-4 h-4" />
                  อัปเกรด In-House
                </Button>
              )}
              {isMember ? (
                <Button
                  onClick={() =>
                    requireAuth(user, async () => {
                      const convId = await studioChat.mutateAsync(studio.id);
                      navigate(`/chat/${convId}`);
                    })
                  }
                  className="rounded-xl bg-gradient-brand text-white border-0"
                >
                  แชททีม
                </Button>
              ) : (
                <Button
                  onClick={() => requireAuth(user, () => setHireOpen(true))}
                  className="rounded-xl bg-gradient-brand text-white border-0"
                >
                  จ้าง Studio
                </Button>
              )}
              <ReportTrigger
                targetType="studio"
                targetId={studio.id}
                targetOwnerId={studio.created_by}
              />
            </div>
          </div>
        </div>

        <Tabs defaultValue="projects" className="mt-6">
          <TabsList className="rounded-xl">
            <TabsTrigger value="projects" className="rounded-lg">ผลงาน</TabsTrigger>
            <TabsTrigger value="members" className="rounded-lg">สมาชิก ({members.length})</TabsTrigger>
            <TabsTrigger value="jobs" className="rounded-lg">ประกาศหาคน ({jobs.length})</TabsTrigger>
            <TabsTrigger value="about" className="rounded-lg">เกี่ยวกับ</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="mt-5">
            <div className="text-sm text-muted-foreground text-center py-10 glass-panel rounded-2xl">
              ยังไม่มีผลงานในนามสตูดิโอ
            </div>
          </TabsContent>

          <TabsContent value="members" className="mt-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {members.map((m) => (
                <Link
                  key={m.user_id}
                  to={`/u/${m.user_id}`}
                  className="glass-panel rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                    <AvatarFallback>{m.profile?.display_name?.[0] ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{m.profile?.display_name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {m.role === "owner" ? "ผู้ก่อตั้ง" : m.role === "admin" ? "แอดมิน" : "สมาชิก"}
                      {m.credit_title && ` · ${m.credit_title}`}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="jobs" className="mt-5">
            {jobs.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-10 glass-panel rounded-2xl">
                ยังไม่มีประกาศหา designer
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {jobs.map((j) => <JobCard key={j.id} job={j} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="about" className="mt-5">
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-base whitespace-pre-wrap leading-relaxed">{studio.bio || "ยังไม่มีรายละเอียด"}</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <HireStudioDialog
        open={hireOpen}
        onOpenChange={setHireOpen}
        studioId={studio.id}
        studioName={studio.name}
        studioVerified={studio.verified}
        projectTitle={studio.name}
      />
      <StudioClientPickerDialog
        open={clientPickerOpen}
        onOpenChange={setClientPickerOpen}
        defaultProjectTitle={studio.name}
        onConfirm={launchStudioQuote}
      />
      <StudioQuoteUpsellDialog
        open={upsellOpen}
        onOpenChange={setUpsellOpen}
        onUpgrade={() => navigate("/upgrade#tier-details")}
      />
    </div>
  );
};

export default StudioProfilePage;
