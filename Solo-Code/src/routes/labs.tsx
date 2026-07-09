import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RouteError } from "@/components/RouteError";
import { RequireAuth } from "@/auth/RequireAuth";
import { LabsWorkbenchLayout } from "@/components/dashboard/labs/workbench/LabsWorkbenchLayout";

export const Route = createFileRoute("/labs")({
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: LabsLayout,
});

function LabsLayout() {
  return (
    <RequireAuth>
      <LabsWorkbenchLayout>
        <Outlet />
      </LabsWorkbenchLayout>
    </RequireAuth>
  );
}
