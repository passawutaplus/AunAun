import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { WorkItemDrawer } from "@/components/WorkItemDrawer";
import { HubViewProvider } from "@/contexts/HubViewContext";
import { WorkItemDrawerProvider } from "@/contexts/WorkItemDrawerContext";
import { useHubAlertWatcher } from "@/hooks/useHubAlertWatcher";
import { useHubAuth } from "@/auth/AuthProvider";

function HubLayoutInner() {
  const { user } = useHubAuth();
  useHubAlertWatcher(!!user);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
      <WorkItemDrawer />
    </div>
  );
}

export default function HubLayout() {
  return (
    <HubViewProvider>
      <WorkItemDrawerProvider>
        <HubLayoutInner />
      </WorkItemDrawerProvider>
    </HubViewProvider>
  );
}
