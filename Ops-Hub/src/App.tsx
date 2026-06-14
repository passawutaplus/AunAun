import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useHubAuth } from "@/auth/AuthProvider";
import { RequireAdmin } from "@/components/RequireAdmin";
import { AuthLoading } from "@/components/AuthLoading";
import HubLayout from "@/layouts/HubLayout";
import DashboardPage from "@/pages/DashboardPage";
import InboxPage from "@/pages/InboxPage";
import BoardPage from "@/pages/BoardPage";
import IssuesPage from "@/pages/IssuesPage";
import WorkPage from "@/pages/WorkPage";
import CyclesPage from "@/pages/CyclesPage";
import RoadmapPage from "@/pages/RoadmapPage";
import ActivityPage from "@/pages/ActivityPage";
import TrackingPage from "@/pages/TrackingPage";
import MonitorPage from "@/pages/MonitorPage";
import LoginPage from "@/pages/LoginPage";
import ConnectionsPage from "@/pages/ConnectionsPage";
import UsersPage from "@/pages/UsersPage";
import UserDetailPage from "@/pages/UserDetailPage";
import RadarPage from "@/pages/RadarPage";

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 20_000 } },
});

function LoginRoute() {
  const { user, isAdmin, loading } = useHubAuth();
  if (loading) return <AuthLoading />;
  if (user && isAdmin) return <Navigate to="/inbox" replace />;
  return <LoginPage />;
}

function ProtectedHub() {
  return (
    <RequireAdmin>
      <HubLayout />
    </RequireAdmin>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route element={<ProtectedHub />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/inbox" element={<InboxPage />} />
              <Route path="/board" element={<BoardPage />} />
              <Route path="/issues" element={<IssuesPage />} />
              <Route path="/work" element={<WorkPage />} />
              <Route path="/cycles" element={<CyclesPage />} />
              <Route path="/roadmap" element={<RoadmapPage />} />
              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/tracking" element={<TrackingPage />} />
              <Route path="/monitor" element={<MonitorPage />} />
              <Route path="/connections" element={<ConnectionsPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/users/:userId" element={<UserDetailPage />} />
              <Route path="/radar" element={<RadarPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/inbox" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
