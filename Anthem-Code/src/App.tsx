import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/useAuth";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import ErrorPage from "./pages/ErrorPage.tsx";
import AuthCallbackPage from "./pages/AuthCallbackPage.tsx";
import CookieConsent from "./components/CookieConsent.tsx";
import FloatingNav from "./components/FloatingNav.tsx";
import RequireAuth from "./components/RequireAuth.tsx";
import AuthDialog from "./components/AuthDialog.tsx";
import { InterestSurveyGate } from "./components/onboarding/InterestSurveyDialog.tsx";
import RedirectTo from "./components/RedirectTo.tsx";
import VanityProfileRoute from "./components/profile/VanityProfileRoute.tsx";
import RouteFallback from "./components/RouteFallback.tsx";
import DemoModeBanner from "./components/DemoModeBanner.tsx";
import AvatarPoolBootstrap from "./components/AvatarPoolBootstrap.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { ReferralAttribution } from "./components/referral/ReferralAttribution.tsx";
import { ScrollToTop } from "./components/ScrollToTop.tsx";

// Code-split routes — only the home feed stays in the main chunk.
const AuthPage = lazy(() => import("./pages/AuthPage.tsx"));
const PortfolioProfilePage = lazy(() => import("./pages/PortfolioProfilePage.tsx"));
const PortfolioManagePage = lazy(() => import("./pages/PortfolioManagePage.tsx"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage.tsx"));
const SettingsPage = lazy(() => import("./pages/SettingsPage.tsx"));
const ProjectEditorPage = lazy(() => import("./pages/ProjectEditorPage.tsx"));
const PublicProfilePage = lazy(() => import("./pages/PublicProfilePage.tsx"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage.tsx"));
const ChatInboxPage = lazy(() => import("./pages/ChatInboxPage.tsx"));
const CollectionsPage = lazy(() => import("./pages/CollectionsPage.tsx"));
const CollectionDetailPage = lazy(() => import("./pages/CollectionDetailPage.tsx"));
const JobsPage = lazy(() => import("./pages/JobsPage.tsx"));
const JobDetailPage = lazy(() => import("./pages/JobDetailPage.tsx"));
const StudioProfilePage = lazy(() => import("./pages/StudioProfilePage.tsx"));
const StudioCreatePage = lazy(() => import("./pages/StudioCreatePage.tsx"));
const StudioInvitesPage = lazy(() => import("./pages/StudioInvitesPage.tsx"));
const StudioManagePage = lazy(() => import("./pages/StudioManagePage.tsx"));
const SimilarImagesPage = lazy(() => import("./pages/SimilarImagesPage.tsx"));
const InspireBoardDetailPage = lazy(() => import("./pages/InspireBoardDetailPage.tsx"));
const MyReportsPage = lazy(() => import("./pages/MyReportsPage.tsx"));
const MyFeedbackPage = lazy(() => import("./pages/MyFeedbackPage.tsx"));
const VerificationPage = lazy(() => import("./pages/VerificationPage.tsx"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const OverviewPage = lazy(() => import("./pages/admin/OverviewPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminStudiosPage = lazy(() => import("./pages/admin/AdminStudiosPage"));
const AdminProjectsPage = lazy(() => import("./pages/admin/AdminProjectsPage"));
const AdminJobsPage = lazy(() => import("./pages/admin/AdminJobsPage"));
const AdminHiringPage = lazy(() => import("./pages/admin/AdminHiringPage"));
const AdminCollabsPage = lazy(() => import("./pages/admin/AdminCollabsPage"));
const AdminChatsPage = lazy(() => import("./pages/admin/AdminChatsPage"));
const AdminCommentsPage = lazy(() => import("./pages/admin/AdminCommentsPage"));
const AdminCollectionsPage = lazy(() => import("./pages/admin/AdminCollectionsPage"));
const AdminGiftsPage = lazy(() => import("./pages/admin/AdminGiftsPage"));
const AdminNotificationsPage = lazy(() => import("./pages/admin/AdminNotificationsPage"));
const AdminStoragePage = lazy(() => import("./pages/admin/AdminStoragePage"));
const AdminAuditPage = lazy(() => import("./pages/admin/AdminAuditPage"));
const AdminActivityPage = lazy(() => import("./pages/admin/AdminActivityPage"));
const AdminContractsPage = lazy(() => import("./pages/admin/AdminContractsPage"));
const AdminWalletPage = lazy(() => import("./pages/admin/AdminWalletPage"));
const AdminApplicationsPage = lazy(() => import("./pages/admin/AdminApplicationsPage"));
const AdminAnalyticsPage = lazy(() => import("./pages/admin/AdminAnalyticsPage"));
const AdminSystemPage = lazy(() => import("./pages/admin/AdminSystemPage"));
const AdminAdsPage = lazy(() => import("./pages/admin/AdminAdsPage"));
const AdminReportsPage = lazy(() => import("./pages/admin/AdminReportsPage"));
const AdminFeedbackPage = lazy(() => import("./pages/admin/AdminFeedbackPage"));
const AdminAmlPage = lazy(() => import("./pages/admin/AdminAmlPage"));
const AdminKycPage = lazy(() => import("./pages/admin/AdminKycPage"));
const AdminInspirePage = lazy(() => import("./pages/admin/AdminInspirePage"));
const AdminAiMonitorPage = lazy(() => import("./pages/admin/AdminAiMonitorPage"));
const AdminDevTasksPage = lazy(() => import("./pages/admin/AdminDevTasksPage"));
const AdminKuyRadarPage = lazy(() => import("./pages/admin/AdminKuyRadarPage"));
const KuyOverviewPage = lazy(() => import("./components/admin/kuy-radar/KuyOverviewPage"));
const KuyBusinessSetup = lazy(() => import("./components/admin/kuy-radar/KuyBusinessSetup"));
const KuyLeadTable = lazy(() => import("./components/admin/kuy-radar/KuyLeadTable"));
const KuyCompetitorTable = lazy(() => import("./components/admin/kuy-radar/KuyCompetitorTable"));
const KuyContentTable = lazy(() => import("./components/admin/kuy-radar/KuyContentTable"));
const KuyInsightPanel = lazy(() => import("./components/admin/kuy-radar/KuyInsightPanel"));
const KuyAdsPlanner = lazy(() => import("./components/admin/kuy-radar/KuyAdsPlanner"));
const KuyOfferBuilder = lazy(() => import("./components/admin/kuy-radar/KuyOfferBuilder"));
const KuyContentPlanner = lazy(() => import("./components/admin/kuy-radar/KuyContentPlanner"));
const KuyOutreachPanel = lazy(() => import("./components/admin/kuy-radar/KuyOutreachPanel"));
const KuyReportsPanel = lazy(() => import("./components/admin/kuy-radar/KuyReportsPanel"));
const KuySettingsPanel = lazy(() => import("./components/admin/kuy-radar/KuySettingsPanel"));
const KuyManualPage = lazy(() => import("./components/admin/kuy-radar/KuyManualPage"));
const PrivacyPage = lazy(() => import("./pages/legal/PrivacyPage.tsx"));
const TermsPage = lazy(() => import("./pages/legal/TermsPage.tsx"));
const CookiesPage = lazy(() => import("./pages/legal/CookiesPage.tsx"));
const DataRightsPage = lazy(() => import("./pages/legal/DataRightsPage.tsx"));
const IntellectualPropertyPage = lazy(() => import("./pages/legal/IntellectualPropertyPage.tsx"));
const CommunityGuidelinesPage = lazy(() => import("./pages/legal/CommunityGuidelinesPage.tsx"));
const CommunityPostDetailPage = lazy(() => import("./pages/CommunityPostDetailPage.tsx"));
const CommunityPostEditorPage = lazy(() => import("./pages/CommunityPostEditorPage.tsx"));
const CommunityFeedPage = lazy(() => import("./pages/CommunityFeedPage.tsx"));
const AdminCommunityPage = lazy(() => import("./pages/admin/AdminCommunityPage"));
const AdminModerationPage = lazy(() => import("./pages/admin/AdminModerationPage"));
const ExploreProjectsPage = lazy(() => import("./pages/ExploreProjectsPage.tsx"));
const EarningsPage = lazy(() => import("./pages/EarningsPage.tsx"));
const ResearchPage = lazy(() => import("./pages/ResearchPage.tsx"));
const UxResearchFeedbackPage = lazy(() => import("./pages/UxResearchFeedbackPage.tsx"));
const AdvertisePage = lazy(() => import("./pages/AdvertisePage.tsx"));
const UpgradePage = lazy(() => import("./pages/UpgradePage.tsx"));
const AdDetailPage = lazy(() => import("./pages/AdDetailPage.tsx"));
const ContractEditorPage = lazy(() => import("./pages/ContractEditorPage.tsx"));
const ContractsListPage = lazy(() => import("./pages/ContractsListPage.tsx"));
const DrillGalleryPage = lazy(() => import("./pages/DrillGalleryPage.tsx"));
const SavedPostsPage = lazy(() => import("./pages/SavedPostsPage.tsx"));
const ReferralPage = lazy(() => import("./pages/ReferralPage.tsx"));
const FollowConnectionsPage = lazy(() => import("./pages/FollowConnectionsPage.tsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <ErrorBoundary>
          <DemoModeBanner />
          <AvatarPoolBootstrap />
          <ReferralAttribution />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/research" element={<ResearchPage />} />
              <Route path="/research/feedback" element={<UxResearchFeedbackPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/portfolio" element={<RequireAuth><PortfolioProfilePage /></RequireAuth>} />
              <Route path="/portfolio/saved" element={<RequireAuth><SavedPostsPage /></RequireAuth>} />
              <Route path="/portfolio/manage" element={<RequireAuth><PortfolioManagePage /></RequireAuth>} />
              <Route path="/portfolio/followers" element={<RequireAuth><FollowConnectionsPage /></RequireAuth>} />
              <Route path="/hire-requests" element={<RequireAuth><RedirectTo to="/portfolio?focus=hiring" /></RequireAuth>} />
              <Route path="/collab-requests" element={<RequireAuth><RedirectTo to="/portfolio?focus=collab" /></RequireAuth>} />
              <Route path="/portfolio/new" element={<RequireAuth><ProjectEditorPage /></RequireAuth>} />
              <Route path="/portfolio/:id/edit" element={<RequireAuth><ProjectEditorPage /></RequireAuth>} />
              <Route path="/project/:id" element={<ProjectDetailPage />} />
              <Route path="/drill" element={<DrillGalleryPage />} />
              <Route path="/explore/:kind/:value" element={<ExploreProjectsPage />} />
              <Route path="/similar/:projectId" element={<SimilarImagesPage />} />
              <Route path="/inspire/:boardId" element={<InspireBoardDetailPage />} />
              <Route path="/u/:userId" element={<PublicProfilePage />} />
              <Route path="/u/:userId/followers" element={<FollowConnectionsPage />} />
              <Route path="/earnings" element={<RequireAuth><EarningsPage /></RequireAuth>} />
              <Route path="/referrals" element={<RequireAuth><ReferralPage /></RequireAuth>} />

              <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
              <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
              <Route path="/chat/:id?" element={<RequireAuth><ChatInboxPage /></RequireAuth>} />
              <Route path="/community/new" element={<RequireAuth><CommunityPostEditorPage /></RequireAuth>} />
              <Route path="/community/:id/edit" element={<RequireAuth><CommunityPostEditorPage /></RequireAuth>} />
              <Route path="/community" element={<CommunityFeedPage />} />
              <Route path="/community/:id" element={<CommunityPostDetailPage />} />
              <Route path="/collections" element={<RequireAuth><CollectionsPage /></RequireAuth>} />
              <Route path="/collections/:id" element={<RequireAuth><CollectionDetailPage /></RequireAuth>} />
              <Route path="/me/reports" element={<RequireAuth><MyReportsPage /></RequireAuth>} />
              <Route path="/me/feedback" element={<RequireAuth><MyFeedbackPage /></RequireAuth>} />
              <Route path="/reports" element={<RedirectTo to="/me/reports" />} />
              <Route path="/feedback" element={<RedirectTo to="/me/feedback" />} />
              <Route path="/verify" element={<RequireAuth><VerificationPage /></RequireAuth>} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<OverviewPage />} />
                <Route path="dev-tasks" element={<AdminDevTasksPage />} />
                <Route path="kuy-radar" element={<AdminKuyRadarPage />}>
                  <Route index element={<KuyOverviewPage />} />
                  <Route path="setup" element={<KuyBusinessSetup />} />
                  <Route path="leads" element={<KuyLeadTable />} />
                  <Route path="competitors" element={<KuyCompetitorTable />} />
                  <Route path="content" element={<KuyContentTable />} />
                  <Route path="insights" element={<KuyInsightPanel />} />
                  <Route path="ads" element={<KuyAdsPlanner />} />
                  <Route path="offers" element={<KuyOfferBuilder />} />
                  <Route path="planner" element={<KuyContentPlanner />} />
                  <Route path="outreach" element={<KuyOutreachPanel />} />
                  <Route path="reports" element={<KuyReportsPanel />} />
                  <Route path="settings" element={<KuySettingsPanel />} />
                  <Route path="manual" element={<KuyManualPage />} />
                </Route>
                <Route path="activity" element={<AdminActivityPage />} />
                <Route path="analytics" element={<AdminAnalyticsPage />} />
                <Route path="contracts" element={<AdminContractsPage />} />
                <Route path="wallet" element={<AdminWalletPage />} />
                <Route path="applications" element={<AdminApplicationsPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="studios" element={<AdminStudiosPage />} />
                <Route path="projects" element={<AdminProjectsPage />} />
                <Route path="jobs" element={<AdminJobsPage />} />
                <Route path="hiring" element={<AdminHiringPage />} />
                <Route path="collabs" element={<AdminCollabsPage />} />
                <Route path="chats" element={<AdminChatsPage />} />
                <Route path="comments" element={<AdminCommentsPage />} />
                <Route path="collections" element={<AdminCollectionsPage />} />
                <Route path="inspire" element={<AdminInspirePage />} />
                <Route path="gifts" element={<AdminGiftsPage />} />
                <Route path="aml" element={<AdminAmlPage />} />
                <Route path="kyc" element={<AdminKycPage />} />
                <Route path="ads" element={<AdminAdsPage />} />
                <Route path="notifications" element={<AdminNotificationsPage />} />
                <Route path="storage" element={<AdminStoragePage />} />
                <Route path="audit" element={<AdminAuditPage />} />
                <Route path="reports" element={<AdminReportsPage />} />
                <Route path="community" element={<AdminCommunityPage />} />
                <Route path="moderation" element={<AdminModerationPage />} />
                <Route path="feedback" element={<AdminFeedbackPage />} />
                <Route path="system" element={<AdminSystemPage />} />
                <Route path="ai" element={<AdminAiMonitorPage />} />
              </Route>
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/advertise" element={<AdvertisePage />} />
              <Route path="/upgrade" element={<UpgradePage />} />
              <Route path="/ads/:id" element={<AdDetailPage />} />
              <Route path="/jobs/:id" element={<JobDetailPage />} />
              <Route path="/contracts" element={<ContractsListPage />} />
              <Route path="/contracts/new" element={<ContractEditorPage />} />
              <Route path="/s/:slug" element={<StudioProfilePage />} />
              <Route path="/studio/new" element={<StudioCreatePage />} />
              <Route path="/studio/invites" element={<StudioInvitesPage />} />
              <Route path="/studio/manage" element={<StudioManagePage />} />
              <Route path="/legal/privacy" element={<PrivacyPage />} />
              <Route path="/legal/terms" element={<TermsPage />} />
              <Route path="/legal/cookies" element={<CookiesPage />} />
              <Route path="/legal/rights" element={<DataRightsPage />} />
              <Route path="/legal/ip" element={<IntellectualPropertyPage />} />
              <Route path="/legal/community" element={<CommunityGuidelinesPage />} />
              <Route path="/error" element={<ErrorPage />} />
              <Route path="/error/404" element={<ErrorPage defaultKind="404" />} />
              <Route path="/error/405" element={<ErrorPage defaultKind="405" />} />
              <Route path="/error/500" element={<ErrorPage defaultKind="500" />} />
              <Route path="/error/503" element={<ErrorPage defaultKind="503" />} />
              {/*
                react-router v6 cannot match `/@:username` (literal @ before param).
                Vanity URLs use `/:vanityHandle` with a leading @ — see VanityProfileRoute.
              */}
              <Route path="/:vanityHandle" element={<VanityProfileRoute />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <CookieConsent />
          <FloatingNav />
          <AuthDialog />
          <InterestSurveyGate />
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
